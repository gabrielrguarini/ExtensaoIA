import type { MLCEngineInterface, ModelRecord } from '@mlc-ai/web-llm';
import type { Tokenizer } from '@mlc-ai/web-tokenizers';
import type { AIEngine, GenerateOptions, InitializeOptions } from './ai-engine';
import { MODEL_CHOICES } from './model-catalog';
import type { ModelChoice } from './model-catalog';
import { actionMessages, systemPromptFor } from './correction-prompt';
import { correctionTokenBudget, parseLlamaTemplate } from './token-budget';
import type { LlamaTemplate } from './token-budget';
import { requireCompleteGeneration } from './correction-output';

export class ModelEnvironmentError extends Error {
  constructor(
    readonly code:
      | 'WEBGPU_UNAVAILABLE'
      | 'INSUFFICIENT_RESOURCES'
      | 'MODEL_DOWNLOAD'
      | 'CONTEXT_LIMIT'
      | 'UNAVAILABLE',
  ) {
    super(code);
  }
}

export async function selectModel(gpu: GPU | undefined): Promise<ModelChoice> {
  if (!gpu) throw new ModelEnvironmentError('WEBGPU_UNAVAILABLE');
  let adapter: GPUAdapter | null;
  try {
    adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
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
  return adapter.features.has('shader-f16') ? MODEL_CHOICES.q4f16_1 : MODEL_CHOICES.q4f32_1;
}

function modelRecord(choice: ModelChoice): ModelRecord {
  return {
    model: choice.url,
    model_id: choice.id,
    model_lib: new URL(choice.library, import.meta.url).href,
    vram_required_MB: choice.gpuMemoryEstimateMB,
    low_resource_required: true,
    overrides: { context_window_size: 4096 },
  };
}

export class WebLLMEngine implements AIEngine {
  private runtime: MLCEngineInterface | undefined;
  private choice: ModelChoice | undefined;
  private loading: Promise<void> | undefined;
  private tokenizer: Tokenizer | undefined;
  private template: LlamaTemplate | undefined;

  isReady(): boolean {
    return !!this.runtime;
  }

  async initialize(options: InitializeOptions = {}): Promise<void> {
    if (options.signal?.aborted) throw options.signal.reason;
    if (this.runtime) {
      options.onProgress?.('ready', 100);
      return;
    }
    if (this.loading) return this.loading;
    this.loading = this.load(options).finally(() => {
      this.loading = undefined;
    });
    return this.loading;
  }

  private async load(options: InitializeOptions): Promise<void> {
    options.onProgress?.('preparing', 0);
    const choice = await selectModel((navigator as Navigator & { gpu?: GPU }).gpu);
    this.choice = choice;
    if (options.signal?.aborted) throw options.signal.reason;
    // O import dinâmico produz um chunk local do Worker; nenhuma API WebLLM vaza para outros contextos.
    const { MLCEngine } = await import('@mlc-ai/web-llm');
    const runtime = new MLCEngine({
      appConfig: { model_list: [modelRecord(choice)] },
      initProgressCallback: (report) => {
        const percent = Math.max(0, Math.min(100, Math.floor(report.progress * 100)));
        const phase = /loading model|loading gpu|finish loading/i.test(report.text)
          ? 'loading'
          : 'downloading';
        options.onProgress?.(phase, percent);
      },
      logLevel: 'ERROR',
    });
    const abort = () => {
      void runtime.unload().catch(() => undefined);
    };
    options.signal?.addEventListener('abort', abort, { once: true });
    try {
      options.onProgress?.('downloading', 0);
      await runtime.reload(choice.id, { context_window_size: 4096 });
      if (options.signal?.aborted) throw options.signal.reason;
      this.runtime = runtime;
      options.onProgress?.('ready', 100);
    } catch (error) {
      await runtime.unload().catch(() => undefined);
      if (options.signal?.aborted) throw options.signal.reason;
      const message = String(error);
      if (/out of memory|oom|device lost|allocation|storage buffer/i.test(message))
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
    try {
      const action = options.task && options.task !== 'proof' ? options.task : undefined;
      let maxTokens = 24;
      if (action) {
        const { tokenizer, template } = await this.correctionTokens();
        const budget = correctionTokenBudget(
          (value) => tokenizer.encode(value),
          template,
          systemPromptFor(action),
          text,
        );
        if (!budget) throw new ModelEnvironmentError('CONTEXT_LIMIT');
        maxTokens = budget.outputTokens;
      }
      if (options.signal?.aborted) throw options.signal.reason;
      if (action) {
        const stream = await runtime.chat.completions.create({
          messages: actionMessages(action, text),
          stream: true,
          max_tokens: maxTokens,
          temperature: 0,
        });
        let finishReason: string | null = null;
        for await (const chunk of stream) {
          finishReason = chunk.choices[0]?.finish_reason ?? finishReason;
          const fragment = chunk.choices[0]?.delta.content;
          // O runtime libera seu lock somente ao consumir o último chunk.
          // Após interruptGenerate, drenar sem exibir até o encerramento.
          if (fragment && !options.signal?.aborted) yield fragment;
        }
        if (options.signal?.aborted) throw options.signal.reason;
        requireCompleteGeneration(finishReason);
      } else {
        const stream = await runtime.chat.completions.create({
          messages: [{ role: 'user', content: text }],
          stream: true,
          max_tokens: maxTokens,
          temperature: 0,
        });
        for await (const chunk of stream) {
          const fragment = chunk.choices[0]?.delta.content;
          if (fragment && !options.signal?.aborted) yield fragment;
        }
        if (options.signal?.aborted) throw options.signal.reason;
      }
    } finally {
      options.signal?.removeEventListener('abort', abort);
      try {
        await runtime.resetChat();
      } catch {
        await this.unload().catch(() => undefined);
      }
    }
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

  private async correctionTokens(): Promise<{ tokenizer: Tokenizer; template: LlamaTemplate }> {
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
    const template = parseLlamaTemplate(await configResponse.json());
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
