import type { MLCEngineInterface, ModelRecord } from '@mlc-ai/web-llm';
import type { Tokenizer } from '@mlc-ai/web-tokenizers';
import type { AIEngine, GenerateOptions, InitializeOptions } from './ai-engine';
import { MODEL_CHOICES } from './model-catalog';
import { MODEL_LIBRARIES } from './model-libraries';
import { cacheModelArtifacts, inspectModelArtifacts } from './model-cache';
import type { ModelChoice, ModelProfile } from './model-catalog';
import { actionMessages, systemPromptFor } from './correction-prompt';
import {
  correctionTokenBudget,
  parseLlamaTemplate,
  parseQwenTemplate,
  semanticTokenBudget,
} from './token-budget';
import type { PromptTemplate } from './token-budget';
import { requireCompleteGeneration } from './correction-output';
import { SEMANTIC_SYSTEM_PROMPT, semanticMessages } from './semantic-review';
import { isWritingAction } from '../../shared/actions';
import { gpuAdapterOptions } from '../../shared/webgpu-adapter';

export class ModelEnvironmentError extends Error {
  constructor(
    readonly code:
      | 'WEBGPU_UNAVAILABLE'
      | 'INSUFFICIENT_RESOURCES'
      | 'MODEL_DOWNLOAD'
      | 'DOWNLOAD_REQUIRED'
      | 'CONTEXT_LIMIT'
      | 'UNAVAILABLE',
  ) {
    super(code);
  }
}

export async function selectModel(
  gpu: GPU | undefined,
  profile: ModelProfile = 'economico',
): Promise<ModelChoice> {
  if (!gpu) throw new ModelEnvironmentError('WEBGPU_UNAVAILABLE');
  let adapter: GPUAdapter | null;
  try {
    adapter = await gpu.requestAdapter(gpuAdapterOptions(navigator.platform));
  } catch {
    throw new ModelEnvironmentError('WEBGPU_UNAVAILABLE');
  }
  if (!adapter) throw new ModelEnvironmentError('WEBGPU_UNAVAILABLE');
  const limits = adapter.limits;
  // O runtime precisa de um buffer suficientemente grande até na variante econômica.
  if (
    limits.maxStorageBufferBindingSize < 128 * 1024 * 1024 ||
    limits.maxBufferSize < 256 * 1024 * 1024
  )
    throw new ModelEnvironmentError('INSUFFICIENT_RESOURCES');
  return adapter.features.has('shader-f16')
    ? MODEL_CHOICES[profile].q4f16_1
    : MODEL_CHOICES[profile].q4f32_1;
}

function modelRecord(choice: ModelChoice): ModelRecord {
  return {
    model: choice.url,
    model_id: choice.id,
    model_lib: new URL(MODEL_LIBRARIES[choice.profile][choice.variant], import.meta.url).href,
    vram_required_MB: choice.gpuMemoryEstimateMB,
    low_resource_required: choice.profile !== 'qualidade',
    required_features: choice.variant === 'q4f16_1' ? ['shader-f16'] : [],
    overrides: { context_window_size: choice.contextTokens },
  };
}

export class WebLLMEngine implements AIEngine {
  private runtime: MLCEngineInterface | undefined;
  private choice: ModelChoice | undefined;
  private loading: Promise<void> | undefined;
  private tokenizer: Tokenizer | undefined;
  private template: PromptTemplate | undefined;

  isReady(): boolean {
    return !!this.runtime;
  }

  async initialize(options: InitializeOptions = {}): Promise<void> {
    if (options.signal?.aborted) throw options.signal.reason;
    const profile = options.profile ?? 'economico';
    if (this.runtime && this.choice?.profile === profile) {
      options.onProgress?.('ready', 100);
      return;
    }
    if (this.loading) return this.loading;
    if (this.runtime) await this.unload();
    this.loading = this.load(options).finally(() => {
      this.loading = undefined;
    });
    return this.loading;
  }

