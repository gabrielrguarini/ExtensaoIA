import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cacheModelArtifacts,
  inspectModelArtifacts,
  removeModelArtifacts,
} from '../src/extension/ai/model-cache';
import { MODEL_CHOICES } from '../src/extension/ai/model-catalog';

const choice = MODEL_CHOICES.economico.q4f16_1;
let stores: Map<string, Map<string, Response>>;
function store(name: string) {
  let entries = stores.get(name);
  if (!entries) {
    entries = new Map();
    stores.set(name, entries);
  }
  return entries;
}
function seed() {
  const entries = store('webllm/model');
  entries.set(
    choice.url + 'tensor-cache.json',
    Response.json({
      records: [
        { dataPath: 'params_shard_0.bin', nbytes: 3, md5sum: '5289df737df57326fcdd22597afb1fac' },
      ],
    }),
  );
  entries.set(choice.url + 'tokenizer.json', Response.json({ model: {} }));
  entries.set(choice.url + 'params_shard_0.bin', new Response(new Uint8Array([1, 2, 3])));
  store('webllm/config').set(
    choice.url + 'mlc-chat-config.json',
    Response.json({ conv_template: {} }),
  );
}
beforeEach(() => {
  stores = new Map();
  // Métodos assíncronos reproduzem a Cache API, sem I/O no fixture.
  /* eslint-disable @typescript-eslint/require-await */
  vi.stubGlobal('caches', {
    open: async (name: string) => ({
      match: async (url: string) => store(name).get(url)?.clone(),
      put: async (url: string, response: Response) => {
        store(name).set(url, response.clone());
      },
      delete: async (key: string | Request) =>
        store(name).delete(typeof key === 'string' ? key : key.url),
      keys: async () => [...store(name).keys()].map((url) => new Request(url)),
    }),
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw new Error('Rede proibida.');
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('cache por revisão e variante', () => {
  it('MD5 publicado recusa corrupção anterior à criação de qualquer recibo local', async () => {
    seed();
    store('webllm/model').set(
      choice.url + 'params_shard_0.bin',
      new Response(new Uint8Array([3, 2, 1])),
    );
    expect(await inspectModelArtifacts(choice)).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('migra artefatos completos, reutiliza offline e detecta corrupção de mesmo tamanho', async () => {
    seed();
    expect(await inspectModelArtifacts(choice)).toBe(true);
    expect(await inspectModelArtifacts(choice)).toBe(true);
    store('webllm/model').set(
      choice.url + 'params_shard_0.bin',
      new Response(new Uint8Array([3, 2, 1])),
    );
    expect(await inspectModelArtifacts(choice)).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('não declara cache parcial, shard truncado ou índice malformado disponível', async () => {
    seed();
    store('webllm/model').delete(choice.url + 'tokenizer.json');
    expect(await inspectModelArtifacts(choice)).toBe(false);
    seed();
    store('webllm/model').set(choice.url + 'params_shard_0.bin', new Response('xx'));
    expect(await inspectModelArtifacts(choice)).toBe(false);
    store('webllm/model').set(
      choice.url + 'tensor-cache.json',
      Response.json({
        records: [{ dataPath: '../other', nbytes: 3, md5sum: '5289df737df57326fcdd22597afb1fac' }],
      }),
    );
    expect(await inspectModelArtifacts(choice)).toBe(false);
  });
  it('repara somente arquivos inválidos após autorização e mantém os válidos', async () => {
    seed();
    expect(await inspectModelArtifacts(choice)).toBe(true);
    store('webllm/model').set(choice.url + 'params_shard_0.bin', new Response('xx'));
    const download = vi.fn(async (url: string) => {
      const response = new Response(new Uint8Array([1, 2, 3]));
      Object.defineProperty(response, 'url', { value: url });
      return response;
    });
    vi.stubGlobal('fetch', download);
    await cacheModelArtifacts(choice, undefined);
    expect(download).toHaveBeenCalledExactlyOnceWith(choice.url + 'params_shard_0.bin', undefined);
    expect(await inspectModelArtifacts(choice)).toBe(true);
  });
  it('remove somente a revisão selecionada, inclusive resíduos parciais e recibos', async () => {
    seed();
    await inspectModelArtifacts(choice);
    const other = MODEL_CHOICES.equilibrado.q4f16_1.url + 'params_shard_0.bin';
    store('webllm/model').set(other, new Response('outro modelo'));
    store('site-ou-preferencias').set('https://example.com/', new Response('preservar'));
    await removeModelArtifacts(choice);
    expect(await inspectModelArtifacts(choice)).toBe(false);
    expect(store('webllm/model').has(other)).toBe(true);
    expect(store('site-ou-preferencias').size).toBe(1);
    expect(store('local-writing/artifact-integrity-v1').size).toBe(0);
  });
  it('download cancelado não inicia requisição', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(cacheModelArtifacts(choice, controller.signal)).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
});
