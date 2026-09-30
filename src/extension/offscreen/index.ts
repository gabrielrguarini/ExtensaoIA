import { CLIENT_PORT, fields, record } from '../../shared/protocol';
import { contentOrigin, isCoordinator } from '../../shared/senders';
import { parsePreferences } from '../../shared/preferences';
import { RequestRouter } from '../background/router';
import type { Client } from '../background/router';
import { WorkerHost } from './worker-host';

async function preferences() {
  const value: unknown = await chrome.runtime.sendMessage({ target: 'preferences', type: 'get' });
  if (value === undefined) throw new Error('Preferências indisponíveis.');
  return parsePreferences(value);
}
const host = new WorkerHost(
  () => new Worker(new URL('../ai/worker.ts', import.meta.url), { type: 'module' }),
  (event) => router.receiveEngine(event),
  () => router.engineLost(),
);
const router = new RequestRouter(
  () => host.ensure(),
  15_000,
  async () => (await preferences()).semanticReview,
  async () => (await preferences()).profile,
);

// Canal direto. O Service Worker pode dormir sem encerrar a inferência ativa.
chrome.runtime.onConnect.addListener((port) => {
  const origin = contentOrigin(port.sender, chrome.runtime.id, crypto.randomUUID());
  if (port.name !== CLIENT_PORT || !origin) {
    port.disconnect();
    return;
  }
  let connected = true;
  const client: Client = {
    origin,
    send: (event) => {
      if (!connected) return;
      try {
        port.postMessage(event);
      } catch {
        connected = false;
        router.disconnect(client);
      }
    },
  };
  port.onMessage.addListener((value: unknown) => {
    if (connected) router.receive(client, value);
  });
  port.onDisconnect.addListener(() => {
    void chrome.runtime.lastError;
    connected = false;
    router.disconnect(client);
  });
});

chrome.runtime.onMessage.addListener((value: unknown, sender, sendResponse) => {
  if (
    !isCoordinator(sender, chrome.runtime.id) ||
    !record(value) ||
    !fields(value, ['target', 'type']) ||
    value.target !== 'offscreen'
  )
    return false;
  if (value.type === 'ready') sendResponse({ ready: true });
  else if (value.type === 'reset') {
    router.resetForProfileChange();
    host.reset();
    sendResponse({ reset: true });
  }
  return false;
});
