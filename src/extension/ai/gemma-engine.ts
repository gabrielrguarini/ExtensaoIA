import type { PreTrainedModel, PreTrainedTokenizer } from '@huggingface/transformers';
import type { AIEngine, GenerateOptions, InitializeOptions } from './ai-engine';
import type {
  AvailabilityQuery,
  EngineAvailability,
  EngineCapabilities,
  EngineIdentity,
} from '../../shared/suggestion';
import type { GemmaVariant } from '../../shared/local-model';
import { WRITING_ACTIONS, isWritingAction } from '../../shared/actions';
import { gpuAdapterOptions } from '../../shared/webgpu-adapter';
import { GEMMA_MODEL } from './gemma-catalog';
import { GEMMA_CACHE, gemmaFiles, gemmaURL, prepareGemma } from './gemma-cache';
import { actionMessages } from './correction-prompt';
import { SEMANTIC_SYSTEM_PROMPT } from './semantic-review';
import { CorrectionOutputError } from './correction-output';
import { ModelEnvironmentError } from './model-error';

/** ONNX e Transformers.js vivem somente no Worker; nenhuma inferência remota. */
export class GemmaEngine implements AIEngine {
  private model: PreTrainedModel | undefined;
  private tokenizer: PreTrainedTokenizer | undefined;
  private variant: GemmaVariant | undefined;
  private busy = false;
  private epoch = 0;
  private interrupt: (() => void) | undefined;
  identity(): EngineIdentity {
    return {
      id: 'transformers',
      model: GEMMA_MODEL.id + ':' + (this.variant ?? 'q4'),
      runtime: GEMMA_MODEL.runtime,
      execution: 'webgpu',
    };
  }
  capabilities(): EngineCapabilities {
    return {
      actions: WRITING_ACTIONS.map(({ id }) => id),
      languages: ['pt-BR'],
      streaming: true,
      semanticReview: true,
      local: true,
    };
  }
  selectedVariant(): GemmaVariant | undefined {
    return this.variant;
  }
  isReady(): boolean {
    return !!this.model && !!this.tokenizer;
  }
  availability(query: AvailabilityQuery): Promise<EngineAvailability> {
    if (query.language !== 'pt-BR')
      return Promise.resolve({ state: 'unavailable', reason: 'language' });
    if (!isWritingAction(query.action) && query.action !== 'semantic-review')
      return Promise.resolve({ state: 'unavailable', reason: 'action' });
    if (this.isReady()) return Promise.resolve({ state: 'ready' });
    return Promise.resolve(
      navigator.gpu
        ? { state: 'requires-initialization' }
        : { state: 'unavailable', reason: 'hardware' },
    );
  }
  async initialize(options: InitializeOptions = {}): Promise<void> {
    if (this.busy) throw new Error('IA ocupada.');
    options.signal?.throwIfAborted();
    if (this.isReady()) {
      options.onProgress?.('ready', 100);
      return;
    }
    this.busy = true;
    const epoch = this.epoch;
    let model: PreTrainedModel | undefined;
    try {
      options.onProgress?.('preparing', 0);
      const adapter = await navigator.gpu?.requestAdapter(gpuAdapterOptions(navigator.platform));
      if (!adapter) throw new ModelEnvironmentError('WEBGPU_UNAVAILABLE');
      if (
        adapter.limits.maxBufferSize < 256 * 1024 * 1024 ||
        adapter.limits.maxStorageBufferBindingSize < 128 * 1024 * 1024
      )
        throw new ModelEnvironmentError('INSUFFICIENT_RESOURCES');
      this.variant = adapter.features.has('shader-f16') ? 'q4f16' : 'q4';
      options.onProgress?.('preparing', 0);
      await prepareGemma(this.variant, options.allowDownload === true, options.signal, (percent) =>
        options.onProgress?.(
          options.allowDownload ? 'downloading' : 'preparing',
          Math.floor(percent),
        ),
      );
      options.signal?.throwIfAborted();
      if (epoch !== this.epoch) throw new Error('Sessão encerrada.');
      const tf = await import('@huggingface/transformers');
      tf.env.logLevel = tf.LogLevel.NONE;
      tf.env.allowLocalModels = true;
      tf.env.allowRemoteModels = false;
      tf.env.useBrowserCache = false;
      tf.env.useFSCache = false;
      tf.env.useWasmCache = false;
      tf.env.useCustomCache = true;
      const urls = new Set(gemmaFiles(this.variant).map(gemmaURL));
      const cache = await caches.open(GEMMA_CACHE);
      tf.env.customCache = {
        // 4.2.0 probes tokenizer metadata at main even with a pinned revision.
        // Resolve that single read-only alias to the verified, pinned file; no network/duplicate.
        match: async (request) => {
          const metadataProbe =
            'https://huggingface.co/' + GEMMA_MODEL.id + '/resolve/main/tokenizer_config.json';
          if (request === metadataProbe) {
            const file = gemmaFiles(this.variant ?? 'q4').find(
              (file) => file.name === 'tokenizer_config.json',
            );
            return file ? cache.match(gemmaURL(file)) : undefined;
          }
          return urls.has(request) ? cache.match(request) : undefined;
        },
        put: () => Promise.reject(new Error('Cache exclusivo do preparador.')),
      };
      // Optional files never cause network requests. Only packaged executables may be fetched.
      tf.env.fetch = async (input: string | URL, init?: RequestInit): Promise<Response> => {
        const url = new URL(String(input), import.meta.url);
        const root = new URL(/* @vite-ignore */ '../runtime/', import.meta.url);
        if (url.origin !== root.origin || !url.href.startsWith(root.href))
          return new Response(null, { status: 404 });
        return fetch(url, init);
      };
      const backend = tf.env.backends.onnx;
      if (!backend.wasm || !backend.webgpu) throw new ModelEnvironmentError('UNAVAILABLE');
      backend.wasm.numThreads = 1;
      backend.wasm.proxy = false;
      backend.wasm.wasmPaths = {
        mjs: new URL('../runtime/' + 'ort-wasm-simd-threaded.asyncify.mjs', import.meta.url).href,
        wasm: new URL('../runtime/' + 'ort-wasm-simd-threaded.asyncify.wasm', import.meta.url).href,
      };
      backend.webgpu.adapter = adapter;
      options.onProgress?.('loading', 0);
      const tokenizer = await tf.AutoTokenizer.from_pretrained(GEMMA_MODEL.id, {
        revision: GEMMA_MODEL.revision,
        local_files_only: true,
      });
      model = await tf.Gemma4ForCausalLM.from_pretrained(GEMMA_MODEL.id, {
        revision: GEMMA_MODEL.revision,
        local_files_only: true,
        dtype: this.variant,
        device: 'webgpu',
        session_options: { executionProviders: ['webgpu'] },
      });
      options.signal?.throwIfAborted();
      if (epoch !== this.epoch) throw new Error('Sessão encerrada.');
      this.model = model;
      this.tokenizer = tokenizer;
      model = undefined;
      options.onProgress?.('ready', 100);
    } catch (error) {
      await model?.dispose();
      if (options.signal?.aborted) throw options.signal.reason;
      if (error instanceof ModelEnvironmentError) throw error;
      const message = String(error);
      throw new ModelEnvironmentError(
        message.includes('DOWNLOAD_REQUIRED')
          ? 'DOWNLOAD_REQUIRED'
          : /memory|allocation|buffer.*limit|device lost/i.test(message)
            ? 'INSUFFICIENT_RESOURCES'
            : message.includes('MODEL_DOWNLOAD')
              ? 'MODEL_DOWNLOAD'
              : 'UNAVAILABLE',
      );
    } finally {
      this.busy = false;
    }
  }
  async *generate(text: string, options: GenerateOptions = {}): AsyncIterable<string> {
    if (!this.model || !this.tokenizer || this.busy) throw new ModelEnvironmentError('UNAVAILABLE');
    if (options.inputFormat === 'legacy-protected') throw new ModelEnvironmentError('UNAVAILABLE');
    this.busy = true;
    let cleanup = () => {};
    try {
      const tf = await import('@huggingface/transformers');
      const model = this.model,
        tokenizer = this.tokenizer;
      const stopping = new tf.InterruptableStoppingCriteria();
      this.interrupt = () => stopping.interrupt();
      const cancel = () => stopping.interrupt();
      options.signal?.addEventListener('abort', cancel, { once: true });
      cleanup = () => {
        stopping.interrupt();
        options.signal?.removeEventListener('abort', cancel);
      };
      const messages = isWritingAction(options.task)
        ? actionMessages(options.task, text, options.writingOptions, options.inputFormat, 'raw')
        : [
            {
              role: 'system' as const,
              content:
                options.task === 'semantic-review'
                  ? SEMANTIC_SYSTEM_PROMPT
                  : 'Responda somente TESTE.',
            },
            { role: 'user' as const, content: text },
          ];
      // The runtime accepts Jinja kwargs; 4.2.0's type omits enable_thinking.
      const templateOptions = {
        tokenize: false as const,
        add_generation_prompt: true,
        enable_thinking: false,
      };
      const prompt = tokenizer.apply_chat_template(messages, templateOptions);
      const inputs = tokenizer(prompt, { add_special_tokens: false });
      const inputTokens = inputs.input_ids.dims.at(-1) ?? 0;
      const draftTokens = tokenizer.encode(text, { add_special_tokens: false }).length;
      const maxTokens =
        options.task === 'semantic-review'
          ? 320
          : options.task === 'proof'
            ? 32
            : Math.max(128, Math.min(2048, Math.ceil(draftTokens * 1.5) + 64));
      let generation: Promise<unknown> | undefined;
      let output: unknown;
      let reader: ReadableStreamDefaultReader<string> | undefined;
      let first = 0;
      let firstToken = 0;
      let tokens = 0;
      const start = performance.now();
      try {
        options.signal?.throwIfAborted();
        if (inputTokens + maxTokens > GEMMA_MODEL.contextTokens)
          throw new ModelEnvironmentError('CONTEXT_LIMIT');
        const stream = new ReadableStream<string>({
          start(controller) {
            const streamer = new tf.TextStreamer(tokenizer, {
              skip_prompt: true,
              skip_special_tokens: true,
              callback_function: (fragment) => {
                if (fragment) {
                  if (!first) first = performance.now() - start;
                  controller.enqueue(fragment);
                }
              },
              token_callback_function: (ids) => {
                if (!firstToken) firstToken = performance.now() - start;
                tokens += ids.length;
              },
            });
            const criteria = new tf.StoppingCriteriaList();
            criteria.push(stopping);
            generation = model.generate({
              ...inputs,
              max_new_tokens: maxTokens,
              do_sample: false,
              streamer,
              stopping_criteria: criteria,
            });
            void generation.then(
              (result) => {
                output = result;
                controller.close();
              },
              (error) => controller.error(error),
            );
          },
        });
        reader = stream.getReader();
        while (true) {
          options.signal?.throwIfAborted();
          const chunk = await reader.read();
          options.signal?.throwIfAborted();
          if (chunk.done) break;
          yield chunk.value;
        }
        await generation;
        if (!(output instanceof tf.Tensor)) throw new CorrectionOutputError('INVALID_OUTPUT');
        const data: unknown = output.data;
        if (!(data instanceof BigInt64Array) && !(data instanceof Int32Array))
          throw new CorrectionOutputError('INVALID_OUTPUT');
        const last = data.at(-1);
        if (last !== 1n && last !== 106n && last !== 1 && last !== 106)
          throw new CorrectionOutputError('TRUNCATED_OUTPUT');
        const total = performance.now() - start;
        options.onMetrics?.({
          promptTokens: inputTokens,
          completionTokens: tokens,
          maxTokens,
          runtimeFirstTokenMs: firstToken,
          runtimeFirstChunkMs: first,
          runtimeTotalMs: total,
          ...(tokens > 1 && total > firstToken
            ? { decodeTokensPerSecond: (tokens - 1) / ((total - firstToken) / 1000) }
            : {}),
        });
      } finally {
        stopping.interrupt();
        await generation?.catch(() => undefined);
        await reader?.cancel().catch(() => undefined);
        reader?.releaseLock();
        for (const tensor of Object.values(inputs)) tensor?.dispose();
        if (output instanceof tf.Tensor) output.dispose();
      }
    } finally {
      cleanup();
      this.interrupt = undefined;
      this.busy = false;
    }
  }
  async unload(): Promise<void> {
    this.epoch++;
    this.interrupt?.();
    const model = this.model;
    this.model = undefined;
    this.tokenizer = undefined;
    await model?.dispose();
  }
}
