import { describe, expect, it } from 'vitest';
import { assessSuggestion, suggestionResult } from '../src/extension/ai/suggestion-assessment';
import { CorrectionOutputError } from '../src/extension/ai/correction-output';
import { isRiskAssessment } from '../src/shared/suggestion';
import { actionMessages, legacySystemPromptFor } from '../src/extension/ai/correction-prompt';
import { suggestionMetadata } from './fixtures';

describe('sugestões legíveis com avisos', () => {
  it('libera nomes, datas, valores e intenção alterados com avisos específicos', () => {
    const result = suggestionResult(
      'Não envie R$ 25 para João até 15/10?',
      'Envie R$ 50 para Maria em 16/10.',
      suggestionMetadata.engine,
    );
    expect(result.text).toBe('Envie R$ 50 para Maria em 16/10.');
    expect(result.assessment.risks.map((risk) => risk.message).join(' ')).toMatch(
      /valores.*nomes|nomes.*valores/u,
    );
    expect(result.assessment.risks.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['entities', 'negation', 'intent']),
    );
    expect(isRiskAssessment(result.assessment)).toBe(true);
  });
  it('detecta inversão de papéis, omissões e acréscimos sem bloquear texto', () => {
    expect(
      assessSuggestion('João enviou o arquivo para Maria.', 'Maria enviou o arquivo para João.')
        .assessment.risks,
    ).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'intent' })]));
    expect(
      assessSuggestion(
        'Talvez eu consiga enviar o arquivo se você confirmar no grupo.',
        'Tudo certo.',
      ).assessment.risks,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'intent' }),
        expect.objectContaining({ code: 'length' }),
      ]),
    );
    expect(
      assessSuggestion('Olá!', 'Claro, aqui está: ```texto legível```').assessment.risks,
    ).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'format' })]));
  });
  it('separa erros técnicos, sem alterações e emojis permitidos', () => {
    for (const [input, code] of [
      ['  ', 'EMPTY_OUTPUT'],
      ['\u200b\u200e', 'EMPTY_OUTPUT'],
      ['\uD800', 'INVALID_OUTPUT'],
      ['a'.repeat(8001), 'INVALID_OUTPUT'],
    ] as const)
      expect(() => assessSuggestion('original', input)).toThrow(new CorrectionOutputError(code));
    expect(
      assessSuggestion('Pergunta?', 'O texto final é: Pergunta?').assessment.risks.some(
        ({ code }) => code === 'format',
      ),
    ).toBe(true);
    expect(assessSuggestion('Claro, obrigado!', 'Claro, obrigado!').assessment.risks).toEqual([]);
    expect(assessSuggestion('Pode revisar? 🙂', 'Pode revisar? 🙂').assessment).toEqual({
      status: 'unchanged',
      risks: [],
      semanticReview: 'not-requested',
    });
    expect(
      assessSuggestion('Pode revisar? 🙂', 'Pode revisar? 🙂 😄', true).assessment.risks,
    ).toEqual([]);
    expect(
      assessSuggestion('Pode revisar? 🙂', 'Pode revisar? 😄', true).assessment.risks.some(
        ({ code }) => code === 'entities',
      ),
    ).toBe(true);
    expect(
      assessSuggestion('Pode mandar hj?', 'Pode mandar hoje?').assessment.risks.some(
        ({ code }) => code === 'entities',
      ),
    ).toBe(false);
  });
  it('mantém texto literal e prompt original, com legado acessível somente por opção', () => {
    expect(actionMessages('formal', 'João, ENTITY_001 é um código literal.')[1]?.content).toBe(
      'João, ENTITY_001 é um código literal.',
    );
    expect(actionMessages('corrigir', 'original')[0]?.content).not.toContain('ENTITY_');
    expect(actionMessages('formal', 'ENTITY_001', undefined, 'legacy-protected')[0]?.content).toBe(
      legacySystemPromptFor('formal'),
    );
  });
});
