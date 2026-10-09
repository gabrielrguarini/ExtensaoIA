import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const baseline = 'c9a8be96534dab66bae3b1ed10ba360da9d8e230';
const printer = ts.createPrinter();
function inspect(text) {
  const file = ts.createSourceFile(
    'settings.tsx',
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const root = file.statements.find(ts.isFunctionDeclaration);
  const print = (node) =>
    printer
      .printNode(ts.EmitHint.Unspecified, node, file)
      .replace(/,\s*([}\]])/g, ' $1')
      .replace(/\s+/g, ' ')
      .trim();
  const prelude = root.body.statements.filter((node) => !ts.isReturnStatement(node)).map(print);
  const callbacks = [],
    controls = [];
  function visit(node) {
    if (node !== root && ts.isFunctionLike(node) && node.body) callbacks.push(print(node));
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      ['select', 'input', 'button', 'a', 'details', 'PreferenceFields'].includes(
        node.tagName.getText(file),
      )
    )
      controls.push({
        tag: node.tagName.getText(file),
        attrs: node.attributes.properties
          .filter((x) => x.name?.getText(file) !== 'className')
          .map(print),
      });
    ts.forEachChild(node, visit);
  }
  visit(file);
  return { prelude, callbacks, controls };
}
const inspected = [];
for (const name of [
  'SettingsApp',
  'PreferenceFields',
  'ChromePreparation',
  'SelectedModelControls',
]) {
  const file = `src/extension/settings/${name}.tsx`;
  const before = inspect(
    execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf8' }),
  );
  const after = inspect(readFileSync(file, 'utf8'));
  assert.deepEqual(after, before, `${name}: lógica ou atributos funcionais mudaram`);
  inspected.push({
    file,
    callbacks: after.callbacks.length,
    controls: after.controls.length,
    unchanged: true,
  });
}
const protectedSources = execFileSync('git', ['diff', baseline, '--name-only', '--', 'src'], {
  encoding: 'utf8',
})
  .trim()
  .split('\n')
  .filter(
    (file) =>
      file &&
      !/^src\/extension\/settings\/(?:SettingsApp\.tsx|PreferenceFields\.tsx|ChromePreparation\.tsx|SelectedModelControls\.tsx|settings\.css)$/.test(
        file,
      ),
  )
  .join('\n');
assert.equal(protectedSources, '');
const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const old = JSON.parse(readFileSync('release/ia-local-whatsapp-0.16.3.sha256.json', 'utf8'));
const current = JSON.parse(readFileSync('release/ia-local-whatsapp-0.16.4.sha256.json', 'utf8'));
assert.equal(current.files['content.js'].sha256, old.files['content.js'].sha256);
const unchanged = Object.keys(old.files).filter(
  (file) => current.files[file]?.sha256 === old.files[file].sha256,
);
assert.equal(unchanged.length, 45);
const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const priorManifest = JSON.parse(
  execFileSync('git', ['show', `${baseline}:manifest.json`], { encoding: 'utf8' }),
);
assert.deepEqual({ ...manifest, version: priorManifest.version }, priorManifest);
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const priorLock = JSON.parse(
  execFileSync('git', ['show', `${baseline}:package-lock.json`], { encoding: 'utf8' }),
);
lock.version = priorLock.version;
lock.packages[''].version = priorLock.packages[''].version;
assert.deepEqual(lock, priorLock);
for (const [file, record] of Object.entries(current.files))
  assert.equal(sha('dist/' + file), record.sha256);
const result = {
  baseline,
  version: current.version,
  inspected,
  protectedSourcesUnchanged: true,
  manifestOnlyVersionChanged: true,
  dependenciesUnchanged: true,
  contentJsSha256: current.files['content.js'].sha256,
  contentJsByteForByteIdentical: true,
  unchangedPackageFiles: unchanged.length,
  changedLogicalPackageFiles: [
    'manifest.json',
    'popup.html',
    'sidepanel.html',
    'assets/settings-*.css',
    'assets/settings-*.js',
  ],
  distMatchesPackage: true,
  bytes: current.bytes,
  zip: current.zip,
};
writeFileSync('.cache/step16d/invariants.json', JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify(result) + '\n');
