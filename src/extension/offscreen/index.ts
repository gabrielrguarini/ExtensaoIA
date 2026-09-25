import { ENGINE_PORT, fields, isEngineCommand, isEngineEvent, record } from '../../shared/protocol';
import { isCoordinator } from '../../shared/senders';

let connection: { port: chrome.runtime.Port; worker: Worker } | undefined;

function connect(replace = false): void {
  if (connection && !replace) return;
  if (connection) {
    connection.worker.terminate();
    connection.port.disconnect();
    connection = undefined;
  }
  const port = chrome.runtime.connect({ name: ENGINE_PORT });
  let worker: Worker;
  try {
    worker = new Worker(new URL('../ai/worker.ts', import.meta.url), { type: 'module' });
  } catch {
    port.disconnect();
    return;
  }
  connection = { port, worker };
  function cleanup(): void {
    worker.terminate();
    if (connection?.port === port) connection = undefined;
  }
  port.onMessage.addListener((value: unknown) => {
    if (connection?.port === port && isEngineCommand(value)) worker.postMessage(value);
  });
  worker.onmessage = (event: MessageEvent<unknown>) => {
    if (connection?.port !== port || !isEngineEvent(event.data)) return;
    try {
      port.postMessage(event.data);
    } catch {
      cleanup();
    }
  };
  worker.onerror = (event) => {
    event.preventDefault();
    cleanup();
    port.disconnect();
  };
  worker.onmessageerror = () => {
    cleanup();
    port.disconnect();
  };
  port.onDisconnect.addListener(() => {
    void chrome.runtime.lastError;
    cleanup();
  });
}

chrome.runtime.onMessage.addListener((value: unknown, sender, sendResponse) => {
  if (
    !isCoordinator(sender, chrome.runtime.id) ||
    !record(value) ||
    !fields(value, ['target', 'type']) ||
    value.target !== 'offscreen' ||
    value.type !== 'connect'
  )
    return false;
  connect(true);
  sendResponse({ connected: true });
  return false;
});
connect();
