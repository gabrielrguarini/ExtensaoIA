import type { AvailabilityQuery, EngineAvailability } from '../../shared/suggestion';
import { nativeAvailability, nativeConfig } from './chrome-api';

export async function probeNative(query: AvailabilityQuery): Promise<EngineAvailability> {
  try {
    const value = await nativeAvailability(nativeConfig(query));
    return {
      state:
        value === 'available'
          ? 'ready'
          : value === 'unavailable'
            ? 'unavailable'
            : 'requires-initialization',
      nativeAvailability: value,
    };
  } catch {
    return { state: 'unavailable', reason: 'probe' };
  }
}

/** Só consulta. A configuração escolhida é reutilizada na criação, antes de gerar. */
export async function selectNativeQuery(
  query: AvailabilityQuery,
  probe: (query: AvailabilityQuery) => Promise<EngineAvailability> = probeNative,
  signal?: AbortSignal,
): Promise<{ query: AvailabilityQuery; availability: EngineAvailability }> {
  signal?.throwIfAborted();
  const declared = { ...query, chromePortuguesePrompt: false };
  const availability = await probe(declared);
  signal?.throwIfAborted();
  if (availability.state === 'ready' || query.language !== 'pt-BR')
    return { query: declared, availability };
  const compatible = { ...query, chromePortuguesePrompt: true };
  const fallback = await probe(compatible);
  signal?.throwIfAborted();
  if (
    fallback.state === 'ready' ||
    (availability.state === 'unavailable' && fallback.state !== 'unavailable')
  )
    return { query: compatible, availability: fallback };
  return { query: declared, availability };
}
