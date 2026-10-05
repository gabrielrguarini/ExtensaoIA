/* global process, URL */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, lstat, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'dist');
const manifest = JSON.parse(await readFile(path.join(source, 'manifest.json'), 'utf8'));
assert.match(manifest.version, /^\d+\.\d+\.\d+$/u);
const releaseRoot = path.join(root, 'release');
const name = 'ia-local-whatsapp-' + manifest.version;
const target = path.join(releaseRoot, name);
assert.equal(path.dirname(path.resolve(target)), path.resolve(releaseRoot));
await mkdir(releaseRoot, { recursive: true });
const releaseDirectory = await lstat(releaseRoot);
assert(
  releaseDirectory.isDirectory() && !releaseDirectory.isSymbolicLink(),
  'Pasta release inesperada.',
);
const existing = await lstat(target).catch((error) => {
  if (error.code !== 'ENOENT') throw error;
});
if (existing) {
  assert(existing.isDirectory() && !existing.isSymbolicLink(), 'Destino inesperado.');
  // Diretório absoluto validado acima, restrito ao pacote desta versão.
  await rm(target, { recursive: true });
}
await cp(source, target, {
  recursive: true,
  filter: (file) => {
    const relative = path.relative(source, file).replaceAll('\\', '/');
    return !/^(?:index\.html|diagnostic\.html|assets\/(?:development|diagnostic)-)/u.test(relative);
  },
});
const files = {};
for (const relative of (await readdir(target, { recursive: true })).sort()) {
  const file = path.join(target, relative);
  if (!(await lstat(file)).isFile()) continue;
  assert(
    !/\.(?:map|pem|crx|onnx|safetensors|bin)$|(?:^|\/)(?:node_modules|\.cache|\.env|tests)(?:\/|$)/u.test(
      relative.replaceAll('\\', '/'),
    ),
  );
  const data = await readFile(file);
  files[relative.replaceAll('\\', '/')] = {
    bytes: data.length,
    sha256: createHash('sha256').update(data).digest('hex'),
  };
}
for (const entry of [
  'manifest.json',
  'content.js',
  'service-worker.js',
  'offscreen.html',
  'popup.html',
  'sidepanel.html',
  'NOTICE.txt',
])
  assert(files[entry], entry);
for (const entry of ['offscreen.html', 'popup.html', 'sidepanel.html']) {
  const html = await readFile(path.join(target, entry), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/gu)) {
    assert.match(match[1], /^\.\/assets\//u);
    assert(files[match[1].slice(2)], entry + ' -> ' + match[1]);
  }
}
assert(manifest.description.length <= 132);
for (const [size, relative] of Object.entries(manifest.icons)) {
  assert(files[relative], relative);
  const png = await readFile(path.join(target, relative));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), Number(size));
  assert.equal(png.readUInt32BE(20), Number(size));
}
const archive = new AdmZip();
for (const relative of Object.keys(files))
  archive.addFile(relative, await readFile(path.join(target, relative)));
const zipPath = path.join(releaseRoot, name + '.zip');
archive.writeZip(zipPath);
const zip = await readFile(zipPath);
const verifiedArchive = new AdmZip(zip);
assert.deepEqual(
  verifiedArchive
    .getEntries()
    .map((entry) => entry.entryName)
    .sort(),
  Object.keys(files).sort(),
);
for (const entry of verifiedArchive.getEntries())
  assert.equal(
    createHash('sha256').update(entry.getData()).digest('hex'),
    files[entry.entryName].sha256,
  );
const inventory = {
  version: manifest.version,
  algorithm: 'SHA-256',
  bytes: Object.values(files).reduce((sum, f) => sum + f.bytes, 0),
  files,
  zip: {
    name: name + '.zip',
    bytes: zip.length,
    sha256: createHash('sha256').update(zip).digest('hex'),
  },
};
await writeFile(
  path.join(releaseRoot, name + '.sha256.json'),
  JSON.stringify(inventory, null, 2) + '\n',
);
process.stdout.write(
  JSON.stringify({
    directory: target,
    version: manifest.version,
    files: Object.keys(files).length,
    bytes: inventory.bytes,
    zip: zipPath,
    zipBytes: zip.length,
  }) + '\n',
);
