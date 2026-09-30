import { CLIENT_PORT, fields, record } from '../../shared/protocol';
import { contentOrigin, isCoordinator } from '../../shared/senders';
import { parsePreferences } from '../../shared/preferences';
import { RequestRouter } from '../background/router';
import type { Client } from '../background/router';
import { WorkerHost } from './worker-host';
import { MODEL_CHOICES, MODEL_PROFILES } from '../ai/model-catalog';
import { removeModelArtifacts } from '../ai/model-cache';

let removing = false;

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
    record(value) &&
    fields(value, ['target', 'type', 'profile', 'variant']) &&
    value.target === 'model-cache' &&
    value.type === 'remove' &&
    typeof value.profile === 'string' &&
    MODEL_PROFILES.some((profile) => profile === value.profile) &&
    (value.variant === 'q4f16_1' || value.variant === 'q4f32_1') &&
    contentOrigin(sender, chrome.runtime.id, crypto.randomUUID())
  ) {
    if (removing) {
      sendResponse({ ok: false });
      return false;
    }
    removing = true;
    router.setMaintenance(true);
    host.reset();
    const profile = value.profile as keyof typeof MODEL_CHOICES;
    const variant = value.variant;
    void (async () => {
      try {
        if ((await preferences()).profile !== profile) throw new Error('Perfil alterado.');
        await removeModelArtifacts(MODEL_CHOICES[profile][variant]);
        sendResponse({ ok: true });
      } catch {
        sendResponse({ ok: false });
      } finally {
        removing = false;
        router.setMaintenance(false);
      }
    })();
    return true;
  }
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
