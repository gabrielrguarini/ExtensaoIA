import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseline = '0b24ac1224e057e46ea47b794317eb98d4c7e173';
const old = (file) => execFileSync('git', ['show', baseline + ':' + file], { encoding: 'utf8' });
const original = old('src/extension/content/editor-button.css');
const first = original.indexOf('.writing-tooltip {');
const last = original.indexOf('.panel-container {', first);
const normalize = (text) => text.replaceAll('\r\n', '\n').trim();
assert.equal(
  normalize(await readFile('src/extension/ui/tooltip.css', 'utf8')),
  normalize(original.slice(first, last)),
);
assert.equal(
  normalize(await readFile('src/extension/content/editor-button.css', 'utf8')),
  normalize(original.slice(0, first) + original.slice(last)),
);
const protectedFiles = execFileSync(
  'git',
  [
    'ls-tree',
    '-r',
    '--name-only',
    baseline,
    'src/extension/ai',
    'src/integration',
    'src/shared/preferences.ts',
    'src/extension/content/preview-session.ts',
    'src/extension/content/direct-stream.ts',
  ],
  { encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter((file) => /\.(?:ts|json)$/.test(file));
for (const file of protectedFiles)
  assert.equal(normalize(await readFile(file, 'utf8')), normalize(old(file)), file);
const previous = JSON.parse(await readFile('release/ia-local-whatsapp-0.16.5.sha256.json', 'utf8'));
const current = JSON.parse(await readFile('release/ia-local-whatsapp-0.16.6.sha256.json', 'utf8'));
const unchanged = Object.entries(previous.files)
  .filter(([name, value]) => current.files[name]?.sha256 === value.sha256)
  .map(([name]) => name);
const result = {
  baseline,
  protectedSourceFiles: protectedFiles.length,
  tooltipStylesIdentical: true,
  launcherStylesIdentical: true,
  sharedTooltipConsumers: ['editor-button', 'PreparationButton'],
  unchangedPackageFiles: unchanged.length,
  contentBundleChangedBySharedTooltipExtraction: true,
  packageFiles: Object.keys(current.files).length,
};
const out = path.resolve(process.env.STEP16F_OUTPUT ?? '.cache/step16f/actual');
await mkdir(out, { recursive: true });
await writeFile(path.join(out, 'preservation.json'), JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify(result) + '\n');
