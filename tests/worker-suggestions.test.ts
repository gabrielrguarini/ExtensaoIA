import { afterEach, describe, expect, it, vi } from 'vitest';
import { binding, suggestionMetadata } from './fixtures';
import type { EngineEvent, EngineCommand } from '../src/shared/protocol';
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
    start(command: EngineCommand) {
      receive?.({ data: command } as MessageEvent<unknown>);
    },
  };
}
async function settled() {
  for (let i = 0; i < 30; i++) await Promise.resolve();
}
describe('produto gera uma vez e revisa somente sob demanda', () => {
  it('texto original e resposta com riscos são liberados, mesmo com preferência antiga ligada', async () => {
    const w = await worker();
    h.output = 'Envie R$ 50 para Maria.';
    w.start({
      type: 'start',
      request: {
        ...binding,
        action: 'corrigir',
        text: 'Não envie R$ 25 para João.',
        semanticReview: true,
      },
    });
    await settled();
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0]?.text).toBe('Não envie R$ 25 para João.');
    const terminal = w.events.at(-1);
    expect(terminal).toMatchObject({ type: 'action-result', text: h.output });
    if (terminal?.type !== 'action-result') throw new Error('Resultado ausente.');
    expect(terminal.assessment.semanticReview).toBe('not-requested');
    expect(terminal.assessment.risks.some(({ code }) => code === 'negation')).toBe(true);
  });
  it('revisão explícita retorna avisos mantendo a sugestão', async () => {
    const w = await worker();
    h.output = '{"valid":false,"meaningPreserved":false,"issues":["Fato alterado"]}';
    w.start({
      type: 'start',
      request: {
        ...binding,
        action: 'revisar-sentido',
        text: 'Pode revisar?',
        suggestion: 'Vou cancelar.',
        semanticReview: false,
      },
    });
    await settled();
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0]?.options?.task).toBe('semantic-review');
    const terminal = w.events.at(-1);
    expect(terminal).toMatchObject({ type: 'review-result', text: 'Vou cancelar.' });
    if (terminal?.type !== 'review-result') throw new Error('Revisão ausente.');
    expect(terminal.assessment.semanticReview).toBe('completed');
    expect(terminal.assessment.risks).toContainEqual({
      code: 'semantic',
      message: 'Fato alterado',
    });
  });
  it('revisão ilegível vira aviso, saída vazia continua erro técnico', async () => {
    const w = await worker();
    h.output = 'sem JSON';
    w.start({
      type: 'start',
      request: {
        ...binding,
        action: 'revisar-sentido',
        text: 'Original.',
        suggestion: 'Sugestão.',
        semanticReview: false,
      },
    });
    await settled();
    expect(w.events.at(-1)).toMatchObject({
      type: 'review-result',
      assessment: { semanticReview: 'unavailable' },
    });
    h.output = '';
    w.start({
      type: 'start',
      request: { ...binding, action: 'natural', text: 'Original.', semanticReview: false },
    });
    await settled();
    expect(w.events.at(-1)).toMatchObject({ type: 'action-rejected', code: 'EMPTY_OUTPUT' });
  });
  it('cancelamento durante inferência não libera a resposta', async () => {
    const w = await worker();
    h.output = 'Sugestão.';
    w.start({
      type: 'start',
      request: { ...binding, action: 'corrigir', text: 'Original.', semanticReview: false },
    });
    w.start({ type: 'cancel', binding });
    await settled();
    expect(w.events.at(-1)?.type).toBe('cancelled');
    expect(w.events.some((event) => event.type === 'action-result')).toBe(false);
  });
});
