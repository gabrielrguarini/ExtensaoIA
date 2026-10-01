import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { distribution } from '../benchmark/aggregate.ts';
import { caseKey } from '../benchmark/checkpoint.ts';

const dir = path.resolve(process.argv[2]);
const metadata = JSON.parse(await readFile(path.join(dir, 'metadata.json'), 'utf8'));
const dataset = await readFile(path.join(dir, 'cases.json'));
assert.equal(createHash('sha256').update(dataset).digest('hex'), metadata.datasetSha256);
const records = (await readFile(path.join(dir, 'results.jsonl'), 'utf8'))
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const campaign = metadata.campaign;
const results = new Map();
for (const row of records.filter((row) => row.type === 'case' && row.executionComplete))
  results.set(caseKey(row.profile, row.round, row.id), row);
const summary = {};
for (const profile of campaign.profiles) {
  const rows = [...results.values()].filter((row) => row.profile === profile);
  const expected = campaign.ids.length * campaign.rounds;
  summary[profile] = {
    expected,
    completed: rows.length,
    pending: expected - rows.length,
    suggestionAvailable: rows.filter((row) => row.output !== null).length,
    technicalFailures: rows.filter((row) => row.output === null).length,
    withWarnings: rows.filter((row) => row.assessment?.risks.length > 0).length,
    unchanged: rows.filter((row) => row.assessment?.status === 'unchanged').length,
    totalMs: distribution(
      rows.map((row) => row.totalMs),
      expected,
    ),
    firstVisibleMs: distribution(
      rows.map((row) => row.firstVisibleMs),
      expected,
    ),
    quality:
      'Requer anotação humana por caso; disponibilidade/avisos não são utilidade ou preservação.',
  };
}
const result = {
  campaign,
  summary,
  interruptions: records.filter((row) => row.type === 'interruption'),
  attempts: records.filter((row) => row.type === 'case').length,
};
await writeFile(path.join(dir, 'summary.json'), JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
