/* global setTimeout, clearTimeout */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { appendFile, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { build } from 'vite';
import { webGpuCompatibility } from '../../build/webgpu-compatibility.ts';
import { BENCHMARK_CASES } from '../benchmark/cases.ts';
import { RESERVED_CASES, RESERVED_REVIEW_RUBRIC } from '../benchmark/reserved-cases.ts';
import { pendingBlocks, completedCases } from '../benchmark/checkpoint.ts';
import { observeBenchmarkNetwork } from './step15d-network.mjs';

const root = process.cwd(),
  extension = path.join(root, 'dist');
const executablePath = process.env.STEP15D_CHROME;
assert(executablePath, 'Defina STEP15D_CHROME com Chrome instalado.');
const run = process.env.STEP15D_RUN;
assert(run && /^[\w-]+$/u.test(run), 'Nome de campanha explícito obrigatório.');
const profiles = (
  process.env.STEP15D_MODELS ?? 'chrome-prompt,economico,gemma,equilibrado,qualidade'
).split(',');
assert(
  profiles.every((v) =>
    ['chrome-prompt', 'economico', 'gemma', 'equilibrado', 'qualidade'].includes(v),
  ) && new Set(profiles).size === profiles.length,
);
const dataset = process.env.STEP15D_DATASET ?? 'reserved';
assert(['reserved', 'training', 'history'].includes(dataset));
const training = [
  'B01-corrigir',
  'B02-formal',
  'B03-profissional',
  'B04-corrigir',
  'B05-conciso',
  'B06-melhorar',
  'B07-natural',
  'B08-conciso',
  'B09-amigavel',
  'B10-reescrever',
  'B11-engracado',
  'B12-corrigir',
];
const cases =
  dataset === 'reserved'
    ? RESERVED_CASES
    : dataset === 'history'
      ? BENCHMARK_CASES
      : BENCHMARK_CASES.filter(({ id }) => training.includes(id));
const ids = cases.map(({ id }) => id);
const rounds = Number(process.env.STEP15D_ROUNDS ?? (dataset === 'reserved' ? 3 : 1));
assert(Number.isSafeInteger(rounds) && rounds >= 1 && rounds <= 3);
const pipeline = process.env.STEP15D_PIPELINE ?? 'original';
assert(['original', 'legacy-protected'].includes(pipeline));
assert(
  pipeline === 'original' ||
    profiles.every((v) => ['economico', 'equilibrado', 'qualidade'].includes(v)),
);
const maxBlocks = Number(process.env.STEP15D_MAX_BLOCKS ?? Infinity);
const allowDownload = process.env.STEP15D_DOWNLOAD === '1';
const restartEachBlock = process.env.STEP15D_RESTART_EACH_BLOCK === '1';
const resume = process.env.STEP15D_RESUME === '1';
const out = path.join(root, '.cache', 'step15d', run);
await mkdir(out, { recursive: true });
const sha = (data) => createHash('sha256').update(data).digest('hex');
const serialized = JSON.stringify({ cases, rubric: RESERVED_REVIEW_RUBRIC }, null, 2) + '\n';
const campaign = { profiles, rounds, ids, dataset, pipeline, restartEachBlock };
const prior = resume ? JSON.parse(await readFile(path.join(out, 'metadata.json'), 'utf8')) : null;
const records = resume
  ? (await readFile(path.join(out, 'results.jsonl'), 'utf8'))
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  : [];
if (resume) assert.equal(await readFile(path.join(out, 'cases.json'), 'utf8'), serialized);
else {
  await writeFile(path.join(out, 'cases.json'), serialized, { flag: 'wx' });
  await writeFile(path.join(out, 'results.jsonl'), '', { flag: 'wx' });
}
const walk = async (dir) =>
  (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map(async (entry) =>
        entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)],
      ),
    )
  ).flat();
