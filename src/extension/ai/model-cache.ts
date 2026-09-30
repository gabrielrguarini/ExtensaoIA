import type { ModelChoice } from './model-catalog';

interface TensorShard {
  dataPath: string;
  nbytes: number;
}

function shards(value: unknown): TensorShard[] {
  if (typeof value !== 'object' || !value || !('records' in value) || !Array.isArray(value.records))
    throw new Error('Índice do modelo inválido.');
  const records: unknown[] = value.records;
  if (!records.length || records.length > 256) throw new Error('Índice do modelo inválido.');
  const names = new Set<string>();
  return records.map((record) => {
    if (typeof record !== 'object' || !record || !('dataPath' in record) || !('nbytes' in record))
      throw new Error('Shard inválido.');
    const { dataPath, nbytes } = record;
    if (
      typeof dataPath !== 'string' ||
      !/^params_shard_[0-9]+\.bin$/.test(dataPath) ||
      names.has(dataPath) ||
      !Number.isSafeInteger(nbytes) ||
      typeof nbytes !== 'number' ||
      nbytes <= 0 ||
      nbytes > 512 * 1024 * 1024
    )
      throw new Error('Shard inválido.');
    names.add(dataPath);
    return { dataPath, nbytes };
  });
}

/** O Cache.add do Chrome pode falhar em respostas CDN válidas; armazenar bytes verificados evita esse caminho. */
async function cacheFile(
  cache: Cache,
  url: string,
  signal: AbortSignal | undefined,
  expectedBytes?: number,
): Promise<Response> {
  const cached = await cache.match(url);
  if (cached) return cached;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (signal?.aborted) throw signal.reason;
    try {
      const response = await fetch(url, signal ? { signal } : undefined);
      if (
        !response.ok ||
        !['huggingface.co', 'us.aws.cdn.hf.co'].includes(new URL(response.url).hostname)
      )
        throw new Error('Resposta do repositório inválida.');
      const bytes = await response.arrayBuffer();
      if (expectedBytes !== undefined && bytes.byteLength !== expectedBytes)
        throw new Error('Tamanho do shard divergente.');
      await cache.put(url, new Response(bytes));
      const stored = await cache.match(url);
      if (!stored) throw new Error('Cache não confirmou o arquivo.');
      return stored;
    } catch (error) {
      if (signal?.aborted) throw signal.reason;
      if (attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw new Error('Download indisponível.');
}

/** Baixa apenas os nomes de arquivos esperados sob a revisão fixa do catálogo. */
export async function cacheModelArtifacts(
  choice: ModelChoice,
  signal: AbortSignal | undefined,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const modelCache = await caches.open('webllm/model');
  const configCache = await caches.open('webllm/config');
  const indexUrl = new URL('tensor-cache.json', choice.url).href;
  const configUrl = new URL('mlc-chat-config.json', choice.url).href;
  const tokenizerUrl = new URL('tokenizer.json', choice.url).href;
  const index: unknown = await (await cacheFile(modelCache, indexUrl, signal)).json();
  const records = shards(index);
  const total = records.length + 2;
  let completed = 0;
  await cacheFile(configCache, configUrl, signal);
  onProgress?.(Math.floor((++completed / total) * 100));
  await cacheFile(modelCache, tokenizerUrl, signal);
  onProgress?.(Math.floor((++completed / total) * 100));
  for (const shard of records) {
    await cacheFile(modelCache, new URL(shard.dataPath, choice.url).href, signal, shard.nbytes);
    onProgress?.(Math.floor((++completed / total) * 100));
  }
}
