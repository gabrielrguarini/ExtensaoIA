import { fields, record } from '../../shared/protocol';
import {
  contentOrigin,
  isExtensionPage,
  isWhatsAppUrl,
  isSettingsPage,
} from '../../shared/senders';
import { isDiagnosticCommand } from '../../shared/diagnostic';
import type { DiagnosticCommand, Probe } from '../../shared/diagnostic';
import { OffscreenHost } from './offscreen-host';
import { isPreferenceCommand } from '../../shared/preferences';
import { readPreferences, updatePreferences, migratePreferences } from './preferences';

const host = new OffscreenHost();

chrome.runtime.onInstalled.addListener(() => {
  void migratePreferences();
});
chrome.runtime.onStartup.addListener(() => {
  void migratePreferences();
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
  if (
    record(value) &&
    fields(value, ['target', 'type']) &&
    value.target === 'local-engine' &&
    value.type === 'prepare'
  ) {
    if (
      !contentOrigin(sender, chrome.runtime.id, crypto.randomUUID()) &&
      !isSettingsPage(sender, chrome.runtime.id)
    )
      return false;
    void host.ensure().then(
      () => sendResponse({ ready: true }),
      () => sendResponse({ error: 'UNAVAILABLE' }),
    );
    return true;
  }
  if (isPreferenceCommand(value)) {
    if (
      !contentOrigin(sender, chrome.runtime.id, crypto.randomUUID()) &&
      !isSettingsPage(sender, chrome.runtime.id) &&
      !(value.type === 'get' && isExtensionPage(sender, chrome.runtime.id, 'offscreen.html'))
    )
      return false;
    const operation =
      value.type === 'get'
        ? migratePreferences()
        : (async () => {
            const previous = await readPreferences();
            const patch =
              value.type === 'set'
                ? { semanticReview: value.semanticReview }
                : value.type === 'profile'
                  ? { profile: value.profile }
                  : value.patch;
            const saved = await updatePreferences(patch);
            if (
              saved.profile !== previous.profile ||
              saved.engine !== previous.engine ||
              saved.chromePortuguesePrompt !== previous.chromePortuguesePrompt
            )
              await host.reset();
            return saved;
          })();
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
