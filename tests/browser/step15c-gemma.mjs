/* global document, setTimeout, WebSocket, fetch, Response */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const root = process.cwd();
const executablePath = process.env.STEP15C_CHROME;
if (!executablePath) throw new Error('Defina STEP15C_CHROME (Chrome for Testing com WebGPU).');
const extension = path.join(root, 'dist');
const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json'), 'utf8'));
const out = path.join(root, '.cache', 'step15c');
const controls = process.env.STEP15C_CONTROLS === '1';
const cacheControls = process.env.STEP15C_CACHE === '1';
const consent = process.env.STEP15C_CONSENT === '1';
await mkdir(out, { recursive: true });
const context = await chromium.launchPersistentContext(
  path.join(root, '.cache', 'step15c-chrome'),
  {
    executablePath,
    headless: false,
    serviceWorkers: 'block',
    viewport: { width: 1280, height: 850 },
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [
      '--disable-extensions-except=' + extension,
      '--load-extension=' + extension,
      '--remote-debugging-port=9236',
    ],
  },
);
const report = {
  browser: context.browser().version(),
  version: manifest.version,
  startedAt: new Date().toISOString(),
  checks: {},
  actions: [],
  requests: [],
  consoleEvents: [],
};
// Observe actual Worker requests. Playwright's page request events omit offscreen Workers.
const endpoint = await (await fetch('http://127.0.0.1:9236/json/version')).json();
const socket = new WebSocket(endpoint.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
const pending = new Map();
let sequence = 0;
let offscreenSession;
async function command(sessionId, method, params = {}) {
  const num = ++sequence;
  const promise = new Promise((resolve, reject) => pending.set(num, { resolve, reject }));
  socket.send(JSON.stringify({ id: num, method, params, ...(sessionId ? { sessionId } : {}) }));
  return promise;
}
socket.addEventListener('message', (e) => {
  const m = JSON.parse(e.data),
    key = m.id;
  if (pending.has(key)) {
    const entry = pending.get(key);
    pending.delete(key);
    m.error ? entry.reject(new Error(m.error.message)) : entry.resolve(m.result);
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
  if (m.method === 'Target.targetCreated' || m.method === 'Target.targetInfoChanged')
    discover(m.params.targetInfo);
  if (m.method === 'Target.attachedToTarget') {
    const attached = m.params;
    void (async () => {
      await command(attached.sessionId, 'Network.enable');
      await command(attached.sessionId, 'Runtime.enable');
      if (controls && attached.targetInfo.url.endsWith('/offscreen.html')) {
        offscreenSession = attached.sessionId;
        await command(offscreenSession, 'Runtime.evaluate', {
          expression: `(()=>{
            globalThis.gemmaCancellationCount=0;
            const send=Worker.prototype.postMessage;
            Worker.prototype.postMessage=function(message,...args){
              if(message?.type==='cancel'){
                const key=JSON.stringify(message.binding.key);
                const terminal=event=>{
                  if(event.data.type==='cancelled' && JSON.stringify(event.data.binding.key)===key){
                    this.removeEventListener('message',terminal);
                    globalThis.gemmaCancellationCount++;
                  }
                };
                this.addEventListener('message',terminal);
              }
              return Reflect.apply(send,this,[message,...args]);
            };
          })()`,
        });
      }
      if (attached.targetInfo.type === 'worker') report.checks.workerNetworkObserved = true;
      await command(attached.sessionId, 'Runtime.runIfWaitingForDebugger');
    })();
  }
});
const observed = new Set();
function discover(info) {
  if (!info.url.endsWith('/offscreen.html') || observed.has(info.targetId)) return;
  observed.add(info.targetId);
  void command(undefined, 'Target.autoAttachRelated', {
    targetId: info.targetId,
    waitForDebuggerOnStart: true,
  });
}
await command(undefined, 'Target.setDiscoverTargets', { discover: true });
let pageErrors = 0;
context.on('page', (p) => p.on('pageerror', () => pageErrors++));
context.on('request', (request) => {
  const url = new URL(request.url());
  if (url.protocol === 'https:' && url.hostname !== 'web.whatsapp.com') {
    const record = { origin: url.origin, path: url.pathname, method: request.method() };
    if (!report.requests.some((r) => r.origin === record.origin && r.path === record.path))
      report.requests.push(record);
  }
});
try {
  const manager = await context.newPage();
  await manager.goto('chrome://extensions');
  const dev = manager.locator('extensions-toolbar #devMode');
  await dev.waitFor();
  if ((await dev.getAttribute('aria-checked')) !== 'true') await dev.click();
  const item = manager
    .locator('extensions-item')
    .filter({ has: manager.getByText(manifest.name, { exact: true }) });
  await item.waitFor({ timeout: 15000 });
  const id = await item.getAttribute('id');
  assert(id && /^[a-p]{32}$/u.test(id));
  const toggle = item.locator('#enableToggle');
  if ((await toggle.getAttribute('aria-checked')) !== 'true') await toggle.click();
  await item.locator('#dev-reload-button').click();
  const settings = await context.newPage();
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      await settings.goto('chrome-extension://' + id + '/popup.html');
      break;
    } catch (error) {
      if (attempt === 39) throw error;
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  await settings.waitForFunction(() => !document.querySelector('fieldset')?.disabled);
  await settings.getByLabel('Motor de IA', { exact: true }).focus();
  const preferred = process.env.STEP15C_PREFERRED === '1';
  await settings.getByLabel('Motor de IA', { exact: true }).press(preferred ? 'Home' : 'End');
  await settings.waitForFunction(
    (expected) => document.querySelector('[aria-label="Motor de IA"]')?.value === expected,
    preferred ? 'chrome-preferred' : 'local',
  );
  await settings.waitForFunction(() => !document.querySelector('fieldset')?.disabled);
  await settings.getByLabel('Modelo local e alternativa', { exact: true }).focus();
  await settings.getByLabel('Modelo local e alternativa', { exact: true }).press('End');
  await settings.waitForFunction(
    () => document.querySelector('[aria-label="Modelo local e alternativa"]')?.value === 'gemma',
  );
  await settings.waitForFunction(() => !document.querySelector('fieldset')?.disabled);
  report.preferences = await settings.evaluate(() =>
    chrome.runtime.sendMessage({ target: 'preferences', type: 'get' }),
  );
  assert.equal(report.preferences.localModel, 'gemma');
  assert.equal(report.preferences.version, 5);
  report.hardware = await settings.evaluate(async () => {
    const a = await navigator.gpu.requestAdapter();
    return a
      ? {
          info: {
            vendor: a.info.vendor,
            architecture: a.info.architecture,
            device: a.info.device,
            description: a.info.description,
          },
          features: [...a.features],
          maxBufferSize: a.limits.maxBufferSize,
          maxStorageBufferBindingSize: a.limits.maxStorageBufferBindingSize,
        }
      : null;
  });
  assert(report.hardware);
  await manager.close();
  await context.route('https://web.whatsapp.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html><head><meta charset="utf-8"><style>body{font:16px system-ui}main{height:95vh;display:flex;flex-direction:column}section{flex:1}footer{display:flex;height:72px}footer [role=textbox]{width:75%;background:#eee}</style></head><body><main id="main"><header>Contexto sintético</header><section>Fixture STEP-15-C sem conversa</section><footer><button>Anexar</button><div role="textbox" aria-multiline="true" contenteditable="true">oi mariana vc pode conferir os documento amanhã?</div><button>Áudio</button></footer></main></body></html>',
    }),
  );
  const page = await context.newPage();
  await (
    await context.newCDPSession(page)
  ).send('Network.setBypassServiceWorker', { bypass: true });
  await page.goto('https://web.whatsapp.com/?step15c=fixture');
  await page.getByText('Fixture STEP-15-C sem conversa', { exact: true }).waitFor();
  if (process.env.STEP15C_OFFLINE === '1') await context.setOffline(true);
  const draft = page.locator('#main footer [role=textbox]');
  const original = await draft.innerText();
  const preview = page.getByLabel('Texto da sugestão');
  await page.locator('[data-local-writing-host] button.launcher').click();
  await page.getByRole('button', { name: 'Corrigir com IA local', exact: true }).click();
  let downloaded = false;
  const before = Date.now();
  let lastProgress = '';
  for (let i = 0; i < 600; i++) {
    if (await preview.count()) break;
    const confirmation = page.getByRole('button', { name: 'Baixar e continuar', exact: true });
    if (await confirmation.count()) {
      assert(!downloaded);
      downloaded = true;
      report.checks.explicitDownload = true;
      await confirmation.click();
    }
    const state = await page.locator('.preview-panel').innerText();
    if (state.includes('Não foi possível') || state.includes('não oferece')) throw new Error(state);
    const progress = (await page.locator('.preview-panel [role=status]').allTextContents()).join(
      ' ',
    );
    if (progress !== lastProgress) {
      process.stdout.write(progress + '\n');
      lastProgress = progress;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert(await preview.count(), 'Modelo não retornou sugestão no período observado.');
  report.coldPreparationAndGenerationMs = Date.now() - before;
  report.actions.push({
    action: 'Corrigir',
    text: await preview.innerText(),
    totalMs: report.coldPreparationAndGenerationMs,
  });
  assert((await page.locator('.preview-panel').innerText()).includes(' · transformers'));
  assert.equal(await draft.innerText(), original);
  report.checks.realGemmaWebGPU = true;
  if (preferred) {
    report.nativeStatus = await settings.evaluate(() =>
      chrome.runtime.sendMessage({ target: 'chrome-ai', type: 'status' }),
    );
    assert.notEqual(
      report.nativeStatus.actions.find((row) => row.action === 'corrigir').availability,
      'available',
    );
    report.checks.chromeUnavailableGemmaFallback = true;
  }
  await page.screenshot({ path: path.join(out, 'preview.png'), caret: 'initial' });
  await context.setOffline(true);
  report.checks.offline = true;
  await page.getByRole('button', { name: /^Substituir(?: mesmo assim)?$/u }).click();
  await preview.waitFor({ state: 'hidden' });
  assert.notEqual(await draft.innerText(), original);
  await draft.focus();
  await draft.press('Control+z');
  assert.equal(await draft.innerText(), original);
  report.checks.manualReplacementUndo = true;
  for (const label of controls || cacheControls || consent
    ? []
    : [
        'Melhorar',
        'Formal',
        'Profissional',
        'Amigável',
        'Natural',
        'Conciso',
        'Engraçado',
        'Reescrever',
      ]) {
    await page.locator('[data-local-writing-host] button.launcher').click();
    const start = Date.now();
    await page.getByRole('button', { name: label + ' com IA local', exact: true }).click();
    await preview.waitFor({ timeout: 180000 });
    assert((await preview.innerText()).trim());
    assert.equal(await draft.innerText(), original);
    report.actions.push({
      action: label,
      text: await preview.innerText(),
      totalMs: Date.now() - start,
      warnings: await page.locator('.suggestion-warnings ul li').allTextContents(),
    });
    process.stdout.write(label + ': ' + (Date.now() - start) + ' ms\n');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await preview.waitFor({ state: 'hidden' });
  }
  if (!controls && !cacheControls && !consent) report.checks.allActions = true;
  if (controls) {
    async function cancellationCount() {
      assert(offscreenSession);
      const state = await command(offscreenSession, 'Runtime.evaluate', {
        expression: 'globalThis.gemmaCancellationCount',
        returnByValue: true,
      });
      assert.equal(typeof state.result.value, 'number');
      return state.result.value;
    }
    async function status() {
      return settings.evaluate(() =>
        chrome.runtime.sendMessage({ target: 'gemma-cache', type: 'status', variant: 'q4f16' }),
      );
    }
    assert.equal((await status()).runtime, 'loaded');
    await page.locator('[data-local-writing-host] button.launcher').click();
    await page.getByRole('button', { name: 'Testar IA local', exact: true }).click();
    await page
      .getByLabel('Resposta do teste de IA local', { exact: true })
      .waitFor({ timeout: 60000 });
    report.proof = await page
      .getByLabel('Resposta do teste de IA local', { exact: true })
      .innerText();
    assert.equal(report.proof, 'TESTE');
    report.checks.modelProof = true;
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await settings
      .getByLabel('Mostrar botão Analisar sentido na prévia (opcional, mais lento)', {
        exact: true,
      })
      .check();
    await settings.waitForFunction(() => !document.querySelector('fieldset')?.disabled);
    await page.locator('[data-local-writing-host] button.launcher').click();
    await page.getByRole('button', { name: 'Corrigir com IA local', exact: true }).click();
    await preview.waitFor({ timeout: 60000 });
    const beforeReview = await preview.innerText();
    await page.getByRole('button', { name: 'Analisar sentido', exact: true }).click();
    await page
      .getByText('Análise adicional concluída. Revise os avisos.', { exact: true })
      .waitFor({ timeout: 60000 });
    assert.equal(await preview.innerText(), beforeReview);
    report.review = await page.locator('.suggestion-warnings').innerText();
    report.checks.manualSemanticReview = true;
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await draft.fill(
      'mariana não confirme ainda, preciso revisar os documentos e conversar com o pessoal antes de decidir.',
    );
    await page.locator('[data-local-writing-host] button.launcher').click();
    await page.getByRole('button', { name: 'Formal com IA local', exact: true }).click();
    await page.getByLabel('Texto em geração', { exact: true }).waitFor({ timeout: 60000 });
    report.checks.streaming = true;
    const second = await context.newPage();
    await second.goto('https://web.whatsapp.com/?step15c=second');
    await second.locator('[data-local-writing-host] button.launcher').click();
    await second.getByRole('button', { name: 'Corrigir com IA local', exact: true }).click();
    await second
      .getByText('IA ocupada. Tente novamente quando o pedido atual terminar.', { exact: true })
      .waitFor();
    report.checks.concurrency = true;
    const cancelledBefore = await cancellationCount();
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.locator('.preview-panel').waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('button', { name: /^Substituir/u }).count(), 0);
    await second.close();
    report.checks.cancelledApplicationBlocked = true;
    // Fechar a UI é imediato; o próximo pedido precisa esperar a confirmação real do Worker.
    for (let attempt = 0; attempt < 100; attempt++) {
      if ((await cancellationCount()) > cancelledBefore) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert((await cancellationCount()) > cancelledBefore);
    report.checks.workerCancellationAcknowledged = true;
    await draft.fill('outro rascunho sintético para a ação seguinte');
    await page.locator('[data-local-writing-host] button.launcher').click();
    await page.getByRole('button', { name: 'Formal com IA local', exact: true }).click();
    await page.getByLabel('Texto em geração', { exact: true }).waitFor({ timeout: 60000 });
    await draft.fill('Rascunho sintético modificado.');
    await page
      .getByText('O rascunho ou a conversa mudou. Feche e crie uma nova prévia.', { exact: true })
      .waitFor();
    assert.equal(await page.getByRole('button', { name: /^Substituir/u }).count(), 0);
    report.checks.staleBlocked = true;
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await settings.getByLabel('Modelo local e alternativa', { exact: true }).focus();
    await settings.getByLabel('Modelo local e alternativa', { exact: true }).press('Home');
    await settings.waitForFunction(
      () =>
        !document.querySelector('fieldset')?.disabled &&
        document.querySelector('[aria-label="Modelo local e alternativa"]')?.value === 'webllm',
    );
    assert.equal((await status()).runtime, 'released');
    assert((await status()).cached);
    report.checks.modelSwitchUnload = true;
    await settings.getByLabel('Modelo local e alternativa', { exact: true }).focus();
    await settings.getByLabel('Modelo local e alternativa', { exact: true }).press('End');
    await settings.waitForFunction(
      () =>
        !document.querySelector('fieldset')?.disabled &&
        document.querySelector('[aria-label="Modelo local e alternativa"]')?.value === 'gemma',
    );
    await page.locator('[data-local-writing-host] button.launcher').click();
    await page.getByRole('button', { name: 'Corrigir com IA local', exact: true }).click();
    await preview.waitFor({ timeout: 180000 });
    assert(!(await preview.innerText()).toLowerCase().includes('mariana'));
    report.checks.requestIsolation = true;
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    if (process.env.STEP15C_SKIP_IDLE !== '1') {
      const idleStart = Date.now();
      process.stdout.write('Validando liberação Gemma após cinco minutos.\n');
      for (let i = 0; i < 34; i++) {
        await new Promise((r) => setTimeout(r, 10000));
        if ((await status()).runtime === 'released') {
          report.checks.idleRelease = true;
          break;
        }
      }
      report.idleMs = Date.now() - idleStart;
      assert(report.checks.idleRelease);
      assert(report.idleMs >= 290000);
    }
    await settings.getByRole('button', { name: 'Liberar Gemma', exact: true }).click();
    await settings
      .getByText('Worker do Gemma liberado. Cache preservado.', { exact: true })
      .waitFor();
    assert.equal((await status()).runtime, 'released');
    assert((await status()).cached);
    report.checks.unloadPreservesCache = true;
  }
  if (cacheControls) {
    async function status() {
      return settings.evaluate(() =>
        chrome.runtime.sendMessage({ target: 'gemma-cache', type: 'status', variant: 'q4f16' }),
      );
    }
    const beforePreferences = await settings.evaluate(() => chrome.storage.local.get(null));
    await settings.evaluate(async () => {
      const c = await caches.open('step15c-unrelated');
      await c.put('https://example.com/preserved', new Response('fixture'));
    });
    await settings.getByRole('button', { name: 'Apagar arquivos do Gemma', exact: true }).click();
    await settings.getByRole('button', { name: 'Confirmar remoção do Gemma', exact: true }).click();
    await settings
      .getByText('Arquivos selecionados do Gemma removidos. Preferências preservadas.', {
        exact: true,
      })
      .waitFor();
    assert(!(await status()).cached);
    assert.equal((await status()).runtime, 'released');
    assert.deepEqual(
      await settings.evaluate(() => chrome.storage.local.get(null)),
      beforePreferences,
    );
    report.checks.removeCache = true;
    assert(
      await settings.evaluate(async () =>
        Boolean(
          await (await caches.open('step15c-unrelated')).match('https://example.com/preserved'),
        ),
      ),
    );
    report.checks.unrelatedCachePreserved = true;
    await context.setOffline(false);
    await page.locator('[data-local-writing-host] button.launcher').click();
    await page.getByRole('button', { name: 'Corrigir com IA local', exact: true }).click();
    await page.getByRole('button', { name: 'Baixar e continuar', exact: true }).waitFor();
    assert.equal(report.requests.filter((r) => r.origin.startsWith('https://')).length, 0);
    report.checks.noSilentRedownload = true;
    await page.getByRole('button', { name: 'Baixar e continuar', exact: true }).click();
    await page
      .getByText(/Baixando modelo\.\.\. [1-9]\d*% da etapa atual/u)
      .waitFor({ timeout: 180000 });
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.locator('.preview-panel').waitFor({ state: 'hidden' });
    await new Promise((r) => setTimeout(r, 3000));
    assert(!(await status()).cached);
    report.checks.interruptedDownload = true;
    report.partialCache = await settings.evaluate(async () =>
      (await (await caches.open('local-writing/gemma')).keys()).map((r) =>
        new URL(r.url).pathname.split('/').at(-1),
      ),
    );
    assert(!report.partialCache.some((name) => name.endsWith('.onnx_data')));
    await page.locator('[data-local-writing-host] button.launcher').click();
    await page.getByRole('button', { name: 'Corrigir com IA local', exact: true }).click();
    await page.getByRole('button', { name: 'Baixar e continuar', exact: true }).waitFor();
    const restarted = Date.now();
    await page.getByRole('button', { name: 'Baixar e continuar', exact: true }).click();
    let last = '';
    for (let i = 0; i < 600 && !(await preview.count()); i++) {
      const state = await page.locator('.preview-panel').innerText();
      if (state.includes('Não foi possível')) throw new Error(state);
      const progress = (await page.locator('.preview-panel [role=status]').allTextContents()).join(
        ' ',
      );
      if (last !== progress) {
        process.stdout.write(progress + '\n');
        last = progress;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    assert(await preview.count());
    assert((await status()).cached);
    report.explicitRestoreMs = Date.now() - restarted;
    report.checks.explicitRestore = true;
    assert.equal(await draft.innerText(), original);
    report.cacheInventory = await settings.evaluate(async () => {
      const result = {};
      for (const name of await caches.keys()) {
        const c = await caches.open(name);
        result[name] = (await c.keys()).map((r) => new URL(r.url).pathname);
      }
      return result;
    });
    report.checks.canonicalWeightsOnly =
      report.cacheInventory['local-writing/gemma'].length === 9 &&
      !('transformers-cache' in report.cacheInventory);
    assert(report.checks.canonicalWeightsOnly);
    assert(report.checks.workerNetworkObserved);
    assert(
      report.requests.every(
        (r) =>
          r.method === 'GET' &&
          !r.hasPostData &&
          (r.origin.startsWith('chrome-extension://') ||
            ['https://huggingface.co', 'https://us.aws.cdn.hf.co'].includes(r.origin)),
      ),
    );
    report.checks.networkAudit = true;
    await settings.evaluate(() => caches.delete('step15c-unrelated'));
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await settings.getByLabel('Motor de IA', { exact: true }).focus();
    await settings.getByLabel('Motor de IA', { exact: true }).press('Home');
    await settings.waitForFunction(
      () =>
        !document.querySelector('fieldset')?.disabled &&
        document.querySelector('[aria-label="Motor de IA"]')?.value === 'chrome-preferred',
    );
    await page.locator('[data-local-writing-host] button.launcher').click();
    await page.getByRole('button', { name: 'Corrigir com IA local', exact: true }).click();
    await preview.waitFor({ timeout: 60000 });
    assert((await page.locator('.preview-panel').innerText()).includes(' · transformers'));
    report.checks.chromeUnavailableGemmaFallback = true;
  }
  if (consent) {
    await settings.getByRole('button', { name: 'Liberar Gemma', exact: true }).click();
    await settings
      .getByText('Worker do Gemma liberado. Cache preservado.', { exact: true })
      .waitFor();
    await settings.evaluate(async () => {
      const c = await caches.open('local-writing/gemma');
      const url = (await c.keys()).find((r) => r.url.endsWith('/config.json')).url;
      globalThis.gemmaConfigBackup = { url, response: await c.match(url) };
      await c.delete(url);
    });
    try {
      await page.locator('[data-local-writing-host] button.launcher').click();
      await page.getByRole('button', { name: 'Corrigir com IA local', exact: true }).click();
      await page.getByRole('button', { name: 'Baixar e continuar', exact: true }).waitFor();
      report.downloadDetails = await page.locator('.preview-panel').innerText();
      assert(report.downloadDetails.includes('Gemma 4 E2B (q4f16)'));
      assert(report.downloadDetails.includes('3.13 GB'));
      assert(!report.downloadDetails.includes('Llama'));
      assert(!report.requests.some((r) => r.origin.startsWith('https://')));
      report.checks.correctDownloadDisclosure = true;
      await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    } finally {
      await settings.evaluate(async () => {
        const b = globalThis.gemmaConfigBackup;
        await (await caches.open('local-writing/gemma')).put(b.url, b.response);
        delete globalThis.gemmaConfigBackup;
      });
    }
  }
  report.storage = await settings.evaluate(() => chrome.storage.local.get(null));
  assert.deepEqual(Object.keys(report.storage), ['writingPreferences']);
  report.pageErrors = pageErrors;
  assert.equal(pageErrors, 0);
  report.completedAt = new Date().toISOString();
  await writeFile(
    path.join(
      out,
      consent
        ? 'consent.json'
        : cacheControls
          ? 'cache.json'
          : controls
            ? 'controls.json'
            : 'result.json',
    ),
    JSON.stringify(report, null, 2) + '\n',
  );
  process.stdout.write('Validação Gemma concluída.\n');
} catch (error) {
  report.error = error.message;
  const fixture = context
    .pages()
    .find((p) => p.url().startsWith('https://web.whatsapp.com/?step15c='));
  if (fixture) {
    report.ui = await fixture.locator('.preview-panel').allTextContents();
    await fixture.screenshot({
      path: path.join(out, 'failed-' + Date.now() + '.png'),
      caret: 'initial',
    });
  }
  await writeFile(
    path.join(out, 'attempt-' + Date.now() + '.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  throw error;
} finally {
  socket.close();
  await context.close();
}
