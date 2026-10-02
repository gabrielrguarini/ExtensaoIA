import { distribution } from './aggregate.ts';
export interface ComparisonRecord {
  type: string;
  profile: string;
  round: number;
  id?: string;
  status?: string;
  action?: string;
  executionComplete?: boolean;
  output?: string | null;
  raw?: string;
  error?: string | null;
  firstVisibleMs?: number | null;
  totalMs?: number | null;
  setupMs?: number | null;
  coldMs?: number;
  resident?: boolean;
  preparationMs?: number | null;
  metrics?: { decodeTokensPerSecond?: number } | null;
  assessment?: { status: string; risks: { code: string; message: string }[] } | null;
}
export interface ComparisonReview {
  profile: string;
  round: number;
  id: string;
  resultSha256: string;
  preserved: boolean;
  entitiesExact: boolean;
  grammatical: boolean;
  natural: boolean;
  languagePtBr: boolean;
  actionUseful: boolean;
  correctWarnings: number[];
  missedRisk: boolean;
  notes: string;
}
export function comparisonKey(row: { profile: string; round: number; id?: string }) {
  return `${row.profile}:${row.round}:${row.id}`;
}
export function reviewedValue(row: ComparisonRecord) {
  return JSON.stringify({
    profile: row.profile,
    round: row.round,
    id: row.id,
    status: row.status,
    raw: row.raw,
    output: row.output,
    assessment: row.assessment,
  });
}
/** A qualidade vem de leitura independente das saídas, nunca do próprio motor/avisos. */
export function comparisonSummary(
  records: ComparisonRecord[],
  reviews: ComparisonReview[],
  profiles: string[],
  rounds: number,
  ids: string[],
  expectedActions: Record<string, string>,
  expectedTexts: Record<string, string> = {},
) {
  const terminal = records.filter((r) => r.type === 'case' && r.executionComplete === true);
  const expected = new Set(
    profiles
      .flatMap((profile) =>
        Array.from({ length: rounds }, (_, i) =>
          ids.map((id) => comparisonKey({ profile, round: i + 1, id })),
        ),
      )
      .flat(),
  );
  if (
    expected.size !== profiles.length * rounds * ids.length ||
    ids.some((id) => !expectedActions[id]) ||
    new Set(terminal.map(comparisonKey)).size !== terminal.length ||
    terminal.some((r) => !expected.has(comparisonKey(r)) || r.action !== expectedActions[r.id!])
  )
    throw new Error('Resultado duplicado ou fora do denominador/ação.');
  if (
    terminal.some(
      (r) =>
        !['accepted', 'rejected', 'generation-error'].includes(r.status ?? '') ||
        (r.status === 'accepted' && (typeof r.output !== 'string' || !r.output.trim())),
    )
  )
    throw new Error('Estado técnico de resultado inválido.');
  const reviewIndex = new Map(reviews.map((r) => [comparisonKey(r), r]));
  if (
    reviewIndex.size !== reviews.length ||
    reviews.some((r) => !terminal.some((t) => comparisonKey(t) === comparisonKey(r)))
  )
    throw new Error('Revisão duplicada ou sem resultado.');
  for (const row of terminal) {
    const review = reviewIndex.get(comparisonKey(row));
    if (!review) continue;
    if (
      [
        review.preserved,
        review.entitiesExact,
        review.grammatical,
        review.natural,
        review.languagePtBr,
        review.actionUseful,
        review.missedRisk,
      ].some((v) => typeof v !== 'boolean') ||
      !review.notes?.trim() ||
      !/^[a-f0-9]{64}$/u.test(review.resultSha256)
    )
      throw new Error('Revisão inválida.');
    const count = row.assessment?.risks.length ?? 0;
    if (
      new Set(review.correctWarnings).size !== review.correctWarnings.length ||
      review.correctWarnings.some((i) => !Number.isSafeInteger(i) || i < 0 || i >= count)
    )
      throw new Error('Índice de aviso inválido.');
    if (row.status !== 'accepted')
      throw new Error('Qualidade de sugestão indisponível não deve ser inventada.');
  }
  function summarize(profile: string, action?: string) {
    const all = terminal.filter((r) => r.profile === profile && (!action || r.action === action));
    const offered = all.filter(
      (r) => r.status === 'accepted' && typeof r.output === 'string' && r.output.trim(),
    );
    const annotations = offered
      .map((r) => ({ row: r, review: reviewIndex.get(comparisonKey(r)) }))
      .filter((r): r is { row: ComparisonRecord; review: ComparisonReview } => !!r.review);
    const unchanged = (row: ComparisonRecord) =>
      row.assessment?.status === 'unchanged' ||
      (expectedTexts[row.id!] !== undefined &&
        row.output?.trim() === expectedTexts[row.id!]!.trim());
    const denominator = action
      ? ids.filter((id) => expectedActions[id] === action).length * rounds
      : ids.length * rounds;
    const useful = annotations.filter(
      ({ row, review: r }) =>
        !unchanged(row) &&
        r.preserved &&
        r.entitiesExact &&
        r.grammatical &&
        r.natural &&
        r.languagePtBr &&
        r.actionUseful,
    ).length;
    return {
      denominator,
      attempted: all.length,
      pending: denominator - all.length,
      suggestions: offered.length,
      unavailableSuggestions: all.length - offered.length,
      preservationRejections: all.filter(
        (r) => r.status === 'rejected' && r.error?.includes('PRESERVATION_RISK'),
      ).length,
      errors: all.filter(
        (r) =>
          r.status === 'generation-error' ||
          (r.status === 'rejected' && !r.error?.includes('PRESERVATION_RISK')),
      ).length,
      unchanged: offered.filter(unchanged).length,
      reviewed: annotations.length,
      qualityPending: offered.length - annotations.length,
      useful,
      usefulPercentOfAll:
        annotations.length === offered.length && all.length === denominator
          ? (useful / denominator) * 100
          : null,
      preserved: annotations.filter(({ review: r }) => r.preserved).length,
      contentChanges: annotations.filter(({ review: r }) => !r.preserved).length,
      entityContractEdits: annotations.filter(({ review: r }) => !r.entitiesExact).length,
      languageFailures: annotations.filter(({ review: r }) => !r.languagePtBr).length,
      warned: offered.filter((r) => r.assessment?.risks.length).length,
      warningsReviewed: annotations.reduce(
        (n, { row }) => n + (row.assessment?.risks.length ?? 0),
        0,
      ),
      correctWarnings: annotations.reduce((n, { review: r }) => n + r.correctWarnings.length, 0),
      undueWarnings: annotations.reduce(
        (n, { row, review: r }) =>
          n + (row.assessment?.risks.length ?? 0) - r.correctWarnings.length,
        0,
      ),
      missedRisks: annotations.filter(({ review: r }) => r.missedRisk).length,
      firstVisibleMs: distribution(
        offered.map((r) => r.firstVisibleMs ?? null),
        denominator,
      ),
      totalMs: distribution(
        offered.map((r) => r.totalMs ?? null),
        denominator,
      ),
      allAttemptTotalMs: distribution(
        all.map((r) => r.totalMs ?? null),
        denominator,
      ),
      initializeForActionMs: distribution(
        all.map((r) => r.setupMs ?? null),
        denominator,
      ),
      decodeTokensPerSecond: distribution(
        offered.map((r) => r.metrics?.decodeTokensPerSecond ?? null),
        denominator,
      ),
    };
  }
  const byCandidate = Object.fromEntries(
    profiles.map((profile) => [
      profile,
      {
        ...summarize(profile),
        cachedLoadMs: distribution(
          records
            .filter((r) => r.type === 'load' && r.profile === profile && !r.error && !r.resident)
            .map((r) => r.coldMs ?? null),
          records.filter((r) => r.type === 'load' && r.profile === profile && !r.resident).length,
        ),
        preparationMs: distribution(
          records
            .filter((r) => r.type === 'load' && r.profile === profile && !r.resident)
            .map((r) => r.preparationMs ?? null),
          records.filter((r) => r.type === 'load' && r.profile === profile && !r.resident).length,
        ),
        residentInitializeMs: distribution(
          records
            .filter((r) => r.type === 'load' && r.profile === profile && r.resident)
            .map((r) => r.coldMs ?? null),
          records.filter((r) => r.type === 'load' && r.profile === profile && r.resident).length,
        ),
        byAction: Object.fromEntries(
          [...new Set(ids.map((id) => expectedActions[id]!))].map((action) => [
            action,
            summarize(profile, action),
          ]),
        ),
      },
    ]),
  );
  return {
    expected: expected.size,
    completed: terminal.length,
    pending: expected.size - terminal.length,
    suggestionsReviewed: reviews.length,
    qualityPending: Object.values(byCandidate).reduce((n, r) => n + r.qualityPending, 0),
    byCandidate,
  };
}
