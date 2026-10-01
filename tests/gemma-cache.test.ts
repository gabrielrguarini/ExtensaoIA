import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  gemmaFiles,
  gemmaPresent,
  gemmaURL,
  prepareGemma,
  removeGemma,
  GEMMA_CACHE,
  GEMMA_RECEIPTS,
} from '../src/extension/ai/gemma-cache';
const digest = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
vi.mock('../src/extension/ai/gemma-catalog', () => ({
  GEMMA_MODEL: {
    id: 'onnx-community/gemma-4-E2B-it-ONNX',
    revision: '9f4bef82ea6e296bc69f8a2f5939f73af81b07a6',
  },
  GEMMA_FILES: [
    'config.json',
    'onnx/embed_tokens_q4f16.onnx',
    'onnx/embed_tokens_q4f16.onnx_data',
    'onnx/embed_tokens_q4.onnx',
    'onnx/embed_tokens_q4.onnx_data',
  ].map((name) => ({
    name,
    bytes: 3,
    sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  })),
}));
let stores: Map<string, Map<string, Response>>;
const store = (name: string) => {
  if (!stores.has(name)) stores.set(name, new Map());
  return stores.get(name)!;
};
function seed() {
  for (const file of gemmaFiles('q4f16'))
    store(GEMMA_CACHE).set(gemmaURL(file), new Response('abc'));
}
beforeEach(() => {
  stores = new Map();
  /* eslint-disable @typescript-eslint/require-await */
  vi.stubGlobal('caches', {
    open: async (name: string) => ({
      match: async (url: string) => store(name).get(url)?.clone(),
      keys: async () => [...store(name).keys()].map((url) => new Request(url)),
      delete: async (url: string) => store(name).delete(url),
      put: async (url: string, response: Response) => {
        const bytes = await response.arrayBuffer();
        store(name).set(url, new Response(bytes));
      },
    }),
  });
  /* eslint-enable @typescript-eslint/require-await */
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw new Error('Rede proibida.');
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());
describe('cache canônico Gemma com integridade publicada', () => {
  it('inventário sem ler pesos; corrupção do mesmo tamanho impede carga e nunca baixa implicitamente', async () => {
    seed();
    const file = gemmaFiles('q4f16')[1]!;
    store(GEMMA_CACHE).set(gemmaURL(file), new Response('cba'));
    expect(await gemmaPresent('q4f16')).toBe(true);
    await expect(prepareGemma('q4f16', false)).rejects.toThrow('DOWNLOAD_REQUIRED');
    expect(fetch).not.toHaveBeenCalled();
    expect(await gemmaPresent('q4f16')).toBe(false);
  });
  it('reutiliza pesos íntegros offline em carregamentos sucessivos', async () => {
    seed();
    await prepareGemma('q4f16', false);
    await prepareGemma('q4f16', false);
    expect(fetch).not.toHaveBeenCalled();
    expect(await gemmaPresent('q4f16')).toBe(true);
    expect(await gemmaPresent('q4')).toBe(false);
  });
  it('reparo autorizado baixa apenas arquivo inválido e registra digest sem duplicar pesos', async () => {
    seed();
    const file = gemmaFiles('q4f16')[1]!;
    store(GEMMA_CACHE).set(gemmaURL(file), new Response('cba'));
    const download = vi.fn((url: string) => {
      const r = new Response('abc');
      Object.defineProperty(r, 'url', { value: url });
      return Promise.resolve(r);
    });
    vi.stubGlobal('fetch', download);
    await prepareGemma('q4f16', true);
    expect(download).toHaveBeenCalledOnce();
    expect(await store(GEMMA_RECEIPTS).get(gemmaURL(file))?.json()).toEqual({
      bytes: 3,
      sha256: digest,
    });
    await prepareGemma('q4f16', false);
  });
  it('download corrompido não recebe recibo nem deixa entrada parcial', async () => {
    vi.stubGlobal('fetch', (url: string) => {
      const r = new Response('cba');
      Object.defineProperty(r, 'url', { value: url });
      return Promise.resolve(r);
    });
    await expect(prepareGemma('q4', true)).rejects.toThrow('MODEL_DOWNLOAD');
    expect(store(GEMMA_CACHE).size).toBe(0);
    expect(store(GEMMA_RECEIPTS).size).toBe(0);
  });
  it('cancelamento impede novos downloads e mantém apenas arquivos já validados', async () => {
    const abort = new AbortController();
    vi.stubGlobal('fetch', (url: string) => {
      const r = new Response('abc');
      Object.defineProperty(r, 'url', { value: url });
      return Promise.resolve(r);
    });
    await expect(
      prepareGemma('q4f16', true, abort.signal, (p) => {
        if (p > 30) abort.abort();
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(store(GEMMA_CACHE).size).toBe(0);
    expect(store(GEMMA_RECEIPTS).size).toBe(0);
  });
  it('remoção preserva outra variante, entradas alheias e modelos de outros motores', async () => {
    seed();
    const other = gemmaFiles('q4')[1]!;
    store(GEMMA_CACHE).set(gemmaURL(other), new Response('abc'));
    store(GEMMA_CACHE).set('https://example.com/other', new Response('preservar'));
    store('webllm/model').set('https://example.com/webllm', new Response('preservar'));
    await removeGemma('q4f16');
    expect(store(GEMMA_CACHE).has(gemmaURL(other))).toBe(true);
    expect(store(GEMMA_CACHE).size).toBe(2);
    expect(store('webllm/model').size).toBe(1);
    expect(await gemmaPresent('q4')).toBe(false);
  });
});
