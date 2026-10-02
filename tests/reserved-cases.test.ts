import { describe, expect, it } from 'vitest';
import { RESERVED_CASES } from './benchmark/reserved-cases';
import { BENCHMARK_CASES } from './benchmark/cases';
import { WRITING_ACTIONS } from '../src/shared/actions';
describe('conjunto reservado da STEP-15-D', () => {
  it('tem 108 rascunhos distintos, anotados, sem reutilizar textos históricos', () => {
    expect(RESERVED_CASES).toHaveLength(108);
    expect(new Set(RESERVED_CASES.map((c) => c.text)).size).toBe(108);
    expect(new Set(RESERVED_CASES.map((c) => c.id)).size).toBe(108);
    const old = new Set<string>(BENCHMARK_CASES.map((c) => c.text));
    for (const c of RESERVED_CASES) {
      expect(old.has(c.text)).toBe(false);
      expect(c.facts[0]).toBeTruthy();
      expect(c.entities.every((e) => c.text.includes(e))).toBe(true);
    }
    for (const { id } of WRITING_ACTIONS)
      expect(RESERVED_CASES.filter((c) => c.action === id)).toHaveLength(12);
  });
});
