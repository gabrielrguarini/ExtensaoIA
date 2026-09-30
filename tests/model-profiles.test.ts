import { afterEach, describe, expect, it, vi } from 'vitest';
import { MODEL_CHOICES, MODEL_PROFILES, smallerProfile } from '../src/extension/ai/model-catalog';
import { cacheModelArtifacts } from '../src/extension/ai/model-cache';
import { selectModel } from '../src/extension/ai/webllm-engine';
import { correctionTokenBudget, parseQwenTemplate } from '../src/extension/ai/token-budget';

afterEach(() => vi.unstubAllGlobals());

describe('perfis locais fixados', () => {
  it('seleciona a variante f32 em todas as GPUs sem shader-f16 e informa requisito maior', async () => {
    const gpu = {
      requestAdapter: () =>
        Promise.resolve({
          features: new Set<string>(),
          limits: {
            maxStorageBufferBindingSize: 256 * 1024 * 1024,
            maxBufferSize: 512 * 1024 * 1024,
          },
        }),
    } as unknown as GPU;
    for (const profile of MODEL_PROFILES) {
      const selected = await selectModel(gpu, profile);
      expect(selected).toEqual(MODEL_CHOICES[profile].q4f32_1);
      expect(selected.gpuMemoryEstimateMB).toBeGreaterThan(
        MODEL_CHOICES[profile].q4f16_1.gpuMemoryEstimateMB,
      );
      expect(selected.url).toMatch(
        /^https:\/\/huggingface\.co\/mlc-ai\/[^/]+\/resolve\/[a-f0-9]{40}\/$/,
      );
      expect(selected.contextTokens).toBe(4096);
    }
    expect(smallerProfile('qualidade')).toBe('equilibrado');
    expect(smallerProfile('equilibrado')).toBe('economico');
    expect(smallerProfile('economico')).toBeNull();
  });

  it('usa o template Qwen3 com o bloco vazio do modo sem raciocínio no orçamento', () => {
    const template = parseQwenTemplate({
      conv_template: {
        name: 'qwen3',
        system_template: '<|im_start|>system\n{system_message}<|im_end|>\n',
        add_role_after_system_message: true,
        roles: { user: '<|im_start|>user', assistant: '<|im_start|>assistant' },
        role_content_sep: '\n',
        role_empty_sep: '\n',
        seps: ['<|im_end|>\n'],
      },
    });
    expect(template.assistantSuffix).toBe('<think>\n\n</think>\n\n');
    const encode = (value: string) => new Int32Array(value.length);
    const budget = correctionTokenBudget(encode, template, 'Sistema', 'Teste');
    expect(budget?.promptTokens).toBeGreaterThan(
      encode('SistemaTeste').length + (template.assistantSuffix?.length ?? 0),
    );
    expect(() => parseQwenTemplate({ conv_template: { name: 'qwen3' } })).toThrow();
  });

  it('armazena shards fixados por fetch e put, retoma cache e rejeita caminhos externos', async () => {
    const stores = new Map<string, Map<string, Response>>();
    vi.stubGlobal('caches', {
      open: (name: string) => {
        const entries = stores.get(name) ?? new Map<string, Response>();
        stores.set(name, entries);
        return Promise.resolve({
          match: (url: string) => Promise.resolve(entries.get(url)?.clone()),
          put: (url: string, response: Response) => {
            entries.set(url, response.clone());
            return Promise.resolve();
          },
          add: () => {
            throw new Error('Cache.add não deve ser chamado.');
          },
        });
      },
    });
    const choice = MODEL_CHOICES.equilibrado.q4f16_1;
    const index = {
      records: [
        { dataPath: 'params_shard_0.bin', nbytes: 2 },
        { dataPath: 'params_shard_1.bin', nbytes: 3 },
      ],
    };
    const fetcher = vi.fn((url: string) => {
      const body = url.endsWith('tensor-cache.json')
        ? JSON.stringify(index)
        : url.endsWith('params_shard_0.bin')
          ? 'ab'
          : url.endsWith('params_shard_1.bin')
            ? 'abc'
            : '{}';
      const response = new Response(body);
      Object.defineProperty(response, 'url', { value: url });
      return Promise.resolve(response);
    });
    vi.stubGlobal('fetch', fetcher);
    const progress: number[] = [];
    await cacheModelArtifacts(choice, undefined, (value) => progress.push(value));
    expect(progress.at(-1)).toBe(100);
    expect(fetcher).toHaveBeenCalledTimes(5);
    await cacheModelArtifacts(choice, undefined);
    expect(fetcher).toHaveBeenCalledTimes(5);
    index.records[1]!.dataPath = 'https://example.com/remote.bin';
    stores.clear();
    await expect(cacheModelArtifacts(choice, undefined)).rejects.toThrow('Shard inválido');
    expect(fetcher).toHaveBeenCalledTimes(6);
  });
});
