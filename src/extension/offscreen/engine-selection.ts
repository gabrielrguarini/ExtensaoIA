import type { Engine } from '../background/router';
import type { BoundRequest } from '../../shared/protocol';
import type { WritingPreferences } from '../../shared/preferences';
import type { AvailabilityQuery, EngineAvailability } from '../../shared/suggestion';
import { isWritingAction } from '../../shared/actions';
import { selectNativeQuery } from '../ai/native-choice';

interface NativeHost extends Engine {
  model: { availability(query: AvailabilityQuery): Promise<EngineAvailability> };
  prepare(query: AvailabilityQuery, signal: AbortSignal, request: BoundRequest): Promise<Engine>;
}
/** Seleção e inicialização acontecem antes de enviar start; nunca reexecuta a geração. */
export async function selectEngine(
  request: BoundRequest,
  signal: AbortSignal,
  preferences: WritingPreferences,
  native: NativeHost,
  local: { ensure(): Promise<Engine>; reset(): void },
): Promise<Engine> {
  const action = isWritingAction(request.action) ? request.action : undefined;
  if (preferences.engine === 'chrome-preferred' && action) {
    const selected = await selectNativeQuery(
      {
        action,
        language: preferences.language,
      },
      (query) => native.model.availability(query),
      signal,
    );
    signal.throwIfAborted();
    if (selected.availability.state === 'ready') {
      local.reset();
      try {
        return await native.prepare(selected.query, signal, request);
      } catch {
        signal.throwIfAborted();
      }
    }
  }
  signal.throwIfAborted();
  native.reset();
  return local.ensure();
}
