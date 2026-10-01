import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { summarize } from '../benchmark/aggregate.ts';

const dir = path.resolve(process.argv[2] ?? 'docs/benchmark/step15/baseline-01');
const metadata = JSON.parse(await readFile(path.join(dir, 'metadata.json'), 'utf8'));
const dataset = await readFile(path.join(dir, 'cases.json'), 'utf8');
assert.equal(createHash('sha256').update(dataset).digest('hex'), metadata.datasetSha256);
const cases = JSON.parse(dataset);
const resultsText = await readFile(path.join(dir, 'results.jsonl'), 'utf8');
const results = resultsText
  .trim()
  .split('\n')
  .map((line) => JSON.parse(line));
const reviews = JSON.parse(await readFile(path.join(dir, 'review.json'), 'utf8'));
assert.equal(reviews.resultsSha256, createHash('sha256').update(resultsText).digest('hex'));
assert.equal(reviews.datasetSha256, metadata.datasetSha256);
const rows = results.filter((row) => row.type === 'case');
assert.equal(rows.length, metadata.profiles.length * cases.length);
assert.equal(reviews.cases.length, rows.length);
const summary = Object.fromEntries(
  metadata.profiles.map((profile) => [
    profile,
    summarize(
      rows.filter((row) => row.profile === profile),
      reviews.cases.filter((row) => row.profile === profile),
      cases.map((row) => row.id),
    ),
  ]),
);
await writeFile(path.join(dir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
if (Object.values(summary).some((value) => !value.acceptancePasses)) process.exitCode = 2;
