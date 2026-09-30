import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateAction } from '../src/extension/content/action-client';
import type { DraftSnapshot } from '../src/integration/whatsapp/adapter';
import type { Binding } from '../src/shared/protocol';

const snapshot: DraftSnapshot = {
  editorId: 'editor-a',
  snapshotId: 'snapshot-a',
  revision: 1,
  text: 'texto sintético hoje',
  replacementAllowed: true,
};

function portHarness() {
  const messages: unknown[] = [];
  const listeners = new Set<(value: unknown) => void>();
  const disconnectListeners = new Set<() => void>();
  const port = {
    postMessage: (value: unknown) => messages.push(value),
    disconnect: vi.fn(),
    onMessage: {
      addListener: (listener: (value: unknown) => void) => listeners.add(listener),
      removeListener: (listener: (value: unknown) => void) => listeners.delete(listener),
    },
    onDisconnect: {
      addListener: (listener: () => void) => disconnectListeners.add(listener),
      removeListener: (listener: () => void) => disconnectListeners.delete(listener),
    },
  };
  vi.stubGlobal('chrome', {
    runtime: {
      connect: () => port,
      sendMessage: () => Promise.resolve({ ready: true }),
      lastError: undefined,
    },
  });
  const emit = (value: unknown) => listeners.forEach((listener) => listener(value));
  const disconnect = () => disconnectListeners.forEach((listener) => listener());
  return { messages, port, emit, disconnect };
}

function bound(messages: unknown[]): Binding {
  const command = messages[0] as { key: Binding['key'] };
  return {
    key: command.key,
    origin: { tabId: 1, frameId: 0, documentId: 'doc-a', connectionId: 'conn-a' },
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('cliente de ação com streaming', () => {
  it('aceita só fragmentos vinculados ao modo e mantém a porta até a confirmação do cancelamento', async () => {
    const h = portHarness();
    const fragments: string[] = [];
    const done = vi.fn();
    const cancel = generateAction(
      'formal',
      snapshot,
      vi.fn(),
      (text) => fragments.push(text),
      done,
    );
    await Promise.resolve();
    const binding = bound(h.messages);
    h.emit({ type: 'action-fragment', binding, action: 'profissional', text: 'Outro modo' });
    h.emit({ type: 'action-fragment', binding, action: 'formal', text: 'Trecho seguro' });
    expect(fragments).toEqual(['Trecho seguro']);
    cancel();
    expect(h.messages.at(-1)).toEqual({ type: 'cancel', key: binding.key });
    expect(h.port.disconnect).not.toHaveBeenCalled();
    h.emit({ type: 'action-fragment', binding, action: 'formal', text: 'Atrasado' });
    h.emit({ type: 'cancelled', binding });
    expect(fragments).toEqual(['Trecho seguro']);
    expect(done).not.toHaveBeenCalled();
    expect(h.port.disconnect).toHaveBeenCalledOnce();
  });

  it('força encerramento após cancelamento sem confirmação e ignora desconexão tardia', async () => {
    const h = portHarness();
    const done = vi.fn();
    const cancel = generateAction('corrigir', snapshot, vi.fn(), vi.fn(), done);
    await Promise.resolve();
    cancel();
    await vi.advanceTimersByTimeAsync(2_000);
    h.disconnect();
    expect(h.port.disconnect).toHaveBeenCalledOnce();
    expect(done).not.toHaveBeenCalled();
  });
});
