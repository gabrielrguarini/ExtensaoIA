import { isClientEvent, sameBinding, sameKey } from '../../shared/protocol';
import { connectClient } from './client-port';
import type { Binding, ClientEvent, RequestKey } from '../../shared/protocol';
import { FIXTURE_TEXT, isProbe } from '../../shared/diagnostic';
import { isCoordinator } from '../../shared/senders';

// Nenhum seletor, leitura do editor, acesso ao mundo MAIN ou ponte window.postMessage.
let active: { port: ReturnType<typeof connectClient>; key: RequestKey; close(): void } | undefined;

function run(statusOnly: boolean, reply: (value: unknown) => void): void {
  const port = connectClient();
  const key: RequestKey = {
    requestId: crypto.randomUUID(),
    editorId: 'synthetic-editor',
    snapshotId: crypto.randomUUID(),
    revision: 1,
  };
  const events: ClientEvent[] = [];
  let finished = false;
  let receivedBinding: Binding | undefined;
  const timer = setTimeout(() => {
    events.push({ type: 'rejected', code: 'TIMEOUT', key });
    finish();
  }, 20_000);
  function finish(): void {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    if (active?.port === port) active = undefined;
    port.disconnect();
    reply({ events });
  }
  function disconnected(): void {
    if (finished) return;
    events.push({ type: 'rejected', code: 'DISCONNECTED', key });
    finish();
  }
  if (!statusOnly) active = { port, key, close: disconnected };
  port.onMessage.addListener((value: unknown) => {
    if (finished || !isClientEvent(value)) return;
    if ('binding' in value && !sameKey(value.binding.key, key)) return;
    if ('binding' in value) {
      if (receivedBinding && !sameBinding(value.binding, receivedBinding)) return;
      receivedBinding = value.binding;
    }
    if (value.type === 'rejected' && value.key !== null && !sameKey(value.key, key)) return;
    if (events.length >= 64) {
      finish();
      return;
    }
    events.push(value);
    if (
      ['result', 'error', 'cancelled', 'rejected'].includes(value.type) ||
      (statusOnly && value.type === 'status')
    )
      finish();
  });
  port.onDisconnect.addListener(() => {
    void chrome.runtime.lastError;
    disconnected();
  });
  try {
    port.postMessage(
      statusOnly
        ? { type: 'status' }
        : { type: 'start', key, action: 'simular', text: FIXTURE_TEXT },
    );
  } catch {
    disconnected();
  }
}

chrome.runtime.onMessage.addListener((value: unknown, sender, sendResponse) => {
  if (!isCoordinator(sender, chrome.runtime.id) || !isProbe(value)) return false;
  if (value.type === 'cancel') {
    try {
      if (active) active.port.postMessage({ type: 'cancel', key: active.key });
    } catch {
      active?.close();
    }
    sendResponse({
      notice: active ? 'Cancelamento solicitado.' : 'Nenhum teste em andamento nesta aba.',
    });
    return false;
  }
  if (value.type === 'run' && active) {
    sendResponse({ events: [{ type: 'rejected', code: 'BUSY', key: null }] });
    return false;
  }
  try {
    run(value.type === 'status', sendResponse);
  } catch {
    sendResponse({ error: 'Conexão encerrada. Recarregue esta aba.' });
    return false;
  }
  return true;
});
globalThis.addEventListener('pagehide', () => {
  active?.close();
});