  private async load(options: InitializeOptions): Promise<void> {
    options.onProgress?.('preparing', 0);
    const choice = await selectModel((navigator as Navigator & { gpu?: GPU }).gpu, options.profile);
    this.choice = choice;
    options.onProgress?.('preparing', 1);
    if (options.signal?.aborted) throw options.signal.reason;
    // O import dinâmico produz um chunk local do Worker; nenhuma API WebLLM vaza para outros contextos.
    const { MLCEngine } = await import('@mlc-ai/web-llm');
    const record = modelRecord(choice);
    if (!options.allowDownload) {
      if (!(await inspectModelArtifacts(choice, options.signal)))
        throw new ModelEnvironmentError('DOWNLOAD_REQUIRED');
    } else {
      try {
        options.onProgress?.('downloading', 0);
        await cacheModelArtifacts(choice, options.signal, (percent) =>
          options.onProgress?.('downloading', percent),
        );
      } catch {
        if (options.signal?.aborted) throw options.signal.reason;
        throw new ModelEnvironmentError('MODEL_DOWNLOAD');
      }
    }
    if (options.signal?.aborted) throw options.signal.reason;
    const runtime = new MLCEngine({
      appConfig: { model_list: [record] },
      initProgressCallback: (report) => {
        const percent = Math.max(0, Math.min(100, Math.floor(report.progress * 100)));
        // Os dados já foram conferidos ou preparados no cache antes do reload.
        options.onProgress?.('loading', percent);
      },
      logLevel: 'ERROR',
    });
    const abort = () => {
      void runtime.unload().catch(() => undefined);
    };
    options.signal?.addEventListener('abort', abort, { once: true });
    try {
      options.onProgress?.('loading', 0);
      await runtime.reload(choice.id, { context_window_size: choice.contextTokens });
      if (options.signal?.aborted) throw options.signal.reason;
      this.runtime = runtime;
      options.onProgress?.('ready', 100);
    } catch (error) {
      await runtime.unload().catch(() => undefined);
      this.choice = undefined;
      if (options.signal?.aborted) throw options.signal.reason;
      const message = String(error);
      if (
        /out of memory|oom|device lost|allocation|storage buffer|maxStorageBufferBindingSize|maxBufferSize|buffer.*(?:exceed|limit)/i.test(
          message,
        )
      )
        throw new ModelEnvironmentError('INSUFFICIENT_RESOURCES');
      if (/fetch|network|http|cache|download/i.test(message))
        throw new ModelEnvironmentError('MODEL_DOWNLOAD');
      throw new ModelEnvironmentError('UNAVAILABLE');
    } finally {
      options.signal?.removeEventListener('abort', abort);
    }
  }

