import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RequestRouter } from '../src/extension/background/router';
import type { Client, Engine } from '../src/extension/background/router';
import { SimulatedEngine } from '../src/extension/ai/simulated-engine';
import type { ClientEvent, EngineCommand, Origin } from '../src/shared/protocol';
import { binding, start } from './fixtures';

function client(origin: Origin = binding.origin) {
  const events: ClientEvent[] = [];
  const peer: Client = {
    origin,
    send: (event) => {
      events.push(event);
    },
  };
  return { peer, events };
}
function harness() {
  const sent: EngineCommand[] = [];
  const engine: Engine = {
    send: (value) => {
      sent.push(value);
    },
    reset: vi.fn(),
  };
  const ensure = vi.fn(() => Promise.resolve(engine));
  const router = new RequestRouter(ensure, 2_000);
  return { router, engine, sent, ensure };
}
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('roteamento sem mistura de abas, documentos e revisões', () => {
  it('remoção do cache cancela pedido, bloqueia novos pedidos e descarta resposta antiga', async () => {
    const { router, ensure } = harness();
    const a = client();
    router.receive(a.peer, start);
    await Promise.resolve();
    router.setMaintenance(true);
    expect(a.events.at(-1)).toEqual({ type: 'cancelled', binding });
    router.receiveEngine({ type: 'result', binding, text: 'ATRASADO', simulated: true });
    expect(a.events.at(-1)?.type).toBe('cancelled');
    const next = { ...start, key: { ...start.key, requestId: 'novo' } };
    router.receive(a.peer, next);
    expect(a.events.at(-1)).toMatchObject({ type: 'rejected', code: 'BUSY' });
    expect(ensure).toHaveBeenCalledOnce();
    router.setMaintenance(false);
    router.receive(a.peer, next);
    await Promise.resolve();
    expect(ensure).toHaveBeenCalledTimes(2);
  });
  it('recusa confirmação de download de um perfil antigo antes de criar o motor', async () => {
    const ensure = vi.fn();
    const router = new RequestRouter(
      ensure,
      2_000,
      () => Promise.resolve(false),
      () => Promise.resolve('qualidade'),
    );
    const a = client();
    router.receive(a.peer, {
      ...start,
      action: 'corrigir',
      allowDownload: true,
      expectedProfile: 'equilibrado',
    });
    for (let i = 0; i < 4; i++) await Promise.resolve();
    expect(a.events.at(-1)).toEqual({ type: 'cancelled', binding });
    expect(ensure).not.toHaveBeenCalled();
    router.receive(a.peer, { ...start, allowDownload: true });
    expect(a.events.at(-1)).toMatchObject({ type: 'rejected', code: 'INVALID_MESSAGE' });
  });
  it('cancela o pedido atual e reinicia o Worker ao trocar perfil', async () => {
    const { router, engine, sent } = harness();
    const a = client();
    router.receive(a.peer, start);
    await Promise.resolve();
    router.resetForProfileChange();
    expect(a.events.at(-1)).toEqual({ type: 'cancelled', binding });
    expect(engine.reset).toHaveBeenCalledOnce();
    router.receiveEngine({ type: 'result', binding, text: 'ATRASADO', simulated: true });
    expect(a.events.at(-1)?.type).toBe('cancelled');
    router.receive(a.peer, { ...start, key: { ...start.key, requestId: 'novo-pedido' } });
    await Promise.resolve();
    expect(sent).toHaveLength(2);
  });

  it('usa a preferência do coordenador em cada ação e falha fechado se ela não puder ser lida', async () => {
    const sent: EngineCommand[] = [];
    const engine: Engine = { send: (value) => sent.push(value), reset: vi.fn() };
    const preference = vi.fn(() => Promise.resolve(true));
    const router = new RequestRouter(
      () => Promise.resolve(engine),
      2_000,
      preference,
      () => Promise.resolve('economico'),
      () => Promise.resolve({ preserveSlang: false, addEmojis: true }),
    );
    const a = client();
    router.receive(a.peer, { ...start, action: 'corrigir' });
    for (let i = 0; i < 4; i++) await Promise.resolve();
    expect(preference).toHaveBeenCalledOnce();
    expect(sent.at(-1)).toMatchObject({
      type: 'start',
      request: {
        action: 'corrigir',
        semanticReview: true,
        writingOptions: { preserveSlang: false, addEmojis: true },
      },
    });
    router.disconnect(a.peer);

    const unavailable = new RequestRouter(
      () => Promise.resolve(engine),
      2_000,
      () => Promise.reject(new Error('storage indisponível')),
    );
    const b = client();
    unavailable.receive(b.peer, { ...start, action: 'formal' });
    for (let i = 0; i < 4; i++) await Promise.resolve();
    expect(b.events.at(-1)).toMatchObject({ type: 'error', code: 'UNAVAILABLE' });
    expect(sent).toHaveLength(1);
  });

  it('encerra uma correção reprovada sem liberar resultado ou manter o motor ocupado', async () => {
    const { router } = harness();
    const a = client();
    router.receive(a.peer, { ...start, action: 'corrigir' });
    await Promise.resolve();
    router.receiveEngine({
      type: 'action-rejected',
      binding,
      action: 'corrigir',
      code: 'PRESERVATION_RISK',
    });
    expect(a.events.at(-1)).toEqual({
      type: 'action-rejected',
      binding,
      action: 'corrigir',
      code: 'PRESERVATION_RISK',
    });
    router.receiveEngine({ type: 'action-result', binding, action: 'corrigir', text: 'Atrasado' });
    router.receive(a.peer, { type: 'status' });
    expect(a.events.at(-1)).toEqual({ type: 'status', state: 'idle', simulated: true });
  });

  it('não encaminha resultado de outro modo com o mesmo vínculo', async () => {
    const { router } = harness();
    const a = client();
    router.receive(a.peer, { ...start, action: 'formal' });
    await Promise.resolve();
    router.receiveEngine({
      type: 'action-result',
      binding,
      action: 'profissional',
      text: 'Outro modo',
    });
    router.receiveEngine({
      type: 'action-fragment',
      binding,
      action: 'profissional',
      text: 'Trecho de outro modo',
    });
    router.receiveEngine({
      type: 'action-rejected',
      binding,
      action: 'conciso',
      code: 'PRESERVATION_RISK',
    });
    expect(a.events).toHaveLength(1);
    router.receiveEngine({
      type: 'action-result',
      binding,
      action: 'formal',
      text: 'Resultado correto',
    });
    expect(a.events.at(-1)).toMatchObject({ type: 'action-result', action: 'formal' });
  });

  it('reserva o pedido antes da preparação assíncrona e informa ocupado sem vazar conteúdo', async () => {
    const { router, sent, ensure } = harness();
    const a = client();
    const b = client({
      ...binding.origin,
      tabId: 2,
      documentId: 'document-b',
      connectionId: 'connection-b',
    });
    router.receive(a.peer, start);
    router.receive(b.peer, start);
    router.receive(b.peer, { type: 'status' });
    await Promise.resolve();
    expect(ensure).toHaveBeenCalledTimes(1);
    expect(sent).toEqual([
      {
        type: 'start',
        request: {
          ...binding,
          text: start.text,
          action: 'simular',
          semanticReview: false,
          profile: 'economico',
          allowDownload: false,
        },
      },
    ]);
    expect(b.events).toEqual([
      { type: 'rejected', code: 'BUSY', key: start.key },
      { type: 'status', state: 'busy', simulated: true },
    ]);
    router.receiveEngine({ type: 'result', binding, text: 'Resultado A', simulated: true });
    expect(a.events.at(-1)?.type).toBe('result');
    expect(JSON.stringify(b.events)).not.toContain('Resultado A');
    router.receive(b.peer, start);
    await Promise.resolve();
    const second = sent.at(-1);
    expect(second?.type === 'start' && second.request.origin).toEqual(b.peer.origin);
    router.disconnect(b.peer);
  });

  it('descarta mensagens atrasadas ou com qualquer vínculo divergente', async () => {
    const { router } = harness();
    const a = client();
    router.receive(a.peer, start);
    await Promise.resolve();
    const invalidBindings = [
      { ...binding, key: { ...binding.key, requestId: 'other' } },
      { ...binding, key: { ...binding.key, editorId: 'other' } },
      { ...binding, key: { ...binding.key, snapshotId: 'other' } },
      { ...binding, key: { ...binding.key, revision: 2 } },
      { ...binding, origin: { ...binding.origin, tabId: 2 } },
      { ...binding, origin: { ...binding.origin, documentId: 'other' } },
      { ...binding, origin: { ...binding.origin, connectionId: 'other' } },
    ];
    for (const other of invalidBindings)
      router.receiveEngine({
        type: 'result',
        binding: other,
        text: 'NÃO ACEITAR',
        simulated: true,
      });
    router.receiveEngine({ type: 'result', binding, text: '', simulated: true });
    expect(a.events).toHaveLength(1);
    router.receiveEngine({ type: 'result', binding, text: 'ok', simulated: true });
    router.receiveEngine({ type: 'fragment', binding, text: 'ATRASADO' });
    expect(a.events).toHaveLength(2);
  });

  it('recusa cancelamento de outra conexão e ignora resultado em trânsito após cancelar', async () => {
    const { router, sent } = harness();
    const a = client();
    const b = client();
    router.receive(a.peer, start);
    await Promise.resolve();
    router.receive(b.peer, { type: 'cancel', key: start.key });
    expect(b.events.at(-1)).toEqual({ type: 'rejected', code: 'UNKNOWN_REQUEST', key: start.key });
    router.receive(a.peer, { type: 'cancel', key: start.key });
    expect(sent.at(-1)).toEqual({ type: 'cancel', binding });
    router.receiveEngine({ type: 'result', binding, text: 'ATRASADO', simulated: true });
    expect(a.events).toHaveLength(1);
    router.receiveEngine({ type: 'cancelled', binding });
    expect(a.events.at(-1)?.type).toBe('cancelled');
  });

  it('encaminha apenas trechos do pedido ativo e descarta tudo após cancelar', async () => {
    const { router, sent } = harness();
    const a = client();
    const b = client({ ...binding.origin, tabId: 2, documentId: 'doc-b' });
    router.receive(a.peer, { ...start, action: 'formal' });
    for (let i = 0; i < 4; i++) await Promise.resolve();
    router.receiveEngine({ type: 'action-fragment', binding, action: 'formal', text: 'Trecho A' });
    router.receiveEngine({
      type: 'action-fragment',
      binding: { ...binding, key: { ...binding.key, revision: 2 } },
      action: 'formal',
      text: 'Trecho obsoleto',
    });
    expect(a.events.at(-1)).toMatchObject({ type: 'action-fragment', text: 'Trecho A' });
    expect(b.events).toHaveLength(0);
    router.receive(a.peer, { type: 'cancel', key: start.key });
    expect(sent.at(-1)).toEqual({ type: 'cancel', binding });
    router.receiveEngine({ type: 'action-fragment', binding, action: 'formal', text: 'Atrasado' });
    router.receiveEngine({ type: 'action-result', binding, action: 'formal', text: 'Atrasado' });
    router.receiveEngine({ type: 'cancelled', binding });
    expect(a.events.map((event) => event.type)).toEqual([
      'progress',
      'action-fragment',
      'cancelled',
    ]);
    router.receive(b.peer, { ...start, action: 'conciso' });
    await Promise.resolve();
    await Promise.resolve();
    router.receiveEngine({
      type: 'action-fragment',
      binding,
      action: 'formal',
      text: 'Muito tarde',
    });
    expect(b.events).toHaveLength(1);
    router.disconnect(b.peer);
  });

  it('cancelamento e desconexão durante preparação impedem o envio futuro', async () => {
    const { router, sent } = harness();
    const a = client();
    const b = client();
    router.receive(a.peer, start);
    router.receive(a.peer, { type: 'cancel', key: start.key });
    router.receive(b.peer, start);
    router.disconnect(b.peer);
    await Promise.resolve();
    expect(sent).toHaveLength(0);
    expect(a.events.at(-1)?.type).toBe('cancelled');
  });

  it('desconexão termina o motor antes de liberar outra origem e descarta o pedido antigo', async () => {
    const { router, engine } = harness();
    const a = client();
    router.receive(a.peer, start);
    await Promise.resolve();
    router.disconnect(a.peer);
    expect(engine.reset).toHaveBeenCalledOnce();
    router.receiveEngine({ type: 'result', binding, text: 'ATRASADO', simulated: true });
    expect(a.events).toHaveLength(1);
  });

  it('reinício do coordenador não adota respostas da sessão anterior', () => {
    const { router, ensure } = harness();
    const a = client();
    router.receiveEngine({ type: 'result', binding, text: 'antigo', simulated: true });
    router.receive(a.peer, { type: 'status' });
    expect(a.events).toEqual([{ type: 'status', state: 'idle', simulated: true }]);
    expect(ensure).not.toHaveBeenCalled();
  });

  it('falha, desconexão e timeout são terminais sem replay automático', async () => {
    const { router, engine, ensure } = harness();
    const a = client();
    ensure.mockRejectedValueOnce(new Error('Falha técnica não deve ser exposta'));
    router.receive(a.peer, start);
    await Promise.resolve();
    expect(a.events.at(-1)).toEqual({ type: 'error', binding, code: 'UNAVAILABLE' });
    const b = client();
    router.receive(b.peer, start);
    await Promise.resolve();
    router.engineLost();
    expect(b.events.at(-1)).toEqual({ type: 'error', binding, code: 'DISCONNECTED' });
    const c = client();
    router.receive(c.peer, start);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(c.events.at(-1)).toEqual({ type: 'error', binding, code: 'TIMEOUT' });
    expect(engine.reset).toHaveBeenCalledOnce();
    expect(ensure).toHaveBeenCalledTimes(3);
  });

  it('recusa payload arbitrário e reutilização de identificador no mesmo cliente', async () => {
    const { router } = harness();
    const a = client();
    router.receive(a.peer, { ...start, tabId: 99 });
    expect(a.events.at(-1)).toEqual({ type: 'rejected', code: 'INVALID_MESSAGE', key: null });
    router.receive(a.peer, start);
    await Promise.resolve();
    router.receiveEngine({ type: 'result', binding, text: 'ok', simulated: true });
    router.receive(a.peer, start);
    expect(a.events.at(-1)).toEqual({ type: 'rejected', code: 'INVALID_MESSAGE', key: start.key });
  });
});

