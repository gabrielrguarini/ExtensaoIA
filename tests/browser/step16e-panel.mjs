import path from 'node:path';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
process.env.STEP16B_OUTPUT = path.resolve(process.env.STEP16E_OUTPUT ?? '.cache/step16e/after');
process.env.STEP16B_PORT ??= '9262';
process.env.STEP16E_ACCESS = '1';
await mkdir(process.env.STEP16B_OUTPUT, { recursive: true });
const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
if (manifest.version === '0.16.5') {
  const baseline = '23deb366c785191ba965e24335b8ad2fbdcb0850';
  const old = JSON.parse(await readFile('release/ia-local-whatsapp-0.16.4.sha256.json', 'utf8'));
  const current = JSON.parse(
    await readFile('release/ia-local-whatsapp-0.16.5.sha256.json', 'utf8'),
  );
  assert.equal(current.files['content.js'].sha256, old.files['content.js'].sha256);
  const unchanged = Object.keys(old.files).filter(
    (file) => current.files[file]?.sha256 === old.files[file].sha256,
  );
  assert.equal(unchanged.length, 46);
  for (const [file, record] of Object.entries(current.files))
    assert.equal(
      createHash('sha256')
        .update(await readFile('dist/' + file))
        .digest('hex'),
      record.sha256,
    );
  const changedSources = execFileSync('git', ['diff', baseline, '--name-only', '--', 'src'], {
    encoding: 'utf8',
  })
    .trim()
    .split('\n');
  assert(
    changedSources.every(
      (file) =>
        !file ||
        /^src\/extension\/settings\/(?:SettingsApp|ChromePreparation|SelectedModelControls)\.tsx$/.test(
          file,
        ),
    ),
  );
  const priorManifest = JSON.parse(
    execFileSync('git', ['show', baseline + ':manifest.json'], { encoding: 'utf8' }),
  );
  assert.deepEqual({ ...manifest, version: priorManifest.version }, priorManifest);
  await writeFile(
    path.join(process.env.STEP16B_OUTPUT, 'preservation.json'),
    JSON.stringify(
      {
        baseline,
        version: manifest.version,
        contentJsByteForByteIdentical: true,
        contentJsSha256: current.files['content.js'].sha256,
        unchangedPackageFiles: unchanged.length,
        protectedSourcesAndStylesUnchanged: true,
        manifestOnlyVersionChanged: true,
        distMatchesPackage: true,
        changedLogicalPackageFiles: [
          'manifest.json',
          'popup.html',
          'sidepanel.html',
          'assets/settings-*.js',
        ],
        bytes: current.bytes,
        zip: current.zip,
      },
      null,
      2,
    ) + '\n',
  );
}
await import('./step16b-settings.mjs');
