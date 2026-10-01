import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { GEMMA_FILES, GEMMA_MODEL } from './gemma-catalog';
import type { GemmaVariant } from '../../shared/local-model';

export const GEMMA_CACHE = 'local-writing/gemma';
export const GEMMA_RECEIPTS = 'local-writing/gemma-integrity';
export const GEMMA_BASE =
  'https://huggingface.co/' + GEMMA_MODEL.id + '/resolve/' + GEMMA_MODEL.revision + '/';
export type GemmaFile = (typeof GEMMA_FILES)[number];
export function gemmaFiles(variant: GemmaVariant): readonly GemmaFile[] {
  return GEMMA_FILES.filter(
    (file) => !file.name.startsWith('onnx/') || file.name.includes('_' + variant + '.onnx'),
  );
}
export function gemmaBytes(variant: GemmaVariant): number {
  return gemmaFiles(variant).reduce((sum, file) => sum + file.bytes, 0);
}
export function gemmaURL(file: GemmaFile): string {
  return GEMMA_BASE + file.name;
}
/** Inventário pequeno, sem reler os pesos. Integridade é conferida em cada carregamento. */
export async function gemmaPresent(variant: GemmaVariant): Promise<boolean> {
  const cache = await caches.open(GEMMA_CACHE);
  const keys = new Set((await cache.keys()).map((key) => key.url));
  return gemmaFiles(variant).every((file) => keys.has(gemmaURL(file)));
}
async function verify(response: Response, file: GemmaFile, signal?: AbortSignal): Promise<boolean> {
  if (!response.body || response.status !== 200) return false;
  const reader = response.body.getReader();
  const digest = sha256.create();
  let size = 0;
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > file.bytes) return false;
      digest.update(value);
    }
    return size === file.bytes && bytesToHex(digest.digest()) === file.sha256;
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
    digest.destroy();
  }
}
/** Pesos validados em fluxo, sem criar cópias de GB em memória para hashing. */
export async function prepareGemma(
  variant: GemmaVariant,
  allowDownload: boolean,
  signal?: AbortSignal,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const cache = await caches.open(GEMMA_CACHE);
  const receipts = await caches.open(GEMMA_RECEIPTS);
  const total = gemmaBytes(variant);
  let completed = 0;
  for (const file of gemmaFiles(variant)) {
    signal?.throwIfAborted();
    const url = gemmaURL(file);
    const stored = await cache.match(url);
    if (stored && (await verify(stored, file, signal))) {
      completed += file.bytes;
      onProgress?.((completed / total) * 100);
      continue;
    }
    await cache.delete(url);
    await receipts.delete(url);
    if (!allowDownload) throw new Error('DOWNLOAD_REQUIRED');
    const response = await fetch(url, {
      ...(signal ? { signal } : {}),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    if (
      !response.ok ||
      !response.body ||
      !['huggingface.co', 'us.aws.cdn.hf.co'].includes(new URL(response.url).hostname)
    )
      throw new Error('MODEL_DOWNLOAD');
    const hash = sha256.create();
    let loaded = 0;
    const stream = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        signal?.throwIfAborted();
        loaded += chunk.byteLength;
        if (loaded > file.bytes) throw new Error('MODEL_DOWNLOAD');
        hash.update(chunk);
        onProgress?.(((completed + loaded) / total) * 100);
        controller.enqueue(chunk);
      },
      flush() {
        if (loaded !== file.bytes || bytesToHex(hash.digest()) !== file.sha256)
          throw new Error('MODEL_DOWNLOAD');
      },
    });
    try {
      await cache.put(
        url,
        new Response(response.body.pipeThrough(stream), {
          headers: {
            'Content-Length': String(file.bytes),
            'Content-Type': 'application/octet-stream',
          },
        }),
      );
      signal?.throwIfAborted();
      await receipts.put(
        url,
        new Response(JSON.stringify({ bytes: file.bytes, sha256: file.sha256 })),
      );
      completed += file.bytes;
    } catch (error) {
      await cache.delete(url);
      await receipts.delete(url);
      throw error;
    } finally {
      hash.destroy();
    }
  }
}
/** Remoção somente da variante registrada; preserva modelos e entradas alheios. */
export async function removeGemma(variant: GemmaVariant): Promise<void> {
  for (const name of [GEMMA_CACHE, GEMMA_RECEIPTS]) {
    const cache = await caches.open(name);
    for (const file of gemmaFiles(variant)) await cache.delete(gemmaURL(file));
  }
}