describe('motor simulado e coordenador integrados', () => {
  it('devolve progresso, fragmento e eco Unicode ao único solicitante', async () => {
    const simulator = new SimulatedEngine((event) => {
      router.receiveEngine(event);
    });
    const router = new RequestRouter(() =>
      Promise.resolve({
        send: (command) => {
          simulator.receive(command);
        },
        reset: () => {
          simulator.dispose();
        },
      }),
    );
    const a = client();
    router.receive(a.peer, start);
    await vi.advanceTimersByTimeAsync(1_200);
    expect(a.events.map((event) => event.type)).toEqual([
      'progress',
      'progress',
      'fragment',
      'progress',
      'result',
    ]);
    expect(a.events.at(-1)).toEqual({ type: 'result', binding, text: start.text, simulated: true });
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cancelar realmente elimina os timers do simulador e os fragmentos futuros', async () => {
    const events: unknown[] = [];
    const simulator = new SimulatedEngine((event) => {
      events.push(event);
    });
    simulator.receive({
      type: 'start',
      request: { ...binding, text: 'Teste', action: 'simular', semanticReview: false },
    });
    simulator.receive({ type: 'cancel', binding });
    await vi.advanceTimersByTimeAsync(2_000);
    expect(events).toEqual([
      { type: 'progress', binding, percent: 25 },
      { type: 'cancelled', binding },
    ]);
    expect(vi.getTimerCount()).toBe(0);
  });
});
