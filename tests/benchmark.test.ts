import { describe, expect, it } from 'vitest';
import { BENCHMARK_CASES } from './benchmark/cases';
import { distribution, summarize } from './benchmark/aggregate';
import type { CaseResult, Review } from './benchmark/aggregate';

const result: CaseResult = {
  type: 'case',
  profile: 'economico',
  id: 'one',
  action: 'corrigir',
  status: 'accepted',
  output: 'Texto.',
  raw: 'Texto.',
  error: null,
  firstVisibleMs: 10,
  generationMs: 20,
  totalMs: 21,
  metrics: null,
};
const review: Review = {
  profile: 'economico',
  id: 'one',
  rawPreserves: true,
  rawFormatComplete: true,
  releasedPreserves: true,
  grammatical: true,
  natural: true,
  actionUseful: true,
  notes: 'Caso sintético revisado.',
};

describe('benchmark sintético e denominadores', () => {
  it('define 108 pares anotados, 12 por ação, cobrindo todas as categorias antes da geração', () => {
    expect(BENCHMARK_CASES).toHaveLength(108);
    expect(new Set(BENCHMARK_CASES.map((item) => item.id)).size).toBe(108);
    expect(new Set(BENCHMARK_CASES.map((item) => item.action)).size).toBe(9);
    const categories = new Set<string>(BENCHMARK_CASES.flatMap((item) => [...item.categories]));
    for (const category of [
      'informal',
      'profissional',
      'curto',
      'longo',
      'girias',
      'abreviacoes',
      'numeros',
      'datas',
      'urls',
      'emojis',
      'negativas',
      'nomes',
      'valores',
    ])
      expect(categories.has(category)).toBe(true);
    for (const item of BENCHMARK_CASES) {
      expect(item.facts.length).toBeGreaterThan(0);
      expect(item.intention.length).toBeGreaterThan(10);
      expect(item.grammar.length).toBeGreaterThan(10);
      expect(item.naturalness.length).toBeGreaterThan(10);
      expect(BENCHMARK_CASES.filter((row) => row.action === item.action)).toHaveLength(12);
    }
  });
  it('inclui recusa e incompatibilidade no denominador e informa métricas indisponíveis', () => {
    const rows: CaseResult[] = [
      result,
      { ...result, id: 'two', status: 'rejected', output: null },
      {
        ...result,
        id: 'three',
        status: 'load-error',
        output: null,
        totalMs: null,
        firstVisibleMs: null,
      },
    ];
    const reviews = [
      review,
      { ...review, id: 'two', releasedPreserves: null },
      {
        ...review,
        id: 'three',
        releasedPreserves: null,
        rawPreserves: null,
        rawFormatComplete: false,
      },
    ];
    const summary = summarize(rows, reviews, ['one', 'two', 'three']);
    expect(summary.denominator).toBe(3);
    expect(summary.usefulReleasedPercentOfAll).toBeCloseTo(100 / 3);
    expect(summary.totalMs.unavailable).toBe(1);
    expect(summary.falsePositives).toEqual(['two']);
    expect(
      summarize(
        [{ ...result, executionComplete: false, status: 'generation-error', output: null }],
        [{ ...review, releasedPreserves: null }],
        ['one'],
      ).acceptancePasses,
    ).toBe(false);
  });
  it('reprova aceite quando revisão encontra fato alterado em saída liberada', () => {
    const summary = summarize([result], [{ ...review, releasedPreserves: false }], ['one']);
    expect(summary.acceptancePasses).toBe(false);
    expect(summary.falseNegatives).toEqual(['one']);
    expect(summary.safeReleased).toBe(0);
    expect(summary.usefulReleased).toBe(0);
  });
  it('recusa descarte de caso difícil, duplicação ou revisão ausente', () => {
    expect(() => summarize([result], [review], ['one', 'two'])).toThrow('Denominador');
    expect(() => summarize([result, result], [review, review], ['one', 'two'])).toThrow(
      'Denominador',
    );
    expect(() => summarize([result], [], ['one'])).toThrow('Revisão');
    expect(() => summarize([result], [{ ...review, releasedPreserves: null }], ['one'])).toThrow(
      'Revisão',
    );
  });
  it('não transforma medida ausente ou não finita em desempenho zero', () => {
    expect(distribution([null, Number.NaN, 10, 20], 4)).toEqual({
      denominator: 4,
      measured: 2,
      unavailable: 2,
      median: 10,
      p95: 20,
    });
  });
});
