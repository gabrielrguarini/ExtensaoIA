import { CLIENT_PORT } from '../../shared/protocol';
import { contentOrigin, isExtensionPage, isWhatsAppUrl } from '../../shared/senders';
import { isDiagnosticCommand } from '../../shared/diagnostic';
import type { DiagnosticCommand, Probe } from '../../shared/diagnostic';
import { OffscreenHost } from './offscreen-host';
import { RequestRouter } from './router';
import type { Client } from './router';
import { isPreferenceCommand } from '../../shared/preferences';
import { readPreferences, saveProfile, saveSemanticReview } from './preferences';

const host = new OffscreenHost(
  (event) => router.receiveEngine(event),
  () => router.engineLost(),
);
const router = new RequestRouter(
  () => host.ensure(),
  15_000,
  async () => (await readPreferences()).semanticReview,
  async () => (await readPreferences()).profile,
);

chrome.runtime.onConnect.addListener((port) => {
  if (host.accept(port)) return;
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

chrome.action.onClicked.addListener(() => {
  void chrome.tabs.create({ url: chrome.runtime.getURL('diagnostic.html') });
});

async function diagnostic(command: DiagnosticCommand): Promise<unknown> {
  if (command.type === 'list') {
    const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
    // Não expor título, URL com parâmetros, conversas ou outras abas ao diagnóstico.
    return { tabs: tabs.flatMap((tab) => (tab.id === undefined ? [] : [{ id: tab.id }])) };
  }
  const tab = await chrome.tabs.get(command.tabId);
  if (!isWhatsAppUrl(tab.url)) return { error: 'A aba selecionada não é do WhatsApp Web.' };
  const probe: Probe = { target: 'probe', type: command.type };
  return chrome.tabs.sendMessage(command.tabId, probe, { frameId: 0 });
}

chrome.runtime.onMessage.addListener((value: unknown, sender, sendResponse) => {
  if (isPreferenceCommand(value)) {
    if (!contentOrigin(sender, chrome.runtime.id, crypto.randomUUID())) return false;
    const operation =
      value.type === 'get'
        ? readPreferences()
        : value.type === 'set'
          ? saveSemanticReview(value.semanticReview)
          : saveProfile(value.profile).then((saved) => {
              router.resetForProfileChange();
              host.reset();
              return saved;
            });
    void operation.then(sendResponse, () => sendResponse({ error: 'PREFERENCES_UNAVAILABLE' }));
    return true;
  }
  if (!isExtensionPage(sender, chrome.runtime.id, 'diagnostic.html')) return false;
  if (!isDiagnosticCommand(value)) {
    sendResponse({ error: 'Comando inválido.' });
    return false;
  }
  void diagnostic(value).then(sendResponse, () => {
    sendResponse({
      error: 'Conexão indisponível. Recarregue a aba do WhatsApp e tente novamente.',
    });
  });
  // Compatível com Chrome 116: não depende de listener async retornando Promise.
  return true;
});
