import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OffscreenHost } from '../src/extension/background/offscreen-host';
import { ENGINE_PORT } from '../src/shared/protocol';

function fakePort(url = 'chrome-extension://extension/offscreen.html') {
  const messages = new Set<(value: unknown) => void>();
  const disconnects = new Set<() => void>();
  const disconnect = vi.fn();
  const postMessage = vi.fn();
  // Somente a superfície usada por OffscreenHost. O Chrome real continua sendo validação separada.
  const port = {
    name: ENGINE_PORT,
    sender: { id: 'extension', url },
    postMessage,
    disconnect,
    onMessage: { addListener: (fn: (value: unknown) => void) => messages.add(fn) },
    onDisconnect: { addListener: (fn: () => void) => disconnects.add(fn) },
  } as unknown as chrome.runtime.Port;
  return {
    port,
    disconnect,
    postMessage,
    ready: () => {
      messages.forEach((fn) => {
        fn({ type: 'ready', simulated: true });
      });
    },
    lost: () => {
      disconnects.forEach((fn) => {
        fn();
      });
    },
  };
}
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function harness(existing = false) {
  const peer = fakePort();
  const lost = vi.fn();
  const host = new OffscreenHost(vi.fn(), lost);
  const attach = () => {
    host.accept(peer.port);
    peer.ready();
    return Promise.resolve();
  };
  const create = vi.fn(attach);
  const reconnect = vi.fn(attach);
  vi.stubGlobal('chrome', {
    runtime: {
      id: 'extension',
      ContextType: { OFFSCREEN_DOCUMENT: 'OFFSCREEN_DOCUMENT' },
      getURL: (file: string) => `chrome-extension://extension/${file}`,
      getContexts: vi.fn(() => Promise.resolve(existing ? [{}] : [])),
      sendMessage: reconnect,
    },
    offscreen: { Reason: { WORKERS: 'WORKERS' }, createDocument: create },
  });
  return { peer, host, create, reconnect, lost };
}

describe('criação e reconexão do contexto offscreen', () => {
  it('compartilha a criação e aguarda o Worker estar pronto', async () => {
    const { host, create, peer } = harness();
    const first = host.ensure();
    const second = host.ensure();
    expect(first).toBe(second);
    const engine = await first;
    await host.ensure();
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ reasons: ['WORKERS'], url: 'offscreen.html' }),
    );
    engine.reset();
    expect(peer.disconnect).toHaveBeenCalledOnce();
  });
  it('reconecta a um documento existente após reiniciar sem criar outro ou repetir texto', async () => {
    const { host, create, reconnect, peer } = harness(true);
    await host.ensure();
    expect(create).not.toHaveBeenCalled();
    expect(reconnect).toHaveBeenCalledWith({ target: 'offscreen', type: 'connect' });
    expect(peer.postMessage).not.toHaveBeenCalled();
  });
  it('recusa remetente incorreto e conexão duplicada sem alterar o motor ativo', async () => {
    const { host, peer } = harness();
    const wrong = fakePort('https://web.whatsapp.com/');
    host.accept(wrong.port);
    expect(wrong.disconnect).toHaveBeenCalledOnce();
    await host.ensure();
    const duplicate = fakePort();
    host.accept(duplicate.port);
    expect(duplicate.disconnect).toHaveBeenCalledOnce();
    expect(peer.disconnect).not.toHaveBeenCalled();
  });
  it('propaga a perda do motor e falha de preparação sem rejeição não tratada', async () => {
    const { host, peer, lost, create } = harness();
    await host.ensure();
    peer.lost();
    expect(lost).toHaveBeenCalledOnce();
    create.mockRejectedValueOnce(new Error('Indisponível'));
    await expect(host.ensure()).rejects.toThrow('Indisponível');
    await vi.runAllTimersAsync();
  });
  it('encerra a espera quando o Worker não confirma prontidão', async () => {
    const { host, create } = harness();
    create.mockImplementationOnce(() => Promise.resolve());
    const result = host.ensure();
    const assertion = expect(result).rejects.toThrow('Motor local indisponível');
    await vi.advanceTimersByTimeAsync(5_000);
    await assertion;
  });
});
