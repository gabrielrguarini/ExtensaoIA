import type { ModelCommand, ModelStatus } from '../../shared/model-management';
import { record } from '../../shared/protocol';
import { isModelProfile } from '../../shared/preferences';
export async function manageModel(command: ModelCommand): Promise<ModelStatus | { ok: true }> {
  const ready: unknown = await chrome.runtime.sendMessage({
    target: 'local-engine',
    type: 'prepare',
  });
  if (!record(ready) || ready.ready !== true) throw new Error('Motor local indisponível.');
  const result: unknown = await chrome.runtime.sendMessage(command);
  if (!record(result) || result.ok !== true)
    throw new Error('Operação indisponível. Atualize e tente novamente.');
  if (command.type !== 'status') return { ok: true };
  if (
    typeof result.cached !== 'boolean' ||
    !['released', 'worker-ready', 'loading', 'loaded'].includes(String(result.runtime)) ||
    (result.loadedProfile !== null && !isModelProfile(result.loadedProfile))
  )
    throw new Error('Estado do modelo inválido.');
  return result as unknown as ModelStatus;
}
