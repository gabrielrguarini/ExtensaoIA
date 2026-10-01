import type { GemmaCommand, GemmaStatus } from '../../shared/gemma-management';
import { record, fields } from '../../shared/protocol';
export async function manageGemma(command: GemmaCommand): Promise<GemmaStatus | { ok: true }> {
  const ready: unknown = await chrome.runtime.sendMessage({
    target: 'local-engine',
    type: 'prepare',
  });
  if (!record(ready) || ready.ready !== true) throw new Error('Documento de IA indisponível.');
  const result: unknown = await chrome.runtime.sendMessage(command);
  if (!record(result) || result.ok !== true) throw new Error('Gestão do Gemma indisponível.');
  if (command.type !== 'status') return { ok: true };
  if (
    !fields(result, ['ok', 'cached', 'runtime']) ||
    typeof result.cached !== 'boolean' ||
    !['released', 'worker-ready', 'loading', 'loaded'].includes(String(result.runtime))
  )
    throw new Error('Estado do Gemma inválido.');
  return result as unknown as GemmaStatus;
}
