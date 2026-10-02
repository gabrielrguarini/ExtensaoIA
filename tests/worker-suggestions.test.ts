import { afterEach, describe, expect, it, vi } from 'vitest';
import { binding, suggestionMetadata } from './fixtures';
import type { EngineEvent } from '../src/shared/protocol';
import type { GenerateOptions } from '../src/extension/ai/ai-engine';
const h = vi.hoisted(() => ({
  output: '',
  calls: [] as { text: string; options?: GenerateOptions }[],
}));
vi.mock('../src/extension/ai/webllm-engine', () => ({
  ModelEnvironmentError: class extends Error {},
  WebLLMEngine: class {
    async initialize() {
      await Promise.resolve();
    }
    selectedVariant() {
      return 'q4f16_1';
    }
    identity() {
      return suggestionMetadata.engine;
    }
    async unload() {
      await Promise.resolve();
    }
    async *generate(text: string, options?: GenerateOptions) {
      h.calls.push({ text, ...(options ? { options } : {}) });
      await Promise.resolve();
      yield h.output;
    }
  },
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  h.calls = [];
});
async function worker() {
  const events: EngineEvent[] = [];
  let receive: ((event: MessageEvent<unknown>) => void) | undefined;
  vi.stubGlobal('postMessage', (event: EngineEvent) => events.push(event));
  vi.stubGlobal('addEventListener', (_type: string, listener: typeof receive) => {
    receive = listener;
  });
  await import('../src/extension/ai/worker');
  return {
    events,
    start(command: unknown) {
      receive?.({ data: command } as MessageEvent<unknown>);
    },
  };
}
async function settled() {
  for (let i = 0; i < 30; i++) await Promise.resolve();
}
describe('produto gera uma vez sem avaliação de conteúdo', () => {
  it.each([
    [
      'fazendo o teste da extensao apra ver se funciona de verdade',
      'Fazendo o teste da extensão pra ver se funciona de verdade.',
      'changed',
    ],
    ['Não envie R$ 25 para João.', 'Envie R$ 50 para Maria.', 'changed'],
    ['Pode revisar? 🙂', 'Pode revisar? 🙂', 'unchanged'],
  ])('libera resposta legível para decisão manual: caso %#', async (original, output, status) => {
    const w = await worker();
    h.output = output;
    w.start({ type: 'start', request: { ...binding, action: 'corrigir', text: original } });
    await settled();
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0]?.text).toBe(original);
    expect(w.events.at(-1)).toEqual({
      type: 'action-result',
      binding,
      action: 'corrigir',
      text: output,
      engine: suggestionMetadata.engine,
      status,
    });
  });
  it.each([
    ['', 'EMPTY_OUTPUT'],
    ['\u200b', 'EMPTY_OUTPUT'],
    ['\ud800', 'INVALID_OUTPUT'],
    ['x'.repeat(8001), 'INVALID_OUTPUT'],
  ])('mantém erro técnico para resposta inutilizável: caso %#', async (output, code) => {
    const w = await worker();
    h.output = output;
    w.start({ type: 'start', request: { ...binding, action: 'natural', text: 'Original.' } });
    await settled();
    expect(w.events.at(-1)).toMatchObject({ type: 'action-rejected', code });
    expect(h.calls).toHaveLength(1);
  });
  it('recusa a análise removida e comandos antigos antes de gerar', async () => {
    const w = await worker();
    w.start({
      type: 'start',
      request: {
        ...binding,
        action: 'revisar-sentido',
        text: 'Original.',
        suggestion: 'Sugestão.',
      },
    });
    w.start({
      type: 'start',
      request: { ...binding, action: 'corrigir', text: 'Original.', semanticReview: true },
    });
    await settled();
    expect(h.calls).toHaveLength(0);
    expect(w.events.filter((event) => event.type !== 'ready')).toEqual([]);
  });
  it('cancelamento durante inferência não libera a resposta', async () => {
    const w = await worker();
    h.output = 'Sugestão.';
    w.start({ type: 'start', request: { ...binding, action: 'corrigir', text: 'Original.' } });
    w.start({ type: 'cancel', binding });
    await settled();
    expect(w.events.at(-1)?.type).toBe('cancelled');
    expect(w.events.some((event) => event.type === 'action-result')).toBe(false);
  });
});
