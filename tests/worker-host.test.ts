import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkerHost } from '../src/extension/offscreen/worker-host';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
function harness() {
  const terminate = vi.fn();
  const worker = {
    terminate,
    postMessage: vi.fn(),
    onmessage: null,
    onerror: null,
    onmessageerror: null,
  } as unknown as Worker;
  const create = vi.fn(() => worker);
  const events = vi.fn();
  const lost = vi.fn();
  const host = new WorkerHost(create, events, lost);
  const emit = (value: unknown) => {
    worker.onmessage?.({ data: value } as MessageEvent);
  };
  return { worker, terminate, host, create, events, lost, emit };
}
describe('Worker independente do coordenador', () => {
  it('distingue Worker pronto, GPU carregada, preparação cancelada e liberação', async () => {
    const h = harness();
    expect(h.host.runtime).toBe('released');
    const ready = h.host.ensure();
    h.emit({ type: 'ready', simulated: true });
    const engine = await ready;
    expect(h.host.runtime).toBe('worker-ready');
    const binding = {
      key: { requestId: 'req', editorId: 'ed', snapshotId: 'snap', revision: 0 },
      origin: { tabId: 1, frameId: 0, documentId: 'doc', connectionId: 'conn' },
    };
    engine.send({
      type: 'start',
      request: {
        ...binding,
        text: 'fixture',
        action: 'corrigir',
        semanticReview: false,
        profile: 'qualidade',
      },
    });
    h.emit({ type: 'model-progress', binding, phase: 'loading', percent: 50, variant: 'q4f16_1' });
    expect(h.host.runtime).toBe('loading');
    h.emit({ type: 'cancelled', binding });
    expect(h.host.runtime).toBe('worker-ready');
    expect(h.host.loadedProfile).toBeNull();
    engine.send({
      type: 'start',
      request: {
        ...binding,
        text: 'fixture',
        action: 'corrigir',
        semanticReview: false,
        profile: 'qualidade',
      },
    });
    h.emit({ type: 'model-progress', binding, phase: 'ready', percent: 100, variant: 'q4f16_1' });
    expect(h.host.runtime).toBe('loaded');
    expect(h.host.loadedProfile).toBe('qualidade');
    engine.reset();
    expect(h.host.runtime).toBe('released');
    expect(h.host.loadedProfile).toBeNull();
  });
  it('libera o Worker após cinco minutos desde o último término, nunca durante operação', async () => {
    const h = harness();
    const ready = h.host.ensure();
    h.emit({ type: 'ready', simulated: true });
    const engine = await ready;
    const binding = {
      key: { requestId: 'req', editorId: 'ed', snapshotId: 'snap', revision: 0 },
      origin: { tabId: 1, frameId: 0, documentId: 'doc', connectionId: 'conn' },
    };
    await vi.advanceTimersByTimeAsync(299_000);
    engine.send({
      type: 'start',
      request: { ...binding, text: 'teste', action: 'corrigir', semanticReview: false },
    });
    await vi.advanceTimersByTimeAsync(600_000);
    expect(h.terminate).not.toHaveBeenCalled();
    h.emit({ type: 'action-result', binding, action: 'corrigir', text: 'Teste.' });
    await vi.advanceTimersByTimeAsync(299_999);
    expect(h.terminate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(h.terminate).toHaveBeenCalledOnce();
    expect(h.lost).not.toHaveBeenCalled();
  });
  it('permanece disponível depois de 30 segundos sem eventos e reutiliza uma única instância', async () => {
    const h = harness();
    const first = h.host.ensure();
    expect(h.host.ensure()).toBe(first);
    h.emit({ type: 'ready', simulated: true });
    const engine = await first;
    await vi.advanceTimersByTimeAsync(45_000);
    expect(h.terminate).not.toHaveBeenCalled();
    expect(h.lost).not.toHaveBeenCalled();
    await h.host.ensure();
    expect(h.create).toHaveBeenCalledOnce();
    engine.reset();
    expect(h.terminate).toHaveBeenCalledOnce();
    expect(() =>
      engine.send({
        type: 'cancel',
        binding: {
          key: { requestId: 'req', editorId: 'ed', snapshotId: 'snap', revision: 0 },
          origin: { tabId: 1, frameId: 0, documentId: 'doc', connectionId: 'conn' },
        },
      }),
    ).toThrow('Motor desconectado');
  });
  it('propaga erro real do Worker e descarta mensagens de uma instância encerrada', async () => {
    const h = harness();
    const ready = h.host.ensure();
    h.emit({ type: 'ready', simulated: true });
    await ready;
    h.worker.onmessageerror?.({} as MessageEvent);
    h.emit({ type: 'ready', simulated: true });
    expect(h.terminate).toHaveBeenCalledOnce();
    expect(h.lost).toHaveBeenCalledOnce();
    expect(h.events).not.toHaveBeenCalled();
  });
  it('encerra preparação sem prontidão e permite nova tentativa explícita', async () => {
    const h = harness();
    const result = h.host.ensure();
    const assertion = expect(result).rejects.toThrow('Motor local indisponível');
    await vi.advanceTimersByTimeAsync(5_000);
    await assertion;
    expect(h.terminate).toHaveBeenCalledOnce();
    const next = h.host.ensure();
    h.emit({ type: 'ready', simulated: true });
    await next;
    expect(h.create).toHaveBeenCalledTimes(2);
  });
});
