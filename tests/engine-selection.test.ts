import { describe, expect, it, vi } from 'vitest';
import { selectEngine } from '../src/extension/offscreen/engine-selection';
import { DEFAULT_PREFERENCES, parsePreferences } from '../src/shared/preferences';
import type { BoundRequest } from '../src/shared/protocol';
import type { AvailabilityQuery, EngineAvailability } from '../src/shared/suggestion';
import { binding } from './fixtures';
import { RequestRouter } from '../src/extension/background/router';
import type { Engine } from '../src/extension/background/router';
import type { ClientEvent } from '../src/shared/protocol';

const request: BoundRequest = {
  ...binding,
  text: 'Texto sintético.',
  action: 'corrigir',
};
function hosts(state: EngineAvailability = { state: 'ready', nativeAvailability: 'available' }) {
  const native = {
    model: {
      availability: vi.fn<(query: AvailabilityQuery) => Promise<EngineAvailability>>(() =>
        Promise.resolve(state),
      ),
    },
    prepare: vi.fn(),
    send: vi.fn(),
    reset: vi.fn(),
  };
  native.prepare.mockResolvedValue(native);
  const worker = { send: vi.fn(), reset: vi.fn() };
  const local = { ensure: vi.fn(() => Promise.resolve(worker)), reset: vi.fn() };
  return { native, local, worker };
}
describe('seleção anterior à única geração', () => {
  it('migra v1/v2/v3 preservando modelo e separa motor v4', () => {
    expect(
      parsePreferences({ version: 3, profile: 'qualidade', engine: 'webllm', theme: 'dark' }),
    ).toEqual({ ...DEFAULT_PREFERENCES, profile: 'qualidade', theme: 'dark' });
    expect(parsePreferences({ version: 4, profile: 'equilibrado', engine: 'webllm' })).toEqual({
      ...DEFAULT_PREFERENCES,
      profile: 'equilibrado',
      engine: 'local',
    });
    expect(parsePreferences({ version: 4, engine: 'remote', prompt: 'não salvar' })).toEqual(
      DEFAULT_PREFERENCES,
    );
  });
  it('Chrome pronto é preparado sem gerar; encerra Worker antes de carregar', async () => {
    const h = hosts();
    const signal = new AbortController().signal;
    expect(await selectEngine(request, signal, DEFAULT_PREFERENCES, h.native, h.local)).toBe(
      h.native,
    );
    expect(h.local.reset).toHaveBeenCalledOnce();
    expect(h.local.ensure).not.toHaveBeenCalled();
    expect(h.native.prepare).toHaveBeenCalledWith(
      { action: 'corrigir', language: 'pt-BR' },
      signal,
      request,
    );
    expect(h.native.send).not.toHaveBeenCalled();
  });
  it('português por prompt exige escolha explícita e consulta/cria a mesma configuração', async () => {
    expect(DEFAULT_PREFERENCES.chromePortuguesePrompt).toBe(false);
    expect(
      parsePreferences({ version: 3, chromePortuguesePrompt: true }).chromePortuguesePrompt,
    ).toBe(false);
    const selected = parsePreferences({ version: 4, chromePortuguesePrompt: true });
    const h = hosts();
    await selectEngine(request, new AbortController().signal, selected, h.native, h.local);
    expect(h.native.model.availability).toHaveBeenCalledWith({
      action: 'corrigir',
      language: 'pt-BR',
      chromePortuguesePrompt: true,
    });
    expect(h.native.prepare.mock.calls[0]?.[0]).toEqual(
      h.native.model.availability.mock.calls[0]?.[0],
    );
  });
  it.each([
    { state: 'unavailable' },
    { state: 'requires-initialization', nativeAvailability: 'downloadable' },
    { state: 'requires-initialization', nativeAvailability: 'downloading' },
  ] as EngineAvailability[])(
    'idioma/API não pronta escolhe local sem create/download (%j)',
    async (state) => {
      const h = hosts(state);
      expect(
        await selectEngine(
          request,
          new AbortController().signal,
          DEFAULT_PREFERENCES,
          h.native,
          h.local,
        ),
      ).toBe(h.worker);
      expect(h.native.prepare).not.toHaveBeenCalled();
      expect(h.native.reset).toHaveBeenCalledOnce();
    },
  );
  it('escolha manual e prova do modelo local não consultam Chrome', async () => {
    const h = hosts();
    const signal = new AbortController().signal;
    await selectEngine(
      request,
      signal,
      { ...DEFAULT_PREFERENCES, engine: 'local' },
      h.native,
      h.local,
    );
    await selectEngine(
      { ...request, action: 'prova-modelo' },
      signal,
      DEFAULT_PREFERENCES,
      h.native,
      h.local,
    );
    expect(h.native.model.availability).not.toHaveBeenCalled();
  });
  it('create recusado antes de gerar usa local; abort nunca inicia alternativa', async () => {
    const h = hosts();
    h.native.prepare.mockRejectedValue(new DOMException('opções', 'NotSupportedError'));
    expect(
      await selectEngine(
        request,
        new AbortController().signal,
        DEFAULT_PREFERENCES,
        h.native,
        h.local,
      ),
    ).toBe(h.worker);
    const abort = new AbortController();
    abort.abort();
    const next = hosts();
    await expect(
      selectEngine(request, abort.signal, DEFAULT_PREFERENCES, next.native, next.local),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(next.local.ensure).not.toHaveBeenCalled();
    expect(next.native.prepare).not.toHaveBeenCalled();
  });
  it('falha depois de start encerra sem replay ou troca de motor', async () => {
    const h = hosts();
    const events: ClientEvent[] = [];
    const router = new RequestRouter((value, signal) =>
      selectEngine(value, signal, DEFAULT_PREFERENCES, h.native, h.local),
    );
    const peer = { origin: binding.origin, send: (value: ClientEvent) => events.push(value) };
    router.receive(peer, {
      type: 'start',
      key: binding.key,
      text: request.text,
      action: 'corrigir',
    });
    for (let i = 0; i < 12; i++) await Promise.resolve();
    expect(h.native.send).toHaveBeenCalledOnce();
    router.receiveEngine({
      type: 'action-rejected',
      binding,
      action: 'corrigir',
      code: 'NATIVE_QUOTA',
    });
    expect(events.at(-1)).toMatchObject({ type: 'action-rejected', code: 'NATIVE_QUOTA' });
    expect(h.local.ensure).not.toHaveBeenCalled();
    expect(h.native.send).toHaveBeenCalledOnce();
  });
  it('cancelamento durante seleção aborta preparação e descarta retorno atrasado', async () => {
    let preparation: AbortSignal | undefined;
    let complete: ((value: Engine) => void) | undefined;
    const engine = { send: vi.fn(), reset: vi.fn() };
    const router = new RequestRouter((_request, signal) => {
      preparation = signal;
      return new Promise((resolve) => {
        complete = resolve;
      });
    });
    const events: ClientEvent[] = [];
    const peer = { origin: binding.origin, send: (value: ClientEvent) => events.push(value) };
    router.receive(peer, {
      type: 'start',
      key: binding.key,
      text: request.text,
      action: 'corrigir',
    });
    for (let i = 0; i < 8; i++) await Promise.resolve();
    router.receive(peer, { type: 'cancel', key: binding.key });
    expect(preparation?.aborted).toBe(true);
    complete?.(engine);
    for (let i = 0; i < 3; i++) await Promise.resolve();
    expect(events.at(-1)?.type).toBe('cancelled');
    expect(engine.send).not.toHaveBeenCalled();
  });
});
