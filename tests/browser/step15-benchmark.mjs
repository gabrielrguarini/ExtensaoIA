import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { appendFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { build } from 'vite';
import { webGpuCompatibility } from '../../build/webgpu-compatibility.ts';
import { BENCHMARK_CASES } from '../benchmark/cases.ts';

const root = process.cwd();
const executablePath = process.env.STEP15_CHROME;
if (!executablePath) throw new Error('Defina STEP15_CHROME com Chrome for Testing.');
const profiles = (process.env.STEP15_MODELS ?? 'economico,equilibrado,qualidade').split(',');
assert(profiles.every((item) => ['economico', 'equilibrado', 'qualidade'].includes(item)));
assert.equal(new Set(profiles).size, profiles.length);
const runName = process.env.STEP15_RUN ?? new Date().toISOString().replaceAll(/[:.]/gu, '-');
assert(/^[\w-]+$/u.test(runName));
const out = path.join(root, '.cache', 'step15-results', runName);
await mkdir(out, { recursive: true });
const extension = path.join(root, 'dist');
const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json'), 'utf8'));
const packageData = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
assert.equal(manifest.version, packageData.version, 'Gere o pacote antes de executar.');
const sha = (value) => createHash('sha256').update(value).digest('hex');
function gpuMeasurement(query) {
  try {
    return execFileSync('nvidia-smi', [`--query-gpu=${query}`, '--format=csv,noheader'], {
      encoding: 'utf8',
    }).trim();
  } catch {
    return null;
  }
}
const dataset = JSON.stringify(BENCHMARK_CASES, null, 2) + '\n';
await writeFile(path.join(out, 'cases.json'), dataset, { flag: 'wx' });
const files = [
  'src/extension/ai/webllm-engine.ts',
  'src/extension/ai/entities.ts',
  'src/extension/ai/correction-output.ts',
  'src/extension/ai/action-validation.ts',
  'src/extension/ai/meaning-anchors.ts',
  'src/extension/ai/correction-prompt.ts',
  'src/extension/ai/token-budget.ts',
  'src/shared/actions.ts',
  'package-lock.json',
];
const hashes = Object.fromEntries(
  await Promise.all(files.map(async (file) => [file, sha(await readFile(path.join(root, file)))])),
);
await writeFile(
  path.join(out, 'source-snapshot.json'),
  JSON.stringify(
    Object.fromEntries(
      await Promise.all(
        files
          .filter((file) => file.startsWith('src/'))
          .map(async (file) => [file, await readFile(path.join(root, file), 'utf8')]),
      ),
    ),
    null,
    2,
  ) + '\n',
);
for (const file of await readdir(path.join(extension, 'assets')))
  if (file.endsWith('.wasm'))
    hashes[`dist/assets/${file}`] = sha(await readFile(path.join(extension, 'assets', file)));
await build({
  configFile: false,
  plugins: [webGpuCompatibility()],
  base: './',
  envPrefix: [],
  publicDir: false,
  define: { 'process.env.NODE_ENV': '"production"' },
  worker: { format: 'es', plugins: () => [webGpuCompatibility()] },
  build: {
    target: 'chrome116',
    outDir: path.join(extension, '__step15_eval'),
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rolldownOptions: {
      input: path.join(root, 'tests/browser/step15-entry.ts'),
      output: {
        entryFileNames: 'entry.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
const options = {
  executablePath,
  headless: false,
  serviceWorkers: 'block',
  viewport: { width: 1280, height: 800 },
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
};
const profileDir = path.join(root, '.cache', 'step15-isolated');
async function getWorker(context) {
  for (let count = 0; count < 100; count++) {
    const worker = context
      .serviceWorkers()
      .find((item) => item.url().endsWith('/service-worker.js'));
    if (
      worker &&
      (await worker.evaluate(() => Boolean(globalThis.chrome?.runtime?.id)).catch(() => false))
    )
      return worker;
    await new Promise((resolve) => globalThis.setTimeout(resolve, 100));
  }
  throw new Error('Service Worker instalado não ficou pronto.');
}
const bootstrap = await chromium.launchPersistentContext(profileDir, options);
try {
  await (await getWorker(bootstrap)).evaluate(() => chrome.runtime.reload()).catch(() => undefined);
} finally {
  await bootstrap.close();
}
let context = await chromium.launchPersistentContext(profileDir, options);
let pageErrors = 0;
const pageErrorDetails = [];
const forbidden = [];
async function attach() {
  context.on('page', (page) =>
    page.on('pageerror', (error) => {
      pageErrors++;
      pageErrorDetails.push(error.message.slice(0, 500));
    }),
  );
  context.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol === 'https:' && !['huggingface.co', 'us.aws.cdn.hf.co'].includes(url.hostname))
      forbidden.push(`${url.origin}${url.pathname}`);
  });
  const id = new URL((await getWorker(context)).url()).host;
  const page = await context.newPage();
  await page.goto(`chrome-extension://${id}/diagnostic.html`);
  await page.evaluate(async () => {
    await import(chrome.runtime.getURL('__step15_eval/entry.js'));
  });
  return page;
}
try {
  let page = await attach();
  const metadata = {
    startedAt: new Date().toISOString(),
    browser: context.browser().version(),
    node: process.version,
    platform: `${os.platform()} ${os.release()} ${os.arch()}`,
    cpu: os.cpus()[0]?.model,
    systemMemoryBytes: os.totalmem(),
    driver: gpuMeasurement('name,memory.total,driver_version'),
    manifestVersion: manifest.version,
    runtime: packageData.dependencies['@mlc-ai/web-llm'],
    datasetSha256: sha(dataset),
    hashes,
    profiles,
    casesPerProfile: BENCHMARK_CASES.length,
    parameters: {
      temperature: 0,
      contextTokens: 4096,
      maxTokens: 'orçamento real por caso em metrics.maxTokens',
      semanticReview: false,
      preserveSlang: true,
      addEmojis: false,
      qwenThinking: false,
    },
    gpu: await page.evaluate(async () => {
      const adapter = await navigator.gpu?.requestAdapter();
      return adapter
        ? {
            vendor: adapter.info.vendor,
            architecture: adapter.info.architecture,
            description: adapter.info.description,
            shaderF16: adapter.features.has('shader-f16'),
            maxBufferSize: adapter.limits.maxBufferSize,
            maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
          }
        : null;
    }),
  };
  await writeFile(path.join(out, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
  for (const [position, profile] of profiles.entries()) {
    if (position) {
      await context.close();
      context = await chromium.launchPersistentContext(profileDir, options);
      page = await attach();
    }
    let lastActivity = Date.now();
    let loaded = false;
    const seen = new Set();
    await page.exposeFunction('__step15Record', async (value) => {
      lastActivity = Date.now();
      if (value.type === 'load') {
        loaded = !value.error;
        value.globalGpuMemoryUsedFreeMiB = gpuMeasurement('memory.used,memory.free');
        await context.setOffline(true);
      }
      if (value.type === 'case') seen.add(value.id);
      await appendFile(path.join(out, 'results.jsonl'), JSON.stringify(value) + '\n');
      if (value.type === 'progress' || value.type === 'load' || value.type === 'case')
        process.stdout.write(
          `${value.type} ${profile} ${value.id ?? value.phase ?? ''} ${value.percent ?? value.status ?? ''}\n`,
        );
    });
    await context.setOffline(false);
    await appendFile(
      path.join(out, 'results.jsonl'),
      JSON.stringify({
        type: 'memory-before',
        profile,
        globalGpuMemoryUsedFreeMiB: gpuMeasurement('memory.used,memory.free'),
      }) + '\n',
    );
    let watchdog;
    try {
      await Promise.race([
        page.evaluate(async (profile) => {
          await globalThis.__step15Run(profile, false, globalThis.__step15Record);
        }, profile),
        new Promise((_, reject) => {
          watchdog = globalThis.setInterval(() => {
            if (Date.now() - lastActivity > 120_000) reject(new Error('BENCHMARK_IDLE_TIMEOUT'));
          }, 3000);
        }),
      ]);
    } catch (error) {
      for (const test of BENCHMARK_CASES.filter((item) => !seen.has(item.id)))
        await appendFile(
          path.join(out, 'results.jsonl'),
          JSON.stringify({
            type: 'case',
            profile,
            id: test.id,
            action: test.action,
            status: loaded ? 'generation-error' : 'load-error',
            executionComplete: false,
            raw: '',
            output: null,
            error: `Benchmark interrompido: ${String(error)}`,
            firstVisibleMs: null,
            generationMs: null,
            totalMs: null,
            metrics: null,
            slots: [],
            protectedText: null,
          }) + '\n',
        );
    } finally {
      globalThis.clearInterval(watchdog);
    }
  }
  for (const profile of profiles) {
    await context.close();
    context = await chromium.launchPersistentContext(profileDir, options);
    page = await attach();
    await page.exposeFunction('__step15Record', async (value) => {
      await appendFile(path.join(out, 'cached-loads.jsonl'), JSON.stringify(value) + '\n');
      if (value.type === 'load')
        process.stdout.write(`cached-load ${value.profile} ${Math.round(value.coldMs)}ms\n`);
    });
    await context.setOffline(true);
    await page.evaluate(async (profile) => {
      await globalThis.__step15Run(profile, true, globalThis.__step15Record);
    }, profile);
  }
  const results = (await readFile(path.join(out, 'results.jsonl'), 'utf8'))
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  assert.equal(
    results.filter((item) => item.type === 'case').length,
    profiles.length * BENCHMARK_CASES.length,
  );
  await writeFile(
    path.join(out, 'environment-end.json'),
    JSON.stringify(
      { endedAt: new Date().toISOString(), pageErrors, pageErrorDetails, forbidden },
      null,
      2,
    ) + '\n',
  );
  assert.equal(pageErrors, 0);
  assert.equal(forbidden.length, 0);
  process.stdout.write(`Relatório sintético: ${out}\n`);
} finally {
  await context.close();
}
