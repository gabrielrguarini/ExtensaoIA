/* global document, WebSocket, fetch */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const root = process.cwd();
const executablePath = process.env.STEP15E_CHROME;
const engine = process.env.STEP15E_ENGINE ?? 'chrome';
if (!executablePath) throw new Error('Defina STEP15E_CHROME.');
assert(['chrome', 'webllm', 'gemma'].includes(engine));
const regular = process.env.STEP15E_REGULAR === '1';
const extension = path.join(root, 'dist');
const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json'), 'utf8'));
const profile =
  process.env.STEP15E_PROFILE ??
  (engine === 'gemma' ? 'step15c-chrome' : regular ? 'step15b-chrome' : 'step15-isolated');
assert(/^[a-z0-9-]+$/u.test(profile), 'Use somente um perfil dedicado dentro de .cache.');
const out = path.join(root, '.cache', 'step15e');
await mkdir(out, { recursive: true });
const context = await chromium.launchPersistentContext(path.join(root, '.cache', profile), {
  executablePath,
  headless: false,
  serviceWorkers: 'block',
  viewport: { width: 1280, height: 850 },
  ignoreDefaultArgs: ['--disable-extensions'],
  args: [
    '--disable-component-update',
    '--remote-debugging-port=9241',
    ...(regular
      ? ['--enable-unsafe-extension-debugging']
      : ['--disable-extensions-except=' + extension, '--load-extension=' + extension]),
  ],
});
const report = {
  version: manifest.version,
  browser: context.browser().version(),
  engine,
  profile,
  startedAt: new Date().toISOString(),
  syntheticFixture: true,
  noMessageSent: true,
  checks: {},
  requests: [],
  consoleEvents: [],
  observerErrors: [],
};
let pageErrors = 0;
context.on('page', (p) => p.on('pageerror', () => pageErrors++));
const endpoint = await (await fetch('http://127.0.0.1:9241/json/version')).json();
const socket = new WebSocket(endpoint.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
let sequence = 0;
const pending = new Map();
function command(sessionId, method, params = {}) {
  const id = ++sequence;
  const promise = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  return promise;
}
const observed = new Set();
function discover(info) {
  if (!info.url.endsWith('/offscreen.html') || observed.has(info.targetId)) return;
  observed.add(info.targetId);
  void command(undefined, 'Target.autoAttachRelated', {
    targetId: info.targetId,
    waitForDebuggerOnStart: true,
  }).catch(() => report.observerErrors.push('attach'));
}
socket.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (pending.has(m.id)) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
  }
  if (m.method === 'Network.requestWillBeSent') {
    const req = m.params.request,
      url = new URL(req.url);
    report.requests.push({
      origin: url.origin === 'null' ? url.protocol + '//' + url.host : url.origin,
      path: url.pathname,
      method: req.method,
      hasPostData: Boolean(req.hasPostData),
    });
  }
  if (m.method === 'Runtime.consoleAPICalled')
    report.consoleEvents.push({ type: m.params.type, arguments: m.params.args.length });
  if (m.method === 'Runtime.exceptionThrown') report.observerErrors.push('runtime-exception');
  if (m.method === 'Target.targetCreated' || m.method === 'Target.targetInfoChanged')
    discover(m.params.targetInfo);
  if (m.method === 'Target.attachedToTarget') {
    const a = m.params;
    void (async () => {
      try {
        await command(a.sessionId, 'Network.enable');
        await command(a.sessionId, 'Runtime.enable');
        if (a.targetInfo.type === 'worker') report.checks.workerObserved = true;
      } catch {
        report.observerErrors.push('enable');
      } finally {
        await command(a.sessionId, 'Runtime.runIfWaitingForDebugger');
      }
    })();
  }
});
await command(undefined, 'Target.setDiscoverTargets', { discover: true });
try {
  if (regular)
    await (
      await context.browser().newBrowserCDPSession()
    ).send('Extensions.loadUnpacked', { path: extension });
  const manager = await context.newPage();
  await manager.goto('chrome://extensions');
  const dev = manager.locator('extensions-toolbar #devMode');
  await dev.waitFor();
  if ((await dev.getAttribute('aria-checked')) !== 'true') await dev.click();
  const item = manager
    .locator('extensions-item')
    .filter({ has: manager.getByText(manifest.name, { exact: true }) });
  await item.waitFor();
  const id = await item.getAttribute('id');
  assert(id && /^[a-p]{32}$/u.test(id));
  const toggle = item.locator('#enableToggle');
  if ((await toggle.getAttribute('aria-checked')) !== 'true') await toggle.click();
  await item.locator('#dev-reload-button').click();
  const settings = await context.newPage();
  await settings.goto('chrome-extension://' + id + '/popup.html');
  await settings.waitForFunction(() => !document.querySelector('fieldset')?.disabled);
  // A análise estava ligada na instalação anterior. A migração real precisa descartá-la.
  await settings.evaluate(async (engine) => {
    const current = await chrome.runtime.sendMessage({ target: 'preferences', type: 'get' });
    await chrome.storage.local.set({
      writingPreferences: {
        ...current,
        version: 5,
        semanticReview: true,
        engine: engine === 'chrome' ? 'chrome-preferred' : 'local',
        localModel: engine === 'gemma' ? 'gemma' : 'webllm',
        chromePortuguesePrompt: engine === 'chrome',
        profile: 'economico',
        theme: 'dark',
      },
    });
    await chrome.runtime.sendMessage({ target: 'preferences', type: 'get' });
  }, engine);
  await settings.reload();
  await settings.waitForFunction(() => !document.querySelector('fieldset')?.disabled);
  report.preferences = await settings.evaluate(() =>
    chrome.runtime.sendMessage({ target: 'preferences', type: 'get' }),
  );
  assert.equal(report.preferences.version, 6);
  assert(!('semanticReview' in report.preferences));
  assert.equal(report.preferences.theme, 'dark');
  assert.equal(report.preferences.profile, 'economico');
  assert(!(await settings.locator('fieldset').innerText()).includes('Analisar sentido'));
  report.checks.legacyPreferenceRemoved = true;
  await context.route('https://web.whatsapp.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html><head><meta charset="utf-8"><style>body{font:16px system-ui}main{height:95vh;display:flex;flex-direction:column}section{flex:1}footer{display:flex;height:72px}footer [role=textbox]{width:75%;background:#eee}</style></head><body><main id="main"><header>Contexto sintético</header><section>Fixture STEP-15-E sem conversa</section><footer><button>Anexar</button><div role="textbox" aria-multiline="true" contenteditable="true"></div><button>Áudio</button></footer></main></body></html>',
    }),
  );
  const page = await context.newPage();
  await (
    await context.newCDPSession(page)
  ).send('Network.setBypassServiceWorker', { bypass: true });
  await page.goto('https://web.whatsapp.com/?step15e=fixture');
  await page.getByText('Fixture STEP-15-E sem conversa', { exact: true }).waitFor();
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: 'https://web.whatsapp.com',
  });
  await context.setOffline(true);
  const original = 'fazendo o teste da extensao apra ver se funciona de verdade';
  const draft = page.locator('#main footer [role=textbox]');
  await draft.fill(original);
  await page.locator('[data-local-writing-host] button.launcher').click();
  await page.getByRole('button', { name: 'Corrigir com IA local', exact: true }).click();
  const preview = page.getByLabel('Texto da sugestão');
  await preview.waitFor({ timeout: 240000 });
  const output = await preview.innerText();
  assert(output.trim());
  const panel = await page.locator('.preview-panel').innerText();
  assert(panel.includes(' · ' + (engine === 'gemma' ? 'transformers' : engine)));
  assert(!/Possível|Nenhum risco|Analisar sentido|Substituir mesmo assim|avisos/iu.test(panel));
  assert.equal(await draft.innerText(), original);
  assert.equal(
    await page.getByRole('button', { name: 'Substituir', exact: true }).isEnabled(),
    true,
  );
  assert.equal(await page.locator('.suggestion-warnings').count(), 0);
  await page.getByRole('button', { name: 'Copiar', exact: true }).click();
  await page.getByText('Sugestão copiada.', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), output);
  assert.equal(await draft.innerText(), original);
  await page.screenshot({ path: path.join(out, engine + '-preview.png'), caret: 'initial' });
  await page.getByRole('button', { name: 'Substituir', exact: true }).click();
  await preview.waitFor({ state: 'hidden' });
  assert.equal(await draft.innerText(), output);
  await draft.focus();
  await draft.press('Control+z');
  assert.equal(await draft.innerText(), original);
  report.checks.readablePreviewWithoutAssessment = true;
  report.checks.copy = true;
  report.checks.manualReplacementAndUndo = true;
  report.syntheticInput = original;
  report.syntheticOutput = output;
  report.offline = true;
  await page.locator('[data-local-writing-host] button.launcher').click();
  await page.getByRole('button', { name: 'Corrigir com IA local', exact: true }).click();
  await draft.fill('Rascunho sintético alterado durante o pedido.');
  await page
    .getByText('O rascunho ou a conversa mudou. Feche e crie uma nova prévia.', { exact: true })
    .waitFor();
  assert.equal(await page.getByRole('button', { name: 'Substituir', exact: true }).count(), 0);
  assert.equal(await draft.innerText(), 'Rascunho sintético alterado durante o pedido.');
  report.checks.staleDraftBlocksApplication = true;
  const storage = await settings.evaluate(() => chrome.storage.local.get(null));
  assert.deepEqual(Object.keys(storage), ['writingPreferences']);
  assert(!JSON.stringify(storage).includes(original));
  report.checks.storageOnlyPreferences = true;
  assert(
    report.requests.every(
      (r) => r.origin === 'chrome-extension://' + id && r.method === 'GET' && !r.hasPostData,
    ),
  );
  assert.equal(pageErrors, 0);
  assert.deepEqual(report.observerErrors, []);
  if (engine !== 'chrome') assert.equal(report.checks.workerObserved, true);
  report.pageErrors = pageErrors;
  report.finishedAt = new Date().toISOString();
  await writeFile(path.join(out, engine + '.json'), JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify(report) + '\n');
} finally {
  socket.close();
  await context.close();
}
