import { describe, expect, it } from 'vitest';
import { comparisonSummary } from './benchmark/comparison-summary';
import type { ComparisonRecord, ComparisonReview } from './benchmark/comparison-summary';
const record: ComparisonRecord = {
  type: 'case',
  profile: 'gemma',
  round: 1,
  id: 'A',
  action: 'corrigir',
  status: 'accepted',
  executionComplete: true,
  raw: 'Texto.',
  output: 'Texto.',
  totalMs: 50,
  firstVisibleMs: 10,
  assessment: { status: 'changed', risks: [{ code: 'entities', message: 'nomes' }] },
};
const review: ComparisonReview = {
  profile: 'gemma',
  round: 1,
  id: 'A',
  resultSha256: 'a'.repeat(64),
  preserved: true,
  entitiesExact: true,
  grammatical: true,
  natural: true,
  languagePtBr: true,
  actionUseful: true,
  correctWarnings: [],
  missedRisk: false,
  notes: 'A alteração preserva os fatos; aviso de capitalização é indevido.',
};
const summary = (rows: ComparisonRecord[], reviews: ComparisonReview[] = []) =>
  comparisonSummary(rows, reviews, ['gemma', 'chrome-prompt'], 3, ['A', 'B'], {
    A: 'corrigir',
    B: 'formal',
  });
describe('relatório comparável com denominadores e revisão independente', () => {
  it('mantém casos, rodadas e ações sem resultados como pendentes; não inventa qualidade', () => {
    const value = summary([record]);
    expect(value.expected).toBe(12);
    expect(value.pending).toBe(11);
    expect(value.byCandidate.gemma!.usefulPercentOfAll).toBeNull();
    expect(value.byCandidate['chrome-prompt']!.byAction.formal!.pending).toBe(3);
    expect(value.byCandidate['chrome-prompt']!.totalMs.median).toBeNull();
  });
  it('separa aviso indevido de preservação, utilidade, erro e risco não sinalizado', () => {
    const value = summary(
      [
        record,
        {
          ...record,
          id: 'B',
          action: 'formal',
          status: 'generation-error',
          output: null,
          totalMs: 1,
        },
      ],
      [review],
    );
    expect(value.byCandidate.gemma!.useful).toBe(1);
    expect(value.byCandidate.gemma!.undueWarnings).toBe(1);
    expect(value.byCandidate.gemma!.totalMs.median).toBe(50);
    expect(value.byCandidate.gemma!.errors).toBe(1);
    expect(value.byCandidate.gemma!.usefulPercentOfAll).toBeNull();
    const unsafe = summary(
      [record],
      [{ ...review, preserved: false, correctWarnings: [0], missedRisk: true }],
    );
    expect(unsafe.byCandidate.gemma!.useful).toBe(0);
    expect(unsafe.byCandidate.gemma!.missedRisks).toBe(1);
    const refused = summary([
      { ...record, status: 'rejected', output: null, error: 'Error: PRESERVATION_RISK' },
    ]);
    expect(refused.byCandidate.gemma!.unavailableSuggestions).toBe(1);
    expect(refused.byCandidate.gemma!.preservationRejections).toBe(1);
    expect(refused.byCandidate.gemma!.errors).toBe(0);
  });
  it('recusa IDs repetidos, ações trocadas, revisões sem saída e índices de aviso inválidos', () => {
    expect(() => summary([record, record])).toThrow();
    expect(() => summary([{ ...record, action: 'formal' }])).toThrow();
    expect(() => summary([{ ...record, output: '   ' }])).toThrow();
    expect(() => summary([{ ...record, status: 'pending' }])).toThrow();
    expect(() => summary([], [review])).toThrow();
    expect(() => summary([record], [{ ...review, correctWarnings: [1] }])).toThrow();
  });
  it('conta saídas idênticas do pipeline sem avisos e não as confunde com transformação útil', () => {
    const value = comparisonSummary(
      [{ ...record, assessment: null }],
      [review],
      ['gemma'],
      1,
      ['A'],
      { A: 'corrigir' },
      { A: 'Texto.' },
    );
    expect(value.byCandidate.gemma!.unchanged).toBe(1);
    expect(value.byCandidate.gemma!.useful).toBe(0);
    expect(value.byCandidate.gemma!.usefulPercentOfAll).toBe(0);
  });
});
