import { CLIENT_PORT } from '../../shared/protocol';

type MessageListener = (value: unknown) => void;
type DisconnectListener = () => void;

/** Buffer apenas até criar o documento; nunca reconecta ou repete um pedido enviado. */
export function connectClient() {
  let port: chrome.runtime.Port | undefined;
  let closed = false;
  const pending: unknown[] = [];
  const messages = new Set<MessageListener>();
  const disconnects = new Set<DisconnectListener>();
  const receive = (value: unknown) => messages.forEach((listener) => listener(value));
  const lost = () => {
    if (closed) return;
    closed = true;
    pending.length = 0;
    disconnects.forEach((listener) => listener());
  };
  void chrome.runtime
    .sendMessage({ target: 'local-engine', type: 'prepare' })
    .then((response: unknown) => {
      if (closed) return;
      if (
        typeof response !== 'object' ||
        response === null ||
        !('ready' in response) ||
        response.ready !== true
      )
        throw new Error('Contexto local indisponível.');
      port = chrome.runtime.connect({ name: CLIENT_PORT });
      port.onMessage.addListener(receive);
      port.onDisconnect.addListener(lost);
      for (const command of pending) port.postMessage(command);
      pending.length = 0;
    })
    .catch(lost);
  return {
    postMessage(value: unknown): void {
      if (closed) throw new Error('Conexão encerrada.');
      if (port) port.postMessage(value);
      else if (pending.length < 2) pending.push(value);
      else throw new Error('Preparação ocupada.');
    },
    disconnect(): void {
      closed = true;
      pending.length = 0;
      port?.onMessage.removeListener(receive);
      port?.onDisconnect.removeListener(lost);
      port?.disconnect();
      messages.clear();
      disconnects.clear();
    },
    onMessage: {
      addListener: (listener: MessageListener) => messages.add(listener),
      removeListener: (listener: MessageListener) => messages.delete(listener),
    },
    onDisconnect: {
      addListener: (listener: DisconnectListener) => disconnects.add(listener),
      removeListener: (listener: DisconnectListener) => disconnects.delete(listener),
    },
  };
}
