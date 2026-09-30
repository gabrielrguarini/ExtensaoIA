import { chromium } from 'playwright-core';
import { build } from 'vite';
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const executablePath = process.env.STEP11_CHROME;
if (!executablePath) throw new Error('Defina STEP11_CHROME com Chrome for Testing.');
const extension = path.join(root, 'dist');
const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json'), 'utf8'));
if (manifest.version !== '0.10.0') throw new Error('Execute npm run build antes da prova.');
const evalDir = path.join(extension, '__step11_eval');
if (path.relative(extension, evalDir) !== '__step11_eval')
  throw new Error('Caminho de avaliação inválido.');
const profile = path.resolve(
  process.env.STEP11_PROFILE ?? path.join(root, '.cache', 'step11-browser'),
);
const options = {
  headless: false,
  viewport: { width: 1280, height: 800 },
  executablePath,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
};

try {
  await build({
    configFile: false,
    base: './',
    envPrefix: [],
    publicDir: false,
    define: { 'process.env.NODE_ENV': '"production"' },
    build: {
      target: 'chrome116',
      outDir: evalDir,
      emptyOutDir: true,
      assetsInlineLimit: 0,
      rolldownOptions: {
        input: path.join(root, 'tests/browser/step11-eval.ts'),
        output: {
          entryFileNames: 'step11-eval.js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  });
  const bootstrap = await chromium.launchPersistentContext(profile, options);
  try {
    let worker = bootstrap
      .serviceWorkers()
      .find((item) => item.url().startsWith('chrome-extension://'));
    worker ??= await bootstrap.waitForEvent('serviceworker', { timeout: 15_000 });
    try {
      await worker.evaluate(() => chrome.runtime.reload());
    } catch {
      // A recarga encerra o próprio service worker.
    }
  } finally {
    await bootstrap.close();
  }

  const browser = await chromium.launchPersistentContext(profile, options);
  try {
    let worker = browser
      .serviceWorkers()
      .find((item) => item.url().startsWith('chrome-extension://'));
    worker ??= await browser.waitForEvent('serviceworker', { timeout: 15_000 });
    const workerUrl = new URL(worker.url());
    const extensionOrigin = `${workerUrl.protocol}//${workerUrl.host}`;
    const page = await browser.newPage();
    page.on('console', (message) => {
      if (message.text().startsWith('semantic-case=')) process.stdout.write(`${message.text()}\n`);
    });
    await page.goto(`${extensionOrigin}/diagnostic.html`);
    const report = await page.evaluate(async () => {
      await import(chrome.runtime.getURL('__step11_eval/step11-eval.js'));
      return globalThis.__evaluateSemanticCases();
    });
    process.stdout.write(`${JSON.stringify(report)}\n`);
    const failures = report.results.filter(
      (result) => result.error || result.approved !== result.expected,
    );
    if (failures.length)
      throw new Error(
        `Avaliação semântica divergente: ${failures.map((result) => result.id).join(', ')}`,
      );
  } finally {
    await browser.close();
  }
} finally {
  await rm(evalDir, { recursive: true, force: true });
}
