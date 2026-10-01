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
import { pendingBlocks, completedCases } from '../benchmark/checkpoint.ts';

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
const resume = process.env.STEP15_RESUME === '1';
const pipeline = process.env.STEP15_PIPELINE ?? 'original';
assert(['original', 'legacy-protected'].includes(pipeline));
const rounds = Number(process.env.STEP15_ROUNDS ?? 1);
assert(Number.isSafeInteger(rounds) && rounds >= 1 && rounds <= 3);
const caseLimit = Number(process.env.STEP15_CASE_LIMIT ?? BENCHMARK_CASES.length);
assert(Number.isSafeInteger(caseLimit) && caseLimit > 0 && caseLimit <= BENCHMARK_CASES.length);
const ids = BENCHMARK_CASES.slice(0, caseLimit).map(({ id }) => id);
const maxBlocks = Number(process.env.STEP15_MAX_BLOCKS ?? Infinity);
assert(maxBlocks > 0 && (Number.isSafeInteger(maxBlocks) || maxBlocks === Infinity));
const priorMetadata = resume
  ? JSON.parse(await readFile(path.join(out, 'metadata.json'), 'utf8'))
  : null;
const records = resume
  ? (await readFile(path.join(out, 'results.jsonl'), 'utf8'))
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  : [];
if (!resume) await writeFile(path.join(out, 'results.jsonl'), '', { flag: 'wx' });
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
if (resume)
  assert.equal(
    await readFile(path.join(out, 'cases.json'), 'utf8'),
    dataset,
    'Dataset diferente; crie outra campanha.',
  );
else await writeFile(path.join(out, 'cases.json'), dataset, { flag: 'wx' });
const files = [
  'src/extension/ai/ai-engine.ts',
  'src/extension/ai/webllm-engine.ts',
  'src/extension/ai/suggestion-assessment.ts',
  'src/extension/ai/semantic-review.ts',
  'src/extension/ai/model-catalog.ts',
  'src/extension/ai/model-cache.ts',
  'src/extension/ai/model-libraries.ts',
  'src/shared/webgpu-adapter.ts',
  'src/shared/writing-options.ts',
  'build/webgpu-compatibility.ts',
  'src/shared/protocol.ts',
  'src/shared/suggestion.ts',
  'tests/browser/step15-worker.ts',
  'tests/browser/step15-entry.ts',
  'tests/browser/step15-benchmark.mjs',
  'tests/benchmark/checkpoint.ts',
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
if (!resume)
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
if (resume) {
  assert.deepEqual(hashes, priorMetadata.hashes, 'Código/runtime diferente; crie outra campanha.');
  assert.deepEqual(
    { profiles, rounds, ids, pipeline },
    priorMetadata.campaign,
    'Configuração de campanha diferente.',
  );
}
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
  // O perfil dedicado pode conservar a extensão desativada ou o MV3 adormecido.
  // Conferir somente nosso item e acordar o coordenador com uma consulta sem texto.
  const page = await context.newPage();
  try {
    await page.goto('chrome://extensions');
    const item = page
      .locator('extensions-item')
      .filter({ has: page.getByText(manifest.name, { exact: true }) });
    await item.waitFor({ state: 'attached' });
    const id = await item.getAttribute('id');
    assert(id && /^[a-p]{32}$/u.test(id));
    const toggle = item.locator('#enableToggle');
    if ((await toggle.getAttribute('aria-checked')) !== 'true') await toggle.click();
    await page.goto(`chrome-extension://${id}/diagnostic.html`);
    await page.evaluate(() => chrome.runtime.sendMessage({ target: 'preferences', type: 'get' }));
  } finally {
    await page.close();
  }
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
// Não fechar o Chrome durante runtime.reload(): a recarga ainda não terminou
// quando a chamada retorna e pode deixar a extensão desativada no próximo início.
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
    campaign: { profiles, rounds, ids, pipeline },
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
  if (resume) {
    for (const key of ['browser', 'platform', 'cpu', 'systemMemoryBytes', 'driver', 'gpu'])
      assert.deepEqual(metadata[key], priorMetadata[key], 'Ambiente diferente: ' + key);
  } else
    await writeFile(path.join(out, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n', {
      flag: 'wx',
    });
  let blocksRun = 0;
  let interrupted = false;
  async function record(value) {
    await appendFile(path.join(out, 'results.jsonl'), JSON.stringify(value) + '\n');
    records.push(value);
    const complete = completedCases(records);
    const pending = profiles.flatMap((profile) =>
      Array.from({ length: rounds }, (_, round) =>
        pendingBlocks(ids, profile, round + 1, records)
          .flat()
          .map((id) => ({ profile, round: round + 1, id })),
      ).flat(),
    );
    await writeFile(
      path.join(out, 'checkpoint.json'),
      JSON.stringify(
        {
          completed: complete.size,
          expected: profiles.length * rounds * ids.length,
          pending,
          resultsSha256: sha(await readFile(path.join(out, 'results.jsonl'))),
        },
        null,
        2,
      ) + '\n',
    );
  }
  campaign: for (const profile of profiles) {
    for (let round = 1; round <= rounds; round++) {
      for (const block of pendingBlocks(ids, profile, round, records)) {
        if (blocksRun >= maxBlocks) break campaign;
        if (blocksRun++) {
          await context.close();
          context = await chromium.launchPersistentContext(profileDir, options);
          page = await attach();
        }
        let lastActivity = Date.now();
        await page.exposeFunction('__step15Record', async (value) => {
          lastActivity = Date.now();
          if (value.type === 'load') {
            value.globalGpuMemoryUsedFreeMiB = gpuMeasurement('memory.used,memory.free');
            await context.setOffline(true);
          }
          await record({ ...value, profile, round, pipeline });
          if (['progress', 'load', 'case'].includes(value.type))
            process.stdout.write(
              value.type +
                ' ' +
                profile +
                ' r' +
                round +
                ' ' +
                (value.id ?? value.phase ?? '') +
                ' ' +
                (value.status ?? value.percent ?? '') +
                '\n',
            );
        });
        await context.setOffline(false);
        await record({
          type: 'block-start',
          profile,
          round,
          ids: block,
          pipeline,
          globalGpuMemoryUsedFreeMiB: gpuMeasurement('memory.used,memory.free'),
        });
        let watchdog;
        try {
          await Promise.race([
            page.evaluate(
              async ({ profile, block, pipeline }) => {
                await globalThis.__step15Run(
                  profile,
                  false,
                  globalThis.__step15Record,
                  block,
                  pipeline,
                );
              },
              { profile, block, pipeline },
            ),
            new Promise((_, reject) => {
              watchdog = globalThis.setInterval(() => {
                if (Date.now() - lastActivity > 120_000)
                  reject(new Error('BENCHMARK_IDLE_TIMEOUT'));
              }, 3000);
            }),
          ]);
        } catch (error) {
          await record({
            type: 'interruption',
            profile,
            round,
            ids: block,
            error: String(error),
            executionComplete: false,
          });
          interrupted = true;
        } finally {
          globalThis.clearInterval(watchdog);
        }
        await record({ type: 'block-end', profile, round, ids: block });
        if (interrupted) break campaign; // Retomar exige nova ação explícita.
      }
    }
  }
  if (completedCases(records).size === profiles.length * rounds * ids.length)
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
  process.stdout.write(
    `Campanha sintética: ${out}; concluídos ${completedCases(records).size}/${profiles.length * rounds * ids.length}. Pendentes permanecem no checkpoint.\n`,
  );
  if (interrupted) process.exitCode = 2;
} finally {
  await context.close();
}
