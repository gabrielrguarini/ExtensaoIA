import { describe, expect, it, vi } from 'vitest';
import { protectDraft } from '../src/extension/ai/entities';
import { validateActionOutput } from '../src/extension/ai/action-validation';
import {
  parseSemanticReview,
  reviewSuggestion,
  semanticApproved,
  semanticInput,
  SemanticReviewError,
} from '../src/extension/ai/semantic-review';
import type { AIEngine } from '../src/extension/ai/ai-engine';

const approved = '{"valid":true,"meaningPreserved":true,"issues":[],"entitiesPreserved":true}';
const rejected = '{"valid":false,"meaningPreserved":false,"issues":["Fato alterado"]}';

function model(output: string) {
  const generate = vi.fn<AIEngine['generate']>(async function* () {
    await Promise.resolve();
    yield output.slice(0, 15);
    yield output.slice(15);
  });
  return { generate };
}

describe('contrato da revisão semântica', () => {
  it('aceita somente JSON coerente e ignora confidence como garantia', () => {
    expect(semanticApproved(parseSemanticReview(approved))).toBe(true);
    expect(
      semanticApproved(
        parseSemanticReview('{"valid":true,"meaningPreserved":true,"issues":[],"confidence":0.99}'),
      ),
    ).toBe(true);
    expect(
      semanticApproved(
        parseSemanticReview(
          '{"valid":true,"meaningPreserved":true,"issues":[],"entitiesPreserved":false}',
        ),
      ),
    ).toBe(false);
    expect(() =>
      parseSemanticReview('{"valid":true,"meaningPreserved":false,"issues":[]}'),
    ).toThrow();
    expect(() =>
      parseSemanticReview('{"valid":true,"meaningPreserved":true,"issues":["Risco"]}'),
    ).toThrow();
    expect(() => parseSemanticReview('```json\n' + approved + '\n```')).toThrow();
    expect(() => parseSemanticReview('{"valid":1,"meaningPreserved":true,"issues":[]}')).toThrow();
    expect(() => parseSemanticReview('')).toThrow();
  });

  it('envia original e sugestão como dados separados e reprova mudança de sentido', async () => {
    const cases = [
      ['Envie 2 arquivos.', 'Envie 3 arquivos.'],
      ['Você pode enviar o arquivo?', 'Você pode enviar o arquivo.'],
      ['Não cancele a reunião.', 'Cancele a reunião.'],
      ['Cancele a reunião.', 'Não cancele a reunião.'],
      ['João enviou 2 arquivos.', 'João recebeu 2 arquivos.'],
    ];
    for (const [original, suggestion] of cases) {
      const fake = model(rejected);
      await expect(
        reviewSuggestion(fake, original!, suggestion!, new AbortController().signal),
      ).rejects.toMatchObject({ code: 'SEMANTIC_RISK' });
      const call = fake.generate.mock.calls[0];
      expect(call?.[0]).toBe(semanticInput(original!, suggestion!));
      expect(call?.[1]?.signal).toBeInstanceOf(AbortSignal);
      expect(call?.[1]?.task).toBe('semantic-review');
    }
  });

  it('reprova ausência, formato inválido, erro e cancelamento', async () => {
    for (const output of ['', 'talvez', '{"valid":true}'])
      await expect(
        reviewSuggestion(model(output), 'original', 'sugestão', new AbortController().signal),
      ).rejects.toMatchObject({ code: 'SEMANTIC_INVALID' });
    const failed: Pick<AIEngine, 'generate'> = {
      async *generate() {
        await Promise.resolve();
        yield 'partial';
        throw new Error('falha do runtime');
      },
    };
    await expect(
      reviewSuggestion(failed, 'original', 'sugestão', new AbortController().signal),
    ).rejects.toMatchObject({ code: 'SEMANTIC_INVALID' });
    const controller = new AbortController();
    const cancelled: Pick<AIEngine, 'generate'> = {
      async *generate() {
        await Promise.resolve();
        controller.abort(new Error('cancelado'));
        yield approved;
      },
    };
    await expect(
      reviewSuggestion(cancelled, 'original', 'sugestão', controller.signal),
    ).rejects.toThrow('cancelado');
  });
});

describe('ordem de liberação da sugestão', () => {
  const original = 'vc consegue me mandar o relatório hj?';
  const suggestion = 'Você consegue me mandar o relatório hoje?';
  it('não executa segunda geração com a opção desligada', async () => {
    const fake = model(approved);
    const onReview = vi.fn();
    await expect(
      validateActionOutput(
        protectDraft(original),
        suggestion,
        original,
        false,
        fake,
        new AbortController().signal,
        onReview,
      ),
    ).resolves.toBe(suggestion);
    expect(fake.generate).not.toHaveBeenCalled();
    expect(onReview).not.toHaveBeenCalled();
  });

  it('chama a revisão apenas depois das guardas determinísticas', async () => {
    const fake = model(approved);
    const onReview = vi.fn();
    const protectedDraft = protectDraft('Não envie hoje.');
    await expect(
      validateActionOutput(
        protectedDraft,
        'Envie ENTITY_001.',
        'Não envie hoje.',
        true,
        fake,
        new AbortController().signal,
        onReview,
      ),
    ).rejects.toThrow();
    expect(fake.generate).not.toHaveBeenCalled();
    expect(onReview).not.toHaveBeenCalled();
  });

  it('só libera após a resposta semântica válida', async () => {
    const fake = model(approved);
    const onReview = vi.fn();
    await expect(
      validateActionOutput(
        protectDraft(original),
        suggestion,
        original,
        true,
        fake,
        new AbortController().signal,
        onReview,
      ),
    ).resolves.toBe(suggestion);
    expect(onReview).toHaveBeenCalledOnce();
    expect(fake.generate).toHaveBeenCalledOnce();
    await expect(
      validateActionOutput(
        protectDraft(original),
        suggestion,
        original,
        true,
        model(rejected),
        new AbortController().signal,
        vi.fn(),
      ),
    ).rejects.toBeInstanceOf(SemanticReviewError);
  });
});
