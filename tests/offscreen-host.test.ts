import { afterEach, describe, expect, it, vi } from 'vitest';
import { OffscreenHost } from '../src/extension/background/offscreen-host';

afterEach(() => vi.unstubAllGlobals());

function harness(existing = false) {
  const create = vi.fn(() => Promise.resolve());
  const send = vi.fn(() => Promise.resolve({ ready: true }));
  vi.stubGlobal('chrome', {
    runtime: {
      ContextType: { OFFSCREEN_DOCUMENT: 'OFFSCREEN_DOCUMENT' },
      getURL: (file: string) => `chrome-extension://extension/${file}`,
      getContexts: vi.fn(() => Promise.resolve(existing ? [{}] : [])),
      sendMessage: send,
    },
    offscreen: { Reason: { WORKERS: 'WORKERS' }, createDocument: create },
  });
  return { host: new OffscreenHost(), create, send };
}

describe('preparação do documento sem porta do Service Worker', () => {
  it('compartilha a criação e confirma que o documento aceita conexões', async () => {
    const { host, create, send } = harness();
    const first = host.ensure();
    expect(host.ensure()).toBe(first);
    await first;
    expect(create).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ reasons: ['WORKERS'], url: 'offscreen.html' }),
    );
    expect(send).toHaveBeenCalledWith({ target: 'offscreen', type: 'ready' });
  });
  it('reutiliza o documento depois do reinício sem reiniciar seu Worker ou repetir texto', async () => {
    const { host, create, send } = harness(true);
    await host.ensure();
    expect(create).not.toHaveBeenCalled();
    expect(send.mock.calls).toEqual([[{ target: 'offscreen', type: 'ready' }]]);
  });
  it('propaga falhas de criação/prontidão e permite uma nova ação explícita', async () => {
    const { host, create, send } = harness();
    create.mockRejectedValueOnce(new Error('Indisponível'));
    await expect(host.ensure()).rejects.toThrow('Indisponível');
    send.mockResolvedValueOnce({ ready: false });
    await expect(host.ensure()).rejects.toThrow('Contexto local indisponível');
    await host.ensure();
  });
  it('a troca de perfil reinicia somente o documento existente', async () => {
    const first = harness();
    await first.host.reset();
    expect(first.send).not.toHaveBeenCalled();
    const existing = harness(true);
    await existing.host.reset();
    expect(existing.send).toHaveBeenCalledWith({ target: 'offscreen', type: 'reset' });
  });
});
