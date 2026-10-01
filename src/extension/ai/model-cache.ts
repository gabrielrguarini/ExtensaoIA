import type { ModelChoice } from './model-catalog';
import { md5 } from '@noble/hashes/legacy.js';
import { bytesToHex } from '@noble/hashes/utils.js';

interface TensorShard {
  dataPath: string;
  nbytes: number;
  md5sum: string;
}

const integrityCache = 'local-writing/artifact-integrity-v1';

async function digest(bytes: ArrayBuffer): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

async function validFile(
  response: Response,
  url: string,
  expectedBytes?: number,
  expectedMd5?: string,
): Promise<boolean> {
  try {
    const bytes = await response.arrayBuffer();
    if (!bytes.byteLength || (expectedBytes !== undefined && bytes.byteLength !== expectedBytes))
      return false;
    if (expectedMd5 && bytesToHex(md5(new Uint8Array(bytes))) !== expectedMd5) return false;
    if (expectedBytes === undefined) {
      const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
      if (typeof value !== 'object' || !value || Array.isArray(value)) return false;
      if (url.endsWith('/tensor-cache.json')) shards(value);
      if (url.endsWith('/tokenizer.json') && !('model' in value)) return false;
      if (url.endsWith('/mlc-chat-config.json') && !('conv_template' in value)) return false;
    }
    const receipts = await caches.open(integrityCache);
    const hash = await digest(bytes);
    const previous = await receipts.match(url);
    if (previous && (await previous.text()) !== hash) return false;
    // MD5 publicado detecta corrupção dos shards antigos; recibos cobrem mudanças posteriores.
    if (!previous) await receipts.put(url, new Response(hash));
    return true;
  } catch {
    return false;
  }
}

/** Nunca consulta a rede. Confere todos os arquivos, sequencialmente, antes do runtime. */
export async function inspectModelArtifacts(
  choice: ModelChoice,
  signal?: AbortSignal,
): Promise<boolean> {
  if (signal?.aborted) throw signal.reason;
  const model = await caches.open('webllm/model');
  const config = await caches.open('webllm/config');
  const indexUrl = new URL('tensor-cache.json', choice.url).href;
  const index = await model.match(indexUrl);
  if (!index || !(await validFile(index.clone(), indexUrl))) return false;
  const records = shards(await index.json());
  const files = [
    { cache: config, name: 'mlc-chat-config.json', size: undefined, md5sum: undefined },
    { cache: model, name: 'tokenizer.json', size: undefined, md5sum: undefined },
    ...records.map((shard) => ({
      cache: model,
      name: shard.dataPath,
      size: shard.nbytes,
      md5sum: shard.md5sum,
    })),
  ];
  for (const file of files) {
    if (signal?.aborted) throw signal.reason;
    const url = new URL(file.name, choice.url).href;
    const response = await file.cache.match(url);
    if (!response || !(await validFile(response, url, file.size, file.md5sum))) return false;
  }
  return true;
}

/** Apenas as URLs sob a revisão fixa selecionada, inclusive downloads parciais. */
export async function modelArtifactsPresent(choice: ModelChoice): Promise<boolean> {
  try {
    const model = await caches.open('webllm/model');
    const config = await caches.open('webllm/config');
    const index = await model.match(new URL('tensor-cache.json', choice.url).href);
    if (!index) return false;
    const records = shards(await index.json());
    // Só inventário de URLs, sem leitura/hash dos GB de pesos na interface.
    const modelKeys = new Set((await model.keys()).map((key) => key.url));
    const configKeys = new Set((await config.keys()).map((key) => key.url));
    return (
      configKeys.has(new URL('mlc-chat-config.json', choice.url).href) &&
      modelKeys.has(new URL('tokenizer.json', choice.url).href) &&
      records.every(({ dataPath }) => modelKeys.has(new URL(dataPath, choice.url).href))
    );
  } catch {
    return false;
  }
}

/** Apenas as URLs sob a revisão fixa selecionada, inclusive downloads parciais. */
export async function removeModelArtifacts(choice: ModelChoice): Promise<void> {
  for (const name of ['webllm/model', 'webllm/config', integrityCache]) {
    const cache = await caches.open(name);
    for (const key of await cache.keys()) {
      if (key.url.startsWith(choice.url)) await cache.delete(key);
    }
  }
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
    const md5sum = 'md5sum' in record ? record.md5sum : undefined;
    if (
      typeof dataPath !== 'string' ||
      !/^params_shard_[0-9]+\.bin$/.test(dataPath) ||
      names.has(dataPath) ||
      !Number.isSafeInteger(nbytes) ||
      typeof nbytes !== 'number' ||
      nbytes <= 0 ||
      nbytes > 512 * 1024 * 1024 ||
      typeof md5sum !== 'string' ||
      !/^[a-f0-9]{32}$/.test(md5sum)
    )
      throw new Error('Shard inválido.');
    names.add(dataPath);
    return { dataPath, nbytes, md5sum };
  });
}

/** O Cache.add do Chrome pode falhar em respostas CDN válidas; armazenar bytes verificados evita esse caminho. */
async function cacheFile(
  cache: Cache,
  url: string,
  signal: AbortSignal | undefined,
  expectedBytes?: number,
  expectedMd5?: string,
): Promise<Response> {
  if (signal?.aborted) throw signal.reason;
  const cached = await cache.match(url);
  if (cached && (await validFile(cached.clone(), url, expectedBytes, expectedMd5))) return cached;
  await cache.delete(url);
  await (await caches.open(integrityCache)).delete(url);
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
      const verified = new Response(bytes);
      if (!(await validFile(verified.clone(), url, expectedBytes, expectedMd5)))
        throw new Error('Artefato inválido.');
      await cache.put(url, verified);
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
    await cacheFile(
      modelCache,
      new URL(shard.dataPath, choice.url).href,
      signal,
      shard.nbytes,
      shard.md5sum,
    );
    onProgress?.(Math.floor((++completed / total) * 100));
  }
}
