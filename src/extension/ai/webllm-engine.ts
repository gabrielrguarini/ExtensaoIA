import type { MLCEngineInterface, ModelRecord } from '@mlc-ai/web-llm';
import type { AIEngine, GenerateOptions, InitializeOptions } from './ai-engine';
import { MODEL_CHOICES } from './model-catalog';
import type { ModelChoice } from './model-catalog';

export class ModelEnvironmentError extends Error {
  constructor(
    readonly code:
      'WEBGPU_UNAVAILABLE' | 'INSUFFICIENT_RESOURCES' | 'MODEL_DOWNLOAD' | 'UNAVAILABLE',
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
      appConfig: { model_list: [modelRecord(choice)], cacheBackend: 'cache' },
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
      await runtime.resetChat();
      const stream = await runtime.chat.completions.create({
        messages: [{ role: 'user', content: text }],
        stream: true,
        max_tokens: 24,
        temperature: 0,
      });
      for await (const chunk of stream) {
        if (options.signal?.aborted) throw options.signal.reason;
        const fragment = chunk.choices[0]?.delta.content;
        if (fragment) yield fragment;
      }
    } finally {
      options.signal?.removeEventListener('abort', abort);
      await runtime.resetChat().catch(() => undefined);
    }
  }

  async unload(): Promise<void> {
    const runtime = this.runtime;
    this.runtime = undefined;
    this.choice = undefined;
    if (runtime) await runtime.unload();
  }

  selectedVariant(): ModelChoice['variant'] | undefined {
    return this.choice?.variant;
  }
}