const sourceFiles = [
  ...(await walk('src/extension/ai')),
  ...(await walk('src/shared')),
  'tests/benchmark/cases.ts',
  'tests/benchmark/reserved-cases.ts',
  'tests/benchmark/comparison-run.ts',
  'tests/benchmark/checkpoint.ts',
  'tests/browser/step15d-worker.ts',
  'tests/browser/step15d-entry.ts',
  'tests/browser/step15d-benchmark.mjs',
  'tests/browser/step15d-network.mjs',
  'build/webgpu-compatibility.ts',
  'package-lock.json',
];
const hashes = Object.fromEntries(
  await Promise.all(
    sourceFiles.map(async (file) => [file.replaceAll('\\', '/'), sha(await readFile(file))]),
  ),
);
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
    outDir: extension,
    emptyOutDir: false,
    assetsInlineLimit: 0,
    rolldownOptions: {
      input: path.join(root, 'tests/browser/step15d-entry.ts'),
      output: {
        entryFileNames: 'step15d-entry.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json'), 'utf8'));
const gpu = () => {
  try {
    return execFileSync(
      'nvidia-smi',
      [
        '--query-gpu=name,memory.total,memory.used,memory.free,driver_version',
        '--format=csv,noheader',
      ],
      { encoding: 'utf8' },
    ).trim();
  } catch {
    return null;
  }
};
const profileDir = path.join(root, '.cache', 'step15b-chrome');
let context;
let errors = [];
let activeBlock = null;
let audit;
const audits = [];
let networkQueue = Promise.resolve();
async function start() {
  context = await chromium.launchPersistentContext(profileDir, {
    executablePath,
    headless: false,
    serviceWorkers: 'block',
    viewport: { width: 1280, height: 850 },
    ignoreDefaultArgs: [
      '--disable-extensions',
      '--disable-component-update',
      '--disable-background-networking',
      '--disable-field-trial-config',
    ],
    args: ['--enable-unsafe-extension-debugging', '--remote-debugging-port=9237'],
  });
  audit = await observeBenchmarkNetwork(9237, (request) => {
    const value = { ...activeBlock, request };
    networkQueue = networkQueue.then(() =>
      appendFile(path.join(out, 'network.jsonl'), JSON.stringify(value) + '\n'),
    );
    return networkQueue;
  });
  context.on('page', (p) => p.on('pageerror', (e) => errors.push(e.message)));
  const cdp = await context.browser().newBrowserCDPSession();
  const manager = await context.newPage();
  await manager.goto('chrome://extensions');
  const developerMode = manager.locator('extensions-toolbar #devMode');
  await developerMode.waitFor();
  if ((await developerMode.getAttribute('aria-checked')) !== 'true') await developerMode.click();
  await cdp.send('Extensions.loadUnpacked', { path: extension });
  await manager.reload();
  const item = manager
    .locator('extensions-item')
    .filter({ has: manager.getByText(manifest.name, { exact: true }) });
  await item.waitFor();
  await item.locator('#enableToggle:not([aria-disabled="true"])').waitFor();
  const id = await item.getAttribute('id');
  assert(id && /^[a-p]{32}$/u.test(id));
  if ((await item.locator('#enableToggle').getAttribute('aria-checked')) !== 'true')
    await item.locator('#enableToggle').click();
  await item.locator('#dev-reload-button').click();
  const page = await context.newPage();
  for (let retry = 0; ; retry++) {
    try {
      await page.goto(`chrome-extension://${id}/popup.html`);
      break;
    } catch (error) {
      if (retry >= 30) throw error;
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  const prepared = await page.evaluate(() =>
    chrome.runtime.sendMessage({ target: 'local-engine', type: 'prepare' }),
  );
  assert.equal(
    prepared?.ready,
    true,
    'Preparação deve partir da página de configurações autorizada.',
  );
  await manager.close();
  let offscreen;
  for (let retry = 0; retry < 50 && !offscreen; retry++) {
    const { targetInfos } = await cdp.send('Target.getTargets');
    offscreen = targetInfos.find((t) => t.url === `chrome-extension://${id}/offscreen.html`);
    if (!offscreen) await new Promise((r) => setTimeout(r, 100));
  }
  assert(offscreen, 'Documento offscreen real ausente.');
  const { sessionId } = await cdp.send('Target.attachToTarget', {
    targetId: offscreen.targetId,
    flatten: false,
  });
  let sequence = 0;
  const pending = new Map();
  const send = async (method, params = {}) => {
    const n = ++sequence;
    const promise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(n);
        reject(new Error('CDP timeout: ' + method));
      }, 30000);
      pending.set(n, { resolve, reject, timer });
    });
    await cdp.send('Target.sendMessageToTarget', {
      sessionId,
      message: JSON.stringify({ id: n, method, params }),
    });
    return promise;
  };
  let handler = async () => {};
  let receiveQueue = Promise.resolve();
  cdp.on('Target.receivedMessageFromTarget', (event) => {
    if (event.sessionId !== sessionId) return;
    const message = JSON.parse(event.message);
    if (pending.has(message.id)) {
      const p = pending.get(message.id);
      clearTimeout(p.timer);
      pending.delete(message.id);
      message.error ? p.reject(new Error(message.error.message)) : p.resolve(message.result);
    }
    if (message.method === 'Runtime.bindingCalled' && message.params.name === '__step15dEmit')
      receiveQueue = receiveQueue.then(() => handler(JSON.parse(message.params.payload)));
  });
  const evaluate = async (expression) => {
    const value = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (value.exceptionDetails)
      throw new Error(
        value.exceptionDetails.text + ':' + (value.exceptionDetails.exception?.description ?? ''),
      );
    return value.result.value;
  };
  await send('Runtime.enable');
  await send('Runtime.addBinding', { name: '__step15dEmit' });
  await evaluate(
    `(async()=>{await import(chrome.runtime.getURL('step15d-entry.js'));let num=0;const waiting=new Map();globalThis.__step15dRecord=value=>new Promise(resolve=>{const key=++num;waiting.set(key,resolve);__step15dEmit(JSON.stringify({key,value}));});globalThis.__step15dAck=key=>{waiting.get(key)?.();waiting.delete(key);};return true;})()`,
  );
  return {
    evaluate,
    onRecord: (f) => {
      handler = f;
    },
    browser: context.browser().version(),
    page,
  };
}
async function record(value) {
  await appendFile(path.join(out, 'results.jsonl'), JSON.stringify(value) + '\n');
  records.push(value);
  const pending = profiles.flatMap((profile) =>
    Array.from({ length: rounds }, (_, r) =>
      pendingBlocks(ids, profile, r + 1, records)
        .flat()
        .map((id) => ({ profile, round: r + 1, id })),
    ).flat(),
  );
  await writeFile(
    path.join(out, 'checkpoint.json'),
    JSON.stringify(
      {
        completed: completedCases(records).size,
        expected: profiles.length * rounds * ids.length,
        pending,
        resultsSha256: sha(await readFile(path.join(out, 'results.jsonl'))),
      },
      null,
      2,
    ) + '\n',
  );
}
let blocks = 0;
let previousBlock = null;
try {
  let doc = await start();
  const metadata = {
    campaign,
    startedAt: new Date().toISOString(),
    datasetSha256: sha(serialized),
    hashes,
    browser: doc.browser,
    node: process.version,
    cpu: os.cpus()[0]?.model,
    systemMemoryBytes: os.totalmem(),
    os: `${os.platform()} ${os.release()}`,
    gpu: gpu(),
    manifestVersion: manifest.version,
    parameters: {
      preserveSlang: true,
      addEmojis: false,
      thinking: false,
      localTemperature: 0,
      nativeTemperature: 'default do Chrome',
      contextTokensLocal: 4096,
      semanticReview: false,
    },
    nativeAvailability: await doc.evaluate('globalThis.__step15dAvailability()'),
    scope:
      'offscreen real para Chrome; Workers locais para runtimes próprios; fixtures sintéticas sem conta/envio; aquecimento antes de cada bloco',
  };
  if (resume) {
    assert.deepEqual(campaign, prior.campaign);
    assert.deepEqual(hashes, prior.hashes, 'Fontes mudaram; campanha nova obrigatória.');
    assert.equal(metadata.browser, prior.browser);
    assert.equal(metadata.cpu, prior.cpu);
  } else {
    await writeFile(path.join(out, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n', {
      flag: 'wx',
    });
    await writeFile(
      path.join(out, 'source-snapshot.json'),
      JSON.stringify(
        Object.fromEntries(
          await Promise.all(
            sourceFiles
              .filter((f) => !f.endsWith('.wasm'))
              .map(async (f) => [f, await readFile(f, 'utf8')]),
          ),
        ),
        null,
        2,
      ) + '\n',
    );
  }
  campaignLoop: for (const profile of profiles)
    for (let round = 1; round <= rounds; round++)
      for (const block of pendingBlocks(ids, profile, round, records)) {
        if (blocks >= maxBlocks) break campaignLoop;
        const restart =
          restartEachBlock ||
          ['equilibrado', 'qualidade'].includes(profile) ||
          previousBlock?.profile !== profile ||
          previousBlock?.round !== round;
        if (blocks++ && restart) {
          audits.push(audit.close());
          await context.close();
          doc = await start();
          assert.equal(doc.browser, metadata.browser);
        }
        previousBlock = { profile, round };
        await context.setOffline(!allowDownload);
        activeBlock = { profile, round };
        await record({
          type: 'block-start',
          profile,
          round,
          ids: block,
          pipeline,
          globalGpuMemory: gpu(),
        });
        let timer;
        const done = new Promise((resolve, reject) => {
          const watchdog = () => {
            clearTimeout(timer);
            timer = setTimeout(() => reject(new Error('BENCHMARK_CASE_TIMEOUT')), 180000);
          };
          watchdog();
          doc.onRecord(async ({ key, value }) => {
            try {
              if (value.type === 'case-start' || value.type === 'load' || value.type === 'progress')
                watchdog();
              if (value.type === 'load') {
                await context.setOffline(true);
                value.globalGpuMemory = gpu();
                value.systemFreeMemoryBytes = os.freemem();
              }
              await record({ ...value, profile, round, pipeline });
              if (['load', 'case', 'fatal'].includes(value.type))
                process.stdout.write(
                  `${value.type} ${profile} r${round} ${value.id ?? ''} ${value.status ?? value.error ?? Math.round(value.coldMs)}\n`,
                );
              await doc.evaluate(`globalThis.__step15dAck(${key});true`);
              if (value.type === 'done') resolve();
              if (value.type === 'fatal') reject(new Error(value.error));
            } catch (error) {
              reject(error);
            }
          });
        });
        await doc.evaluate(
          `void globalThis.__step15dRun(${JSON.stringify({ candidate: profile, ids: block, pipeline, allowDownload, retain: !restartEachBlock && !['equilibrado', 'qualidade'].includes(profile) })},globalThis.__step15dRecord).catch(error=>globalThis.__step15dRecord({type:'fatal',error:String(error)}));true`,
        );
        try {
          await done;
        } catch (error) {
          previousBlock = null;
          await record({
            type: 'interruption',
            profile,
            round,
            ids: block,
            error: String(error),
            executionComplete: false,
          });
          process.stdout.write(`interruption ${profile} r${round} ${error}\n`);
        } finally {
          clearTimeout(timer);
        }
        await record({ type: 'block-end', profile, round, ids: block });
      }
  audits.push(audit.close());
  audit = undefined;
  await networkQueue;
  await writeFile(
    path.join(out, 'environment-end.json'),
    JSON.stringify(
      { endedAt: new Date().toISOString(), errors, audits, globalGpuMemory: gpu() },
      null,
      2,
    ) + '\n',
  );
  process.stdout.write(
    `Campanha ${run}: ${completedCases(records).size}/${profiles.length * rounds * ids.length}\n`,
  );
  if (completedCases(records).size !== profiles.length * rounds * ids.length || errors.length)
    process.exitCode = 2;
} finally {
  audit?.close();
  await context?.close();
}
