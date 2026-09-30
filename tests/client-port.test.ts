import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectClient } from '../src/extension/content/client-port';

afterEach(() => vi.unstubAllGlobals());

function harness() {
  let resolve!: (value: unknown) => void;
  let reject!: (error: Error) => void;
  const preparation = new Promise<unknown>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  const messages = new Set<(value: unknown) => void>();
  const disconnects = new Set<() => void>();
  const peer = {
    postMessage: vi.fn(),
    disconnect: vi.fn(),
    onMessage: {
      addListener: (fn: (value: unknown) => void) => messages.add(fn),
      removeListener: (fn: (value: unknown) => void) => messages.delete(fn),
    },
    onDisconnect: {
      addListener: (fn: () => void) => disconnects.add(fn),
      removeListener: (fn: () => void) => disconnects.delete(fn),
    },
  };
  const connect = vi.fn(() => peer);
  const prepare = vi.fn(() => preparation);
  vi.stubGlobal('chrome', { runtime: { connect, sendMessage: prepare } });
  return { peer, messages, disconnects, connect, prepare, resolve, reject };
}
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('canal direto com o offscreen', () => {
  it('aguarda preparação sem expor o rascunho ao bootstrap e envia cada comando uma vez', async () => {
    const h = harness();
    const client = connectClient();
    const receive = vi.fn();
    client.onMessage.addListener(receive);
    client.postMessage({ type: 'start', text: 'rascunho sintético' });
    expect(h.connect).not.toHaveBeenCalled();
    expect(h.prepare).toHaveBeenCalledWith({ target: 'local-engine', type: 'prepare' });
    h.resolve({ ready: true });
    await flush();
    expect(h.peer.postMessage).toHaveBeenCalledOnce();
    h.messages.forEach((fn) => fn({ type: 'result' }));
    expect(receive).toHaveBeenCalledWith({ type: 'result' });
    client.disconnect();
    expect(h.peer.disconnect).toHaveBeenCalledOnce();
    expect(h.messages.size).toBe(0);
  });
  it('cancelar/fechar durante a preparação impede iniciar o Worker depois', async () => {
    const h = harness();
    const client = connectClient();
    client.postMessage({ type: 'start' });
    client.disconnect();
    h.resolve({ ready: true });
    await flush();
    expect(h.connect).not.toHaveBeenCalled();
  });
  it('falha ou desconexão termina o canal sem reconectar/repetir', async () => {
    const h = harness();
    const client = connectClient();
    const lost = vi.fn();
    client.onDisconnect.addListener(lost);
    client.postMessage({ type: 'start' });
    h.resolve({ ready: true });
    await flush();
    h.disconnects.forEach((fn) => fn());
    expect(lost).toHaveBeenCalledOnce();
    expect(h.connect).toHaveBeenCalledOnce();
    expect(() => client.postMessage({ type: 'start' })).toThrow('Conexão encerrada');
    const failed = harness();
    const second = connectClient();
    const failure = vi.fn();
    second.onDisconnect.addListener(failure);
    failed.reject(new Error('Indisponível'));
    await flush();
    expect(failure).toHaveBeenCalledOnce();
    expect(failed.connect).not.toHaveBeenCalled();
  });
});
