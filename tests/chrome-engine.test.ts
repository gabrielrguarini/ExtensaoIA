import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChromeEngine, nativeError } from '../src/extension/ai/chrome-engine';
import {
  createNative,
  nativeConfig,
  nativeStream,
  nativeAvailability,
  chromeAPIs,
} from '../src/extension/ai/chrome-api';
import type { ChromeAPIs } from '../src/extension/ai/chrome-api';
import type { NativeGenerationMetrics } from '../src/extension/ai/ai-engine';

function stream(...chunks: string[]) {
  return new ReadableStream<string>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}
async function output(value: AsyncIterable<string>) {
  let text = '';
  for await (const part of value) text += part;
  return text;
}
function rewriter() {
  const session = {
    destroy: vi.fn(),
    measureInputUsage: vi.fn(() => Promise.resolve(10)),
    inputQuota: 100,
    rewriteStreaming: vi.fn<
      (text: string, options?: RewriterRewriteOptions) => ReadableStream<string>
    >(() => stream('Texto ', 'final.')),
  };
  const api = {
    availability: vi.fn(() => Promise.resolve<Availability>('available')),
    create: vi.fn(() => Promise.resolve(session)),
  };
  return { session, api, apis: { rewriter: api as unknown as typeof Rewriter } };
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('adaptador Chrome com contratos oficiais', () => {
  it('compatibilidade pt-BR usa Prompt sem declarar inglês como idioma dos dados', async () => {
    const clone = { destroy: vi.fn(), prompt: vi.fn(() => Promise.resolve('Você pode conferir?')) };
    const base = { destroy: vi.fn(), clone: vi.fn(() => Promise.resolve(clone)) };
    const api = {
      availability: vi.fn(() => Promise.resolve<Availability>('available')),
      create: vi.fn(() => Promise.resolve(base)),
    };
    const engine = new ChromeEngine({ prompt: api as unknown as typeof LanguageModel });
    const query = { action: 'corrigir' as const, language: 'pt-BR', chromePortuguesePrompt: true };
    const config = nativeConfig(query);
    const review = nativeConfig({ ...query, action: 'semantic-review' });
    expect(config.api).toBe('prompt');
    expect(config.options).not.toHaveProperty('expectedInputs');
    expect(config.options).not.toHaveProperty('expectedOutputs');
    expect(config.options).not.toEqual(review.options);
    await engine.initialize({ query });
    expect(api.availability).toHaveBeenCalledWith(config.options);
    expect(api.create).toHaveBeenCalledWith(expect.objectContaining(config.options));
    expect(await output(engine.generate('voce pode conferir?'))).toBe('Você pode conferir?');
    expect(engine.identity().runtime).toContain('experimental');
    expect(clone.destroy).toHaveBeenCalledOnce();
    await engine.unload();
  });
  it('adaptador não exige streaming de um runtime experimental sem esse método', async () => {
    const session = {
      destroy: vi.fn(),
      rewrite: vi.fn(() => Promise.resolve('Resultado completo.')),
    };
    const api = {
      availability: () => Promise.resolve<Availability>('available'),
      create: () => Promise.resolve(session),
    };
    const engine = new ChromeEngine({ rewriter: api as unknown as typeof Rewriter });
    await engine.initialize({ query: { action: 'formal', language: 'pt-BR' } });
    expect(await output(engine.generate('Texto.'))).toBe('Resultado completo.');
    expect(engine.capabilities().streaming).toBe(false);
    expect(session.rewrite).toHaveBeenCalledOnce();
    await engine.unload();
  });
  it('globais com o mesmo contrato fora do Chrome não habilitam um provedor desconhecido', () => {
    vi.stubGlobal('LanguageModel', { availability: vi.fn() });
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 Chrome/154.0.0.0 Edg/154.0.0.0' });
    expect(chromeAPIs()).toEqual({});
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 Chrome/154.0.0.0' });
    expect(chromeAPIs().prompt).toBeDefined();
  });
  it('detecta globais ausentes sem baixar e preserva estado desconhecido após timeout', async () => {
    const engine = new ChromeEngine({});
    expect(await engine.availability({ action: 'corrigir', language: 'pt-BR' })).toMatchObject({
      state: 'unavailable',
      reason: 'api',
    });
    await expect(engine.initialize()).rejects.toMatchObject({ code: 'NATIVE_NOT_SUPPORTED' });
    vi.useFakeTimers();
    const apis = {
      prompt: {
        availability: () => new Promise<Availability>(() => undefined),
      } as unknown as typeof LanguageModel,
    };
    const pending = new ChromeEngine(apis).availability({ action: 'engracado', language: 'pt-BR' });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(await pending).toEqual({ state: 'unavailable', reason: 'probe' });
  });
  it.each(['unavailable', 'downloadable', 'downloading'] as const)(
    'não inicia create no offscreen quando o estado é %s, mesmo allowDownload',
    async (state) => {
      const h = rewriter();
      h.api.availability.mockResolvedValue(state);
      const engine = new ChromeEngine(h.apis);
      await expect(
        engine.initialize({ query: { action: 'formal', language: 'pt-BR' }, allowDownload: true }),
      ).rejects.toMatchObject({ code: 'NATIVE_NOT_SUPPORTED' });
      expect(h.api.create).not.toHaveBeenCalled();
    },
  );
  it('consulta e cria com os mesmos idiomas, tom, formato e comprimento; reutiliza e recria quando necessário', async () => {
    const h = rewriter();
    const engine = new ChromeEngine(h.apis);
    const query = { action: 'formal' as const, language: 'pt-BR' };
    await engine.initialize({ query });
    await engine.initialize({ query });
    expect(h.api.create).toHaveBeenCalledOnce();
    expect(h.api.availability).toHaveBeenCalledWith(nativeConfig(query).options);
    expect(h.api.create).toHaveBeenCalledWith(expect.objectContaining(nativeConfig(query).options));
    expect(await output(engine.generate('Rascunho original.', { task: 'formal' }))).toBe(
      'Texto final.',
    );
    expect(h.session.rewriteStreaming.mock.calls[0]?.[0]).toBe('Rascunho original.');
    await engine.initialize({ query: { action: 'conciso', language: 'pt-BR' } });
    expect(h.session.destroy).toHaveBeenCalledOnce();
    expect(h.api.create).toHaveBeenCalledTimes(2);
    await engine.unload();
  });
  it('opção/idioma recusado na criação não é geração nem aprovação presumida', async () => {
    const h = rewriter();
    h.api.create.mockRejectedValue(new DOMException('idioma', 'NotSupportedError'));
    await expect(
      new ChromeEngine(h.apis).initialize({ query: { action: 'formal', language: 'pt-BR' } }),
    ).rejects.toMatchObject({ code: 'NATIVE_NOT_SUPPORTED' });
    expect(h.session.rewriteStreaming).not.toHaveBeenCalled();
  });
  it('preparação chama create no mesmo fluxo síncrono e fornece progresso oficial e cancelamento', async () => {
    const h = rewriter();
    const controller = new AbortController();
    const monitor: CreateMonitorCallback = vi.fn();
    const pending = createNative(
      nativeConfig({ action: 'formal', language: 'pt-BR' }),
      { signal: controller.signal, monitor },
      h.apis,
    );
    expect(h.api.create).toHaveBeenCalledOnce();
    expect(h.api.create).toHaveBeenCalledWith(
      expect.objectContaining({ signal: controller.signal, monitor }),
    );
    await pending;
  });
  it('Proofreader adapta correctedInput sem presumir clone ou streaming', async () => {
    const session = {
      destroy: vi.fn(),
      proofread: vi.fn(() =>
        Promise.resolve<ProofreadResult>({ correctedInput: 'Texto corrigido.', corrections: [] }),
      ),
    };
    const api = {
      availability: () => Promise.resolve<Availability>('available'),
      create: () => Promise.resolve(session),
    };
    const engine = new ChromeEngine({ proofreader: api as unknown as typeof Proofreader });
    const progress = vi.fn();
    await engine.initialize({ onProgress: progress });
    expect(await output(engine.generate('Texto original.'))).toBe('Texto corrigido.');
    expect(progress).toHaveBeenLastCalledWith('ready', 100);
    expect(engine.identity()).toMatchObject({
      id: 'chrome',
      model: null,
      execution: 'browser-managed',
    });
    expect(engine.capabilities().streaming).toBe(false);
    await engine.unload();
    expect(session.destroy).toHaveBeenCalledOnce();
  });
  it('quota é conferida antes da inferência e não é chamada de tokens', async () => {
    const h = rewriter();
    h.session.measureInputUsage.mockResolvedValue(101);
    const engine = new ChromeEngine(h.apis);
    await engine.initialize({ query: { action: 'formal', language: 'pt-BR' } });
    await expect(output(engine.generate('Texto.', { task: 'formal' }))).rejects.toMatchObject({
      code: 'NATIVE_QUOTA',
    });
    expect(h.session.rewriteStreaming).not.toHaveBeenCalled();
    expect(nativeError(new DOMException('quota', 'QuotaExceededError')).code).toBe('NATIVE_QUOTA');
    await engine.unload();
  });
  it('Prompt mantém base sem rascunhos e destrói clones isolados; deltas repetidos são preservados', async () => {
    const clones = Array.from({ length: 2 }, () => ({
      destroy: vi.fn(),
      promptStreaming: vi.fn(() => stream('ha', 'ha')),
    }));
    let index = 0;
    const base = { clone: vi.fn(() => Promise.resolve(clones[index++])), destroy: vi.fn() };
    const api = {
      availability: vi.fn(() => Promise.resolve<Availability>('available')),
      create: vi.fn(() => Promise.resolve(base)),
    };
    const engine = new ChromeEngine({ prompt: api as unknown as typeof LanguageModel });
    const preparation = new AbortController();
    await engine.initialize({
      query: { action: 'engracado', language: 'pt-BR' },
      signal: preparation.signal,
    });
    preparation.abort(); // Terminar preparação não destrói a base reutilizável.
    for (const text of ['PRIMEIRO_RASCUNHO', 'SEGUNDO_RASCUNHO'])
      expect(await output(engine.generate(text))).toBe('haha');
    const configuration = JSON.stringify(api.create.mock.calls);
    expect(configuration).not.toContain('PRIMEIRO_RASCUNHO');
    expect(configuration).not.toContain('SEGUNDO_RASCUNHO');
    expect(configuration).toContain('Brazilian Portuguese');
    expect(clones[0]?.promptStreaming).toHaveBeenCalledOnce();
    expect(clones[1]?.promptStreaming).toHaveBeenCalledOnce();
    expect(clones[0]?.destroy).toHaveBeenCalledOnce();
    expect(clones[1]?.destroy).toHaveBeenCalledOnce();
    expect(base.destroy).not.toHaveBeenCalled();
    await engine.unload();
    expect(base.destroy).toHaveBeenCalledOnce();
  });
  it('análise explícita usa clone e restrição JSON, sem reescrita adicional', async () => {
    const clone = {
      destroy: vi.fn(),
      measureContextUsage: vi.fn(() => Promise.resolve(10)),
      contextWindow: 100,
      contextUsage: 0,
      promptStreaming: vi.fn(() => stream('{"valid":true,"meaningPreserved":true,"issues":[]}')),
    };
    const base = { clone: () => Promise.resolve(clone), destroy: vi.fn() };
    const api = {
      availability: () => Promise.resolve<Availability>('available'),
      create: () => Promise.resolve(base),
    };
    const engine = new ChromeEngine({ prompt: api as unknown as typeof LanguageModel });
    await engine.initialize({ query: { action: 'semantic-review', language: 'pt-BR' } });
    expect(
      JSON.parse(
        await output(
          engine.generate('{"original":"a","suggestion":"b"}', { task: 'semantic-review' }),
        ),
      ) as unknown,
    ).toMatchObject({ valid: true });
    const promptOptions: unknown = clone.promptStreaming.mock.calls;
    expect(JSON.stringify(promptOptions)).toContain('responseConstraint');
    expect(clone.measureContextUsage.mock.calls).toEqual(clone.promptStreaming.mock.calls);
    await engine.unload();
  });
  it('stream cumulativo explicitamente configurado não duplica saída e abort cancela reader', async () => {
    expect(
      await output(nativeStream(stream('a', 'ab', 'ab', 'abc'), undefined, 'cumulative')),
    ).toBe('abc');
    const cancel = vi.fn();
    const controller = new AbortController();
    const iterator = nativeStream(new ReadableStream<string>({ cancel }), controller.signal)[
      Symbol.asyncIterator
    ]();
    const pending = iterator.next();
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(cancel).toHaveBeenCalledOnce();
  });
  it('liberação durante create impede sessão tardia de reaparecer', async () => {
    const h = rewriter();
    let complete: ((value: typeof h.session) => void) | undefined;
    h.api.create.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const engine = new ChromeEngine(h.apis);
    const pending = engine.initialize({ query: { action: 'formal', language: 'pt-BR' } });
    for (let i = 0; i < 5; i++) await Promise.resolve();
    await engine.unload();
    complete?.(h.session);
    await expect(pending).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    expect(h.session.destroy).toHaveBeenCalledOnce();
    expect(engine.isReady()).toBe(false);
  });
  it('idle não descarrega durante geração; cancela, libera e mede somente unidades conhecidas', async () => {
    vi.useFakeTimers();
    const h = rewriter();
    const engine = new ChromeEngine(h.apis, 300_000);
    await engine.initialize({ query: { action: 'formal', language: 'pt-BR' } });
    const metrics: NativeGenerationMetrics[] = [];
    await output(
      engine.generate('Texto.', {
        task: 'formal',
        onNativeMetrics: (value) => metrics.push(value),
      }),
    );
    expect(metrics[0]).toMatchObject({
      usageUnit: 'browser-quota',
      inputUsage: 10,
      inputLimit: 100,
    });
    expect(metrics[0]).not.toHaveProperty('tokens');
    let writer: ReadableStreamDefaultController<string> | undefined;
    h.session.rewriteStreaming.mockImplementation(
      () =>
        new ReadableStream<string>({
          start(c) {
            writer = c;
          },
        }),
    );
    const controller = new AbortController();
    const generation = engine.generate('Texto.', { task: 'formal', signal: controller.signal });
    const iterator = generation[Symbol.asyncIterator]();
    const pending = iterator.next();
    for (let i = 0; i < 6; i++) await Promise.resolve();
    await expect(output(engine.generate('Outro.'))).rejects.toMatchObject({ code: 'BUSY' });
    await vi.advanceTimersByTimeAsync(300_001);
    expect(h.session.destroy).not.toHaveBeenCalled();
    expect(writer).toBeDefined();
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    await vi.advanceTimersByTimeAsync(300_000);
    expect(h.session.destroy).toHaveBeenCalledOnce();
    expect(engine.isReady()).toBe(false);
  });
  it('contratos exclusivos não adicionam Writer/Summarizer e cada idioma é efetivamente consultado', async () => {
    const h = rewriter();
    const apis: ChromeAPIs = h.apis;
    await nativeAvailability(nativeConfig({ action: 'formal', language: 'pt-BR' }), apis);
    expect(h.api.availability).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedInputLanguages: ['pt-BR'],
        expectedContextLanguages: ['en'],
        outputLanguage: 'pt-BR',
      }),
    );
    expect(nativeConfig({ action: 'engracado', language: 'pt-BR' }).api).toBe('prompt');
    expect(nativeConfig({ action: 'profissional', language: 'pt-BR' }).api).toBe('prompt');
    expect(nativeConfig({ action: 'corrigir', language: 'pt-BR' }).api).toBe('proofreader');
  });
});
