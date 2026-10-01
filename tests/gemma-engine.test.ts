import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GemmaEngine } from '../src/extension/ai/gemma-engine';
import { GEMMA_MODEL } from '../src/extension/ai/gemma-catalog';
import type * as GemmaCache from '../src/extension/ai/gemma-cache';
const mock = vi.hoisted(() => {
  class Tensor {
    data = BigInt64Array.from([1n, 106n]);
    dims = [1, 10];
    dispose = vi.fn();
  }
  class TextStreamer {
    constructor(
      _tokenizer: unknown,
      readonly options: {
        callback_function: (s: string) => void;
        token_callback_function: (ids: bigint[]) => void;
      },
    ) {}
  }
  class InterruptableStoppingCriteria {
    interrupt = vi.fn();
  }
  class StoppingCriteriaList {
    push = vi.fn();
  }
  const template = vi.fn<(messages: unknown, options: unknown) => string>(() => 'prompt');
  const tokenize = Object.assign(
    vi.fn(() => ({ input_ids: new Tensor(), attention_mask: new Tensor() })),
    { apply_chat_template: template, encode: vi.fn(() => [1, 2, 3]) },
  );
  const generate = vi.fn((options: { streamer: TextStreamer }) => {
    options.streamer.options.token_callback_function([1n, 106n]);
    options.streamer.options.callback_function('Sugestão sintética.');
    return Promise.resolve(new Tensor());
  });
  const dispose = vi.fn(() => Promise.resolve());
  const load = vi.fn(() => Promise.resolve({ generate, dispose }));
  const match = vi.fn(() => Promise.resolve(new Response('abc')));
  const env = {
    logLevel: 0,
    allowLocalModels: false,
    allowRemoteModels: true,
    useBrowserCache: true,
    useFSCache: true,
    useCustomCache: false,
    useWasmCache: true,
    customCache: undefined as unknown,
    fetch: undefined as unknown,
    backends: { onnx: { wasm: {}, webgpu: {} } },
  };
  return {
    Tensor,
    TextStreamer,
    InterruptableStoppingCriteria,
    StoppingCriteriaList,
    tokenize,
    template,
    generate,
    dispose,
    load,
    match,
    env,
    prepare: vi.fn(() => Promise.resolve()),
  };
});
vi.mock('@huggingface/transformers', () => ({
  ...mock,
  AutoTokenizer: { from_pretrained: () => Promise.resolve(mock.tokenize) },
  Gemma4ForCausalLM: { from_pretrained: mock.load },
  LogLevel: { NONE: 50 },
}));
vi.mock('../src/extension/ai/gemma-cache', async (importOriginal) => ({
  ...(await importOriginal<typeof GemmaCache>()),
  prepareGemma: mock.prepare,
}));
beforeEach(() => {
  vi.clearAllMocks();
  mock.template.mockImplementation(() => 'prompt');
  mock.tokenize.mockImplementation(() => ({
    input_ids: new mock.Tensor(),
    attention_mask: new mock.Tensor(),
  }));
  mock.generate.mockImplementation((options) => {
    options.streamer.options.callback_function('Sugestão sintética.');
    options.streamer.options.token_callback_function([1n, 106n]);
    return Promise.resolve(new mock.Tensor());
  });
  vi.stubGlobal('navigator', {
    platform: 'Win32',
    gpu: {
      requestAdapter: () =>
        Promise.resolve({
          features: new Set(['shader-f16']),
          limits: { maxBufferSize: 2 ** 31, maxStorageBufferBindingSize: 2 ** 30 },
        }),
    },
  });
  vi.stubGlobal('caches', { open: () => Promise.resolve({ match: mock.match }) });
});
afterEach(() => vi.unstubAllGlobals());
async function result(engine: GemmaEngine, signal?: AbortSignal) {
  let text = '';
  for await (const fragment of engine.generate('Rascunho.', {
    task: 'corrigir',
    ...(signal ? { signal } : {}),
  }))
    text += fragment;
  return text;
}
describe('guardas de execução Transformers.js (runtime simulado no teste unitário)', () => {
  it('carrega só modelo textual WebGPU fixado, retém pesos e desativa caches concorrentes', async () => {
    const engine = new GemmaEngine();
    await engine.initialize();
    await engine.initialize();
    expect(mock.load).toHaveBeenCalledOnce();
    expect(mock.load).toHaveBeenCalledWith(
      GEMMA_MODEL.id,
      expect.objectContaining({
        revision: GEMMA_MODEL.revision,
        device: 'webgpu',
        dtype: 'q4f16',
        local_files_only: true,
      }),
    );
    expect(mock.env).toMatchObject({
      allowRemoteModels: false,
      useFSCache: false,
      useBrowserCache: false,
      useWasmCache: false,
    });
    expect(await result(engine)).toBe('Sugestão sintética.');
    expect(await result(engine)).toBe('Sugestão sintética.');
    expect(mock.load).toHaveBeenCalledOnce();
    expect(mock.template.mock.calls[0]?.[1]).toMatchObject({ enable_thinking: false });
    await engine.unload();
    expect(engine.isReady()).toBe(false);
    expect(mock.dispose).toHaveBeenCalledOnce();
  });
  it('consulta de main para metadados resolve somente o tokenizer da revisão verificada', async () => {
    const engine = new GemmaEngine();
    await engine.initialize();
    const cache = mock.env.customCache as { match: (url: string) => Promise<unknown> };
    await cache.match(
      'https://huggingface.co/' + GEMMA_MODEL.id + '/resolve/main/tokenizer_config.json',
    );
    expect(mock.match).toHaveBeenLastCalledWith(
      'https://huggingface.co/' +
        GEMMA_MODEL.id +
        '/resolve/' +
        GEMMA_MODEL.revision +
        '/tokenizer_config.json',
    );
    expect(
      await cache.match('https://huggingface.co/' + GEMMA_MODEL.id + '/resolve/main/config.json'),
    ).toBeUndefined();
    const guardedFetch = mock.env.fetch as (url: string) => Promise<Response>;
    expect((await guardedFetch('https://example.com/remote.js')).status).toBe(404);
  });
  it('erro de template libera a ocupação e o próximo pedido continua utilizável', async () => {
    const engine = new GemmaEngine();
    await engine.initialize();
    mock.template.mockImplementationOnce(() => {
      throw new Error('Template inválido.');
    });
    await expect(result(engine)).rejects.toThrow('Template inválido.');
    expect(await result(engine)).toBe('Sugestão sintética.');
  });
  it('cancelamento anterior ao pedido nunca inicia geração', async () => {
    const engine = new GemmaEngine();
    await engine.initialize();
    const abort = new AbortController();
    abort.abort();
    await expect(result(engine, abort.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(mock.generate).not.toHaveBeenCalled();
    expect(await result(engine)).toBe('Sugestão sintética.');
  });
  it('limite de contexto impede inferência, não corta silenciosamente o rascunho', async () => {
    const engine = new GemmaEngine();
    await engine.initialize();
    mock.tokenize.mockImplementationOnce(() => {
      const tensor = new mock.Tensor();
      tensor.dims = [1, 4096];
      return { input_ids: tensor, attention_mask: new mock.Tensor() };
    });
    await expect(result(engine)).rejects.toMatchObject({ code: 'CONTEXT_LIMIT' });
    expect(mock.generate).not.toHaveBeenCalled();
  });
  it('não aceita output truncado como resposta final', async () => {
    const engine = new GemmaEngine();
    await engine.initialize();
    mock.generate.mockImplementationOnce(() => {
      const tensor = new mock.Tensor();
      tensor.data = BigInt64Array.from([42n]);
      return Promise.resolve(tensor);
    });
    await expect(result(engine)).rejects.toMatchObject({ code: 'TRUNCATED_OUTPUT' });
  });
  it('ausência de WebGPU é reportada antes de preparar arquivos', async () => {
    vi.stubGlobal('navigator', {});
    const engine = new GemmaEngine();
    await expect(engine.initialize()).rejects.toMatchObject({ code: 'WEBGPU_UNAVAILABLE' });
    expect(mock.prepare).not.toHaveBeenCalled();
  });
  it('adaptador sem shader-f16 seleciona q4 e continua exigindo WebGPU', async () => {
    vi.stubGlobal('navigator', {
      platform: 'Win32',
      gpu: {
        requestAdapter: () =>
          Promise.resolve({
            features: new Set(),
            limits: { maxBufferSize: 2 ** 31, maxStorageBufferBindingSize: 2 ** 30 },
          }),
      },
    });
    const engine = new GemmaEngine();
    await engine.initialize();
    expect(mock.load).toHaveBeenCalledWith(
      GEMMA_MODEL.id,
      expect.objectContaining({ dtype: 'q4', device: 'webgpu' }),
    );
  });
  it('informa a variante detectada antes de pedir autorização de download', async () => {
    const engine = new GemmaEngine();
    const progress: unknown[] = [];
    mock.prepare.mockRejectedValueOnce(new Error('DOWNLOAD_REQUIRED'));
    await expect(
      engine.initialize({
        onProgress: (phase, percent) =>
          progress.push({ phase, percent, variant: engine.selectedVariant() }),
      }),
    ).rejects.toMatchObject({ code: 'DOWNLOAD_REQUIRED' });
    expect(progress.at(-1)).toEqual({ phase: 'preparing', percent: 0, variant: 'q4f16' });
  });
});
