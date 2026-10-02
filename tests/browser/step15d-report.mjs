import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  comparisonSummary,
  comparisonKey,
  reviewedValue,
} from '../benchmark/comparison-summary.ts';
const folder = process.argv[2];
assert(folder, 'Informe o diretório da campanha.');
const metadata = JSON.parse(await readFile(path.join(folder, 'metadata.json'), 'utf8'));
const records = (await readFile(path.join(folder, 'results.jsonl'), 'utf8'))
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((r) => JSON.parse(r));
let reviews = [];
try {
  const review = JSON.parse(await readFile(path.join(folder, 'review.json'), 'utf8'));
  reviews = review.reviews;
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
for (const review of reviews) {
  const row = records.find((r) => r.type === 'case' && comparisonKey(r) === comparisonKey(review));
  assert(row, 'Revisão sem resultado.');
  assert.equal(
    review.resultSha256,
    createHash('sha256').update(reviewedValue(row)).digest('hex'),
    'Revisão não corresponde à saída.',
  );
}
const { profiles, rounds, ids } = metadata.campaign;
const caseBytes = await readFile(path.join(folder, 'cases.json'));
assert.equal(
  createHash('sha256').update(caseBytes).digest('hex'),
  metadata.datasetSha256,
  'Dataset difere do conjunto congelado antes da inferência.',
);
const cases = JSON.parse(caseBytes.toString('utf8')).cases;
const summary = comparisonSummary(
  records,
  reviews,
  profiles,
  rounds,
  ids,
  Object.fromEntries(cases.map((c) => [c.id, c.action])),
  Object.fromEntries(cases.map((c) => [c.id, c.text])),
);
await writeFile(path.join(folder, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
if (summary.pending || summary.qualityPending) process.exitCode = 2;
