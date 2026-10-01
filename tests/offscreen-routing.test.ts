import { suggestionMetadata } from './fixtures';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLIENT_PORT, isEngineCommand } from '../src/shared/protocol';
import type { Binding } from '../src/shared/protocol';

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const sender = {
  id: 'extension',
  url: 'https://web.whatsapp.com/',
  origin: 'https://web.whatsapp.com',
  frameId: 0,
  documentId: 'doc-a',
  tab: { id: 1 },
};
const key = { requestId: 'req-a', editorId: 'ed-a', snapshotId: 'snap-a', revision: 1 };
const start = {
  type: 'start',
  key,
  text: 'texto sintético',
  action: 'corrigir',
  expectedProfile: 'equilibrado',
};
function peer(source = sender) {
  const messages = new Set<(value: unknown) => void>();
  const disconnects = new Set<() => void>();
  const post = vi.fn();
  const disconnect = vi.fn();
  const port = {
    name: CLIENT_PORT,
    sender: source,
    postMessage: post,
    disconnect,
    onMessage: { addListener: (fn: (value: unknown) => void) => messages.add(fn) },
    onDisconnect: { addListener: (fn: () => void) => disconnects.add(fn) },
  } as unknown as chrome.runtime.Port;
  return {
    port,
    post,
    disconnect,
    receive: (value: unknown) => {
      messages.forEach((fn) => fn(value));
    },
    lost: () => {
      disconnects.forEach((fn) => fn());
    },
  };
}
async function harness() {
  const connections: ((port: chrome.runtime.Port) => void)[] = [];
  const controls: ((
    value: unknown,
    sender: chrome.runtime.MessageSender,
    reply: (value: unknown) => void,
  ) => boolean)[] = [];
  class TestWorker {
    postMessage = vi.fn();
    terminate = vi.fn();
    onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
    onmessageerror: (() => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;
    constructor() {
      workers.push(this);
    }
  }
  const workers: TestWorker[] = [];
  const preferences = vi.fn(() =>
    Promise.resolve<unknown>({ version: 2, profile: 'equilibrado', semanticReview: false }),
  );
  vi.stubGlobal('Worker', TestWorker);
  vi.stubGlobal('chrome', {
    runtime: {
      id: 'extension',
      lastError: undefined,
      onConnect: { addListener: (fn: (port: chrome.runtime.Port) => void) => connections.push(fn) },
      onMessage: {
        addListener: (
          fn: (
            value: unknown,
            sender: chrome.runtime.MessageSender,
            reply: (value: unknown) => void,
          ) => boolean,
        ) => controls.push(fn),
      },
      sendMessage: preferences,
    },
  });
  await import('../src/extension/offscreen/index');
  return { accept: connections[0]!, control: controls[0]!, workers, preferences };
}
async function ready(h: Awaited<ReturnType<typeof harness>>) {
  await vi.advanceTimersByTimeAsync(0);
  const worker = h.workers[0]!;
  worker.onmessage?.({ data: { type: 'ready', simulated: true } } as MessageEvent<unknown>);
  await vi.advanceTimersByTimeAsync(0);
  const command: unknown = worker.postMessage.mock.calls[0]?.[0];
  if (!isEngineCommand(command) || command.type !== 'start')
    throw new Error('Pedido não iniciado.');
  const binding: Binding = { key: command.request.key, origin: command.request.origin };
  return { worker, command, binding };
}
describe('roteamento no documento offscreen', () => {
  it('restringe remoção à origem autorizada, catálogo e perfil atual; bloqueia geração durante remoção', async () => {
    const h = await harness();
    const source = sender as unknown as chrome.runtime.MessageSender;
    const open = vi.fn((name: string) => {
      expect(name).toBeTypeOf('string');
      return Promise.resolve({ keys: () => Promise.resolve([]) });
    });
    vi.stubGlobal('caches', { open });
    const command = {
      target: 'model-cache',
      type: 'remove',
      profile: 'equilibrado',
      variant: 'q4f16_1',
    };
    const reply = vi.fn();
    expect(h.control(command, { ...source, origin: 'https://example.com' }, reply)).toBe(false);
    expect(h.control({ ...command, url: 'https://example.com' }, source, reply)).toBe(false);
    expect(h.control({ ...command, profile: 'externo' }, source, reply)).toBe(false);
    expect(open).not.toHaveBeenCalled();
    expect(h.control({ ...command, profile: 'economico' }, source, reply)).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(reply).toHaveBeenLastCalledWith({ ok: false });
    expect(open).not.toHaveBeenCalled();
    expect(h.control(command, source, reply)).toBe(true);
    const a = peer();
    h.accept(a.port);
    a.receive(start);
    expect(a.post).toHaveBeenLastCalledWith({ type: 'rejected', code: 'BUSY', key });
    await vi.advanceTimersByTimeAsync(0);
    expect(reply).toHaveBeenLastCalledWith({ ok: true });
    expect(open.mock.calls.map((args) => args[0])).toEqual([
      'webllm/model',
      'webllm/config',
      'local-writing/artifact-integrity-v1',
    ]);
  });
  it('recusa remetente/frame incorretos e deriva a origem do remetente confiável', async () => {
    const h = await harness();
    const wrong = peer({ ...sender, origin: 'https://example.com' });
    h.accept(wrong.port);
    expect(wrong.disconnect).toHaveBeenCalledOnce();
    const frame = peer({ ...sender, frameId: 1 });
    h.accept(frame.port);
    expect(frame.disconnect).toHaveBeenCalledOnce();
    const a = peer();
    h.accept(a.port);
    a.receive(start);
    const { command } = await ready(h);
    expect(command.request).toMatchObject({
      profile: 'equilibrado',
      semanticReview: false,
      origin: { tabId: 1, frameId: 0, documentId: 'doc-a' },
    });
    expect(h.preferences).toHaveBeenCalledWith({ target: 'preferences', type: 'get' });
    a.lost();
  });
  it('continua após 45 segundos sem eventos; mantém exclusão entre abas e cancela na desconexão real', async () => {
    const h = await harness();
    const a = peer();
    const b = peer({ ...sender, documentId: 'doc-b', tab: { id: 2 } });
    h.accept(a.port);
    h.accept(b.port);
    a.receive(start);
    const { worker, binding } = await ready(h);
    await vi.advanceTimersByTimeAsync(45_000);
    expect(worker.terminate).not.toHaveBeenCalled();
    b.receive({ ...start, key: { ...key, requestId: 'req-b' } });
    expect(b.post).toHaveBeenLastCalledWith({
      type: 'rejected',
      code: 'BUSY',
      key: { ...key, requestId: 'req-b' },
    });
    a.lost();
    expect(worker.terminate).toHaveBeenCalledOnce();
    worker.onmessage?.({
      data: {
        type: 'action-result',
        ...suggestionMetadata,
        binding,
        action: 'corrigir',
        text: 'texto atrasado',
      },
    } as MessageEvent<unknown>);
    expect(b.post).toHaveBeenCalledOnce();
  });
  it('falha fechado sem preferências e aceita reset somente do coordenador', async () => {
    const h = await harness();
    h.preferences.mockResolvedValue(undefined);
    const a = peer();
    h.accept(a.port);
    a.receive(start);
    await vi.advanceTimersByTimeAsync(0);
    expect(a.post).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'error', code: 'UNAVAILABLE' }),
    );
    expect(h.workers).toHaveLength(0);
    const reply = vi.fn();
    h.control({ target: 'offscreen', type: 'reset' }, { id: sender.id, url: sender.url }, reply);
    expect(reply).not.toHaveBeenCalled();
    h.control({ target: 'offscreen', type: 'reset' }, { id: 'extension' }, reply);
    expect(reply).toHaveBeenCalledWith({ reset: true });
    a.lost();
  });
});
