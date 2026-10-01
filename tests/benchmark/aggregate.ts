import type { GenerationMetrics } from '../../src/extension/ai/ai-engine';

export interface CaseResult {
  type: 'case';
  profile: string;
  id: string;
  action: string;
  status: 'accepted' | 'rejected' | 'load-error' | 'generation-error';
  executionComplete?: boolean;
  output: string | null;
  raw: string;
  error: string | null;
  firstVisibleMs: number | null;
  generationMs: number | null;
  totalMs: number | null;
  metrics: GenerationMetrics | null;
}

export interface Review {
  profile: string;
  id: string;
  rawPreserves: boolean | null;
  rawFormatComplete: boolean;
  releasedPreserves: boolean | null;
  grammatical: boolean | null;
  natural: boolean | null;
  actionUseful: boolean | null;
  notes: string;
}

export function distribution(values: (number | null)[], denominator: number) {
  const measured = values
    .filter((value): value is number => value !== null && Number.isFinite(value))
    .sort((a, b) => a - b);
  const percentile = (p: number) =>
    measured.length ? measured[Math.max(0, Math.ceil(measured.length * p) - 1)]! : null;
  return {
    denominator,
    measured: measured.length,
    unavailable: denominator - measured.length,
    median: percentile(0.5),
    p95: percentile(0.95),
  };
}

/** A revisão independente é obrigatória; nunca inferida do aceite automático. */
export function summarize(results: CaseResult[], reviews: Review[], expectedIds: string[]) {
  if (new Set(expectedIds).size !== expectedIds.length)
    throw new Error('IDs esperados duplicados.');
  const expected = new Set(expectedIds);
  if (
    results.length !== expected.size ||
    new Set(results.map((row) => row.id)).size !== expected.size ||
    results.some((row) => !expected.has(row.id))
  )
    throw new Error('Denominador incompleto ou duplicado.');
  if (
    reviews.length !== results.length ||
    new Set(reviews.map((row) => row.id)).size !== results.length
  )
    throw new Error('Revisão incompleta ou duplicada.');
  const index = new Map(reviews.map((row) => [row.id, row]));
  for (const result of results) {
    const review = index.get(result.id);
    if (
      !review ||
      review.profile !== result.profile ||
      typeof review.notes !== 'string' ||
      !review.notes.trim() ||
      typeof review.rawFormatComplete !== 'boolean' ||
      [
        review.rawPreserves,
        review.releasedPreserves,
        review.grammatical,
        review.natural,
        review.actionUseful,
      ].some((value) => value !== null && typeof value !== 'boolean') ||
      (result.status === 'accepted' &&
        [review.releasedPreserves, review.grammatical, review.natural, review.actionUseful].some(
          (value) => typeof value !== 'boolean',
        ))
    )
      throw new Error(`Revisão inválida: ${result.id}`);
    if (
      !['accepted', 'rejected', 'load-error', 'generation-error'].includes(result.status) ||
      (result.status === 'accepted' && (typeof result.output !== 'string' || !result.output.trim()))
    )
      throw new Error(`Resultado inválido: ${result.id}`);
  }
  const accepted = results.filter((row) => row.status === 'accepted');
  const altered = accepted.filter((row) => index.get(row.id)!.releasedPreserves !== true);
  const useful = accepted.filter((row) => {
    const review = index.get(row.id)!;
    return (
      review.releasedPreserves === true &&
      review.grammatical === true &&
      review.natural === true &&
      review.actionUseful === true
    );
  });
  const denominator = expectedIds.length;
  return {
    denominator,
    accepted: accepted.length,
    rejected: results.filter((row) => row.status === 'rejected').length,
    loadErrors: results.filter((row) => row.status === 'load-error').length,
    generationErrors: results.filter((row) => row.status === 'generation-error').length,
    missingResults: results.filter((row) => row.executionComplete === false).length,
    safeReleased: accepted.length - altered.length,
    safeReleasedPercentOfAll: ((accepted.length - altered.length) * 100) / denominator,
    usefulReleased: useful.length,
    usefulReleasedPercentOfAll: (useful.length * 100) / denominator,
    knownAlterations: altered.map((row) => row.id),
    preservationGatePasses: altered.length === 0,
    acceptancePasses:
      altered.length === 0 && results.every((row) => row.executionComplete !== false),
    falseNegatives: altered.map((row) => row.id),
    falsePositives: results
      .filter(
        (row) =>
          row.status === 'rejected' &&
          index.get(row.id)!.rawPreserves === true &&
          index.get(row.id)!.rawFormatComplete,
      )
      .map((row) => row.id),
    firstVisibleMs: distribution(
      results.map((row) => row.firstVisibleMs),
      denominator,
    ),
    totalMs: distribution(
      results.map((row) => row.totalMs),
      denominator,
    ),
    decodeTokensPerSecond: distribution(
      results.map((row) => row.metrics?.decodeTokensPerSecond ?? null),
      denominator,
    ),
    runtimeFirstTokenMs: distribution(
      results.map((row) => row.metrics?.runtimeFirstTokenMs ?? null),
      denominator,
    ),
    actionBreakdown: Object.fromEntries(
      [...new Set(results.map((row) => row.action))].map((action) => {
        const rows = results.filter((row) => row.action === action);
        return [
          action,
          {
            denominator: rows.length,
            accepted: rows.filter((row) => row.status === 'accepted').length,
            useful: useful.filter((row) => row.action === action).length,
          },
        ];
      }),
    ),
  };
}
