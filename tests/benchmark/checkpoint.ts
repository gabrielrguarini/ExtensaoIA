export interface CampaignRecord {
  type: string;
  profile?: string;
  round?: number;
  id?: string;
  executionComplete?: boolean;
}
export function caseKey(profile: string, round: number, id: string): string {
  return `${profile}:${round}:${id}`;
}
/** Erros terminais contam como tentativas; interrupções continuam pendentes. */
export function completedCases(records: readonly CampaignRecord[]): Set<string> {
  return new Set(
    records
      .filter(
        (record) =>
          record.type === 'case' &&
          record.executionComplete === true &&
          record.profile &&
          record.id &&
          Number.isSafeInteger(record.round),
      )
      .map((record) => caseKey(record.profile!, record.round!, record.id!)),
  );
}
export function pendingBlocks(
  ids: readonly string[],
  profile: string,
  round: number,
  records: readonly CampaignRecord[],
): string[][] {
  const complete = completedCases(records);
  const pending = ids.filter((id) => !complete.has(caseKey(profile, round, id)));
  const blocks: string[][] = [];
  for (let index = 0; index < pending.length; index += 12)
    blocks.push(pending.slice(index, index + 12));
  return blocks;
}
