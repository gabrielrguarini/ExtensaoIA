import type { Engine } from '../background/router';
import type { BoundRequest } from '../../shared/protocol';
import type { WritingPreferences } from '../../shared/preferences';
import type { AvailabilityQuery, EngineAvailability } from '../../shared/suggestion';
import { isWritingAction } from '../../shared/actions';

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
  const action = isWritingAction(request.action)
    ? request.action
    : request.action === 'revisar-sentido'
      ? 'semantic-review'
      : undefined;
  if (preferences.engine === 'chrome-preferred' && action) {
    const query: AvailabilityQuery = {
      action,
      language: preferences.language,
      ...(preferences.chromePortuguesePrompt ? { chromePortuguesePrompt: true } : {}),
    };
    const available = await native.model.availability(query);
    signal.throwIfAborted();
    if (available.state === 'ready') {
      local.reset();
      try {
        return await native.prepare(query, signal, request);
      } catch {
        signal.throwIfAborted();
      }
    }
  }
  signal.throwIfAborted();
  native.reset();
  return local.ensure();
}
