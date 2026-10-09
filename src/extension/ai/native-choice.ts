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
  // Chrome 154 rejeita pt-BR declarado e registra erro até em availability().
  // Selecionar a compatibilidade autorizada antes da consulta, sem provocar a
  // rejeição nativa. Os demais idiomas conservam as APIs especializadas.
  const selected = { ...query, chromePortuguesePrompt: query.language === 'pt-BR' };
  const availability = await probe(selected);
  signal?.throwIfAborted();
  return { query: selected, availability };
}
