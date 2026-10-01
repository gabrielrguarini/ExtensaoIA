import { isChromeStatus } from '../../shared/chrome-management';
import type { ChromeStatus } from '../../shared/chrome-management';
import { record } from '../../shared/protocol';

export async function chromeStatus(): Promise<ChromeStatus> {
  const prepared: unknown = await chrome.runtime.sendMessage({
    target: 'local-engine',
    type: 'prepare',
  });
  if (!record(prepared) || prepared.ready !== true)
    throw new Error('Documento de inferência indisponível.');
  const result: unknown = await chrome.runtime.sendMessage({ target: 'chrome-ai', type: 'status' });
  if (!isChromeStatus(result))
    throw new Error('Disponibilidade do Chrome não pôde ser consultada.');
  return result;
}
export async function unloadChrome(): Promise<void> {
  const value: unknown = await chrome.runtime.sendMessage({ target: 'chrome-ai', type: 'unload' });
  if (!record(value) || value.ok !== true)
    throw new Error('Não foi possível liberar as sessões do Chrome.');
}
