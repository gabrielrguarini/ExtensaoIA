import { describe, it, expect } from 'vitest';
import { completedCases, pendingBlocks } from './benchmark/checkpoint';
describe('checkpoint por caso e rodada', () => {
  it('retoma blocos até 12 sem repetir concluídos, mantendo interrupções e erros', () => {
    const ids = Array.from({ length: 27 }, (_, index) => `case-${index}`);
    const records = [
      { type: 'case', profile: 'economico', round: 1, id: ids[0]!, executionComplete: true },
      { type: 'case', profile: 'economico', round: 1, id: ids[1]!, executionComplete: false },
      { type: 'interruption', profile: 'economico', round: 1 },
    ];
    const blocks = pendingBlocks(ids, 'economico', 1, records);
    expect(blocks.map((block) => block.length)).toEqual([12, 12, 2]);
    expect(blocks.flat()).not.toContain(ids[0]);
    expect(blocks.flat()).toContain(ids[1]);
    expect(pendingBlocks(ids, 'economico', 2, records).flat()).toEqual(ids);
    expect(completedCases([...records, records[0]!]).size).toBe(1);
    expect(records[1]?.executionComplete).toBe(false);
  });
});