  async *generate(text: string, options: GenerateOptions = {}): AsyncIterable<string> {
    const runtime = this.runtime;
    if (!runtime) throw new Error('Modelo não carregado.');
    if (options.signal?.aborted) throw options.signal.reason;
    const abort = () => {
      void runtime.interruptGenerate();
    };
    options.signal?.addEventListener('abort', abort, { once: true });
    let resetFailed = false;
    try {
      const qwenPrefix = '<think>\n\n</think>\n\n';
      let prefixPending = '';
      let prefixDone = this.choice?.profile === 'economico';
      let invalidThinking = false;
      const visibleFragment = (fragment: string): string => {
        if (invalidThinking) return '';
        if (prefixDone) return fragment;
        prefixPending += fragment;
        if (qwenPrefix.startsWith(prefixPending)) return '';
        if (prefixPending.startsWith(qwenPrefix)) {
          prefixDone = true;
          const visible = prefixPending.slice(qwenPrefix.length);
          prefixPending = '';
          return visible;
        }
        if (prefixPending.startsWith('<think>')) {
          invalidThinking = true;
          return '';
        }
        prefixDone = true;
        const visible = prefixPending;
        prefixPending = '';
        return visible;
      };
      const action = isWritingAction(options.task) ? options.task : undefined;
      const semantic = options.task === 'semantic-review';
      let maxTokens = 24;
      if (action || semantic) {
        const { tokenizer, template } = await this.correctionTokens();
        if (action) {
          const budget = correctionTokenBudget(
            (value) => tokenizer.encode(value),
            template,
            systemPromptFor(action),
            text,
          );
          if (!budget) throw new ModelEnvironmentError('CONTEXT_LIMIT');
          maxTokens = budget.outputTokens;
        } else {
          const budget = semanticTokenBudget(
            (value) => tokenizer.encode(value),
            template,
            SEMANTIC_SYSTEM_PROMPT,
            text,
          );
          if (!budget) throw new ModelEnvironmentError('CONTEXT_LIMIT');
          maxTokens = budget;
        }
      }
      if (options.signal?.aborted) throw options.signal.reason;
      if (action || semantic) {
        const stream = await runtime.chat.completions.create({
          messages: action ? actionMessages(action, text) : semanticMessages(text),
          stream: true,
          max_tokens: maxTokens,
          temperature: 0,
          ...(this.choice?.profile !== 'economico'
            ? { extra_body: { enable_thinking: false } }
            : {}),
        });
        let finishReason: string | null = null;
        for await (const chunk of stream) {
          finishReason = chunk.choices[0]?.finish_reason ?? finishReason;
          const fragment = chunk.choices[0]?.delta.content;
          // O runtime libera seu lock somente ao consumir o último chunk.
          // Após interruptGenerate, drenar sem exibir até o encerramento.
          if (fragment && !options.signal?.aborted) {
            const visible = visibleFragment(fragment);
            if (visible) yield visible;
          }
        }
        if (options.signal?.aborted) throw options.signal.reason;
        if (invalidThinking || (!prefixDone && prefixPending))
          throw new ModelEnvironmentError('UNAVAILABLE');
        requireCompleteGeneration(finishReason);
      } else {
        const stream = await runtime.chat.completions.create({
          messages: [{ role: 'user', content: text }],
          stream: true,
          max_tokens: maxTokens,
          temperature: 0,
          ...(this.choice?.profile !== 'economico'
            ? { extra_body: { enable_thinking: false } }
            : {}),
        });
        for await (const chunk of stream) {
          const fragment = chunk.choices[0]?.delta.content;
          if (fragment && !options.signal?.aborted) {
            const visible = visibleFragment(fragment);
            if (visible) yield visible;
          }
        }
        if (options.signal?.aborted) throw options.signal.reason;
        if (invalidThinking || (!prefixDone && prefixPending))
          throw new ModelEnvironmentError('UNAVAILABLE');
      }
    } finally {
      options.signal?.removeEventListener('abort', abort);
      try {
        await runtime.resetChat();
      } catch {
        await this.unload().catch(() => undefined);
        resetFailed = true;
      }
    }
    if (resetFailed && !options.signal?.aborted) throw new ModelEnvironmentError('UNAVAILABLE');
  }

  async unload(): Promise<void> {
    const runtime = this.runtime;
    this.runtime = undefined;
    this.choice = undefined;
    this.tokenizer?.dispose();
    this.tokenizer = undefined;
    this.template = undefined;
    if (runtime) await runtime.unload();
  }

  private async correctionTokens(): Promise<{ tokenizer: Tokenizer; template: PromptTemplate }> {
    if (this.tokenizer && this.template)
      return { tokenizer: this.tokenizer, template: this.template };
    const choice = this.choice;
    if (!choice) throw new ModelEnvironmentError('UNAVAILABLE');
    const modelCache = await caches.open('webllm/model');
    const configCache = await caches.open('webllm/config');
    const [tokenizerResponse, configResponse] = await Promise.all([
      modelCache.match(new URL('tokenizer.json', choice.url).href),
      configCache.match(new URL('mlc-chat-config.json', choice.url).href),
    ]);
    if (!tokenizerResponse || !configResponse) throw new ModelEnvironmentError('UNAVAILABLE');
    const config: unknown = await configResponse.json();
    const template =
      choice.profile === 'economico' ? parseLlamaTemplate(config) : parseQwenTemplate(config);
    const { Tokenizer } = await import('@mlc-ai/web-tokenizers');
    const tokenizer = await Tokenizer.fromJSON(await tokenizerResponse.arrayBuffer());
    this.tokenizer = tokenizer;
    this.template = template;
    return { tokenizer, template };
  }

  selectedVariant(): ModelChoice['variant'] | undefined {
    return this.choice?.variant;
  }
}
