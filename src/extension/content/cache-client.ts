import type { ModelProfile, ModelVariant } from '../ai/model-catalog';

export async function removeSelectedCache(
  profile: ModelProfile,
  variant: ModelVariant,
): Promise<void> {
  const prepared: unknown = await chrome.runtime.sendMessage({
    target: 'local-engine',
    type: 'prepare',
  });
  if (
    !prepared ||
    typeof prepared !== 'object' ||
    !('ready' in prepared) ||
    prepared.ready !== true
  )
    throw new Error('Contexto indisponível.');
  const response: unknown = await chrome.runtime.sendMessage({
    target: 'model-cache',
    type: 'remove',
    profile,
    variant,
  });
  if (!response || typeof response !== 'object' || !('ok' in response) || response.ok !== true)
    throw new Error('Remoção não confirmada.');
}
