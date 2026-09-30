/* global document, Response, setTimeout, clearTimeout, fetch, WebSocket */
import { chromium } from 'playwright-core';
import path from 'node:path';

const root = process.cwd();
const mode = process.argv[2] ?? 'offline';
if (!['offline', 'lifecycle', 'recovery', 'repair'].includes(mode))
  throw new Error('Modo inválido.');
const executablePath = process.env.STEP13_CHROME;
if (!executablePath) throw new Error('Defina STEP13_CHROME.');
const profile = path.resolve(
  process.env.STEP13_PROFILE ?? path.join(root, '.cache', 'step13-isolated'),
);
const extension = path.join(root, 'dist');
if (path.basename(profile) !== 'step13-isolated')
  throw new Error('Use somente o perfil sintético step13-isolated, sem autenticação.');
const options = {
  executablePath,
  headless: false,
  serviceWorkers: 'block',
  viewport: { width: 1280, height: 800 },
  ...(mode === 'offline' ? { proxy: { server: 'http://127.0.0.1:9' } } : {}),
  args: [
    '--remote-debugging-address=127.0.0.1',
    '--remote-debugging-port=9338',
    `--disable-extensions-except=${extension}`,
    `--load-extension=${extension}`,
  ],
};
const bootstrap = await chromium.launchPersistentContext(profile, options);
try {
  const worker = bootstrap.serviceWorkers()[0] ?? (await bootstrap.waitForEvent('serviceworker'));
  try {
    await worker.evaluate(() => chrome.runtime.reload());
  } catch {
    /* reload */
  }
} finally {
  await bootstrap.close();
}
const browser = await chromium.launchPersistentContext(profile, options);
let errors = 0;
const output = (value) => process.stdout.write(JSON.stringify(value) + '\n');
try {
  const sw = browser.serviceWorkers()[0] ?? (await browser.waitForEvent('serviceworker'));
  const diagnostic = await browser.newPage();
  await diagnostic.goto(`chrome-extension://${new URL(sw.url()).host}/diagnostic.html`);
  output({
    browser: browser.browser().version(),
    hardware: await diagnostic.evaluate(async () => {
      const adapter = await navigator.gpu?.requestAdapter();
      return adapter
        ? {
            vendor: adapter.info.vendor,
            architecture: adapter.info.architecture,
            shaderF16: adapter.features.has('shader-f16'),
          }
        : null;
    }),
  });
  const inventory = () =>
    diagnostic.evaluate(async () => {
      const cache = await caches.open('webllm/model');
      const keys = await cache.keys();
      const indexKey = keys.find(
        (key) =>
          key.url.includes('Llama-3.2-3B-Instruct-q4f16_1-MLC/resolve/1e80') &&
          key.url.endsWith('/tensor-cache.json'),
      );
      const index = indexKey ? await (await cache.match(indexKey)).json() : null;
      return {
        count: keys.length,
        index: indexKey?.url,
        shardFields: index ? Object.keys(index.records[0]) : [],
        preferences: await chrome.storage.local.get(null),
      };
    });
  output({ mode, before: await inventory() });
  await browser.route('https://web.whatsapp.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `<!doctype html><html><head><style>body{font:16px system-ui}main{height:95vh;display:flex;flex-direction:column}section{flex:1}footer{display:flex;height:72px}footer [role=textbox]{width:75%;background:#eee}</style></head><body><main id="main"><header>Contexto sintético</header><section>Fixture STEP-13 sem conversa</section><footer><button>Anexar</button><div role="textbox" aria-multiline="true" contenteditable="true">Rascunho sintético de teste.</div><button>Áudio</button></footer></main></body></html>`,
    }),
  );
  const page = await browser.newPage();
  page.on('pageerror', () => errors++);
  const siteCdp = await browser.newCDPSession(page);
  await siteCdp.send('Network.setBypassServiceWorker', { bypass: true });
  await page.goto('https://web.whatsapp.com/?step13=fixture');
  await page.getByText('Fixture STEP-13 sem conversa', { exact: true }).waitFor();
  const launcher = page.locator('[data-local-writing-host] button.launcher');
  const result = page.getByLabel('Resposta do teste de IA local');
  const cancel = page.getByRole('button', { name: 'Cancelar', exact: true });
  async function menu() {
    if (await cancel.isVisible()) await cancel.click();
    await launcher.click();
    const selector = page.getByLabel('Perfil de IA local');
    await selector.waitFor();
    await selector.focus();
    await selector.press('Home');
    await selector.press('Enter');
    await page.waitForFunction(
      () =>
        document.querySelector('[data-local-writing-host]')?.shadowRoot?.querySelector('select')
          ?.disabled === false,
    );
  }
  async function proof(allowDownload = false) {
    const started = Date.now();
    await page.getByRole('button', { name: 'Testar IA local', exact: true }).click();
    if (allowDownload) {
      await Promise.race([
        result.waitFor({ timeout: 180_000 }),
        page.getByRole('button', { name: 'Baixar e continuar' }).waitFor({ timeout: 180_000 }),
      ]);
      const download = page.getByRole('button', { name: 'Baixar e continuar' });
      if (await download.isVisible()) await download.click();
    }
    await Promise.race([
      result.waitFor({ timeout: 600_000 }),
      page
        .locator('[data-local-writing-host] p[role=alert]')
        .waitFor({ timeout: 600_000 })
        .then(async () => {
          throw new Error(
            `Prova recusada: ${await page.locator('[data-local-writing-host] p[role=alert]').textContent()}`,
          );
        }),
    ]);
    if (!(await result.textContent())?.includes('TESTE')) throw new Error('Prova inválida.');
    return Date.now() - started;
  }
  const cdp = await browser.browser().newBrowserCDPSession();
  const workers = async () =>
    (await cdp.send('Target.getTargets')).targetInfos.filter((target) => target.type === 'worker');
  async function workerEval(targetId, expression) {
    if (path.basename(profile) !== 'step13-isolated')
      throw new Error('Depuração requer o perfil exclusivo e sem autenticação step13-isolated.');
    const { webSocketDebuggerUrl } = await (
      await fetch('http://127.0.0.1:9338/json/version')
    ).json();
    const socket = new WebSocket(webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.onopen = resolve;
      socket.onerror = reject;
    });
    let id = 0;
    const pending = new Map();
    let childSession;
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (
        message.method === 'Target.attachedToTarget' &&
        message.params.targetInfo.type === 'worker'
      )
        childSession = message.params.sessionId;
      const waiting = pending.get(message.id);
      if (!waiting) return;
      pending.delete(message.id);
      if (message.error) waiting.reject(new Error(message.error.message));
      else waiting.resolve(message.result);
    };
    function send(method, params = {}, sessionId) {
      const requestId = ++id;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(requestId);
          reject(new Error('CDP timeout: ' + method));
        }, 10000);
        pending.set(requestId, {
          resolve: (value) => {
            clearTimeout(timer);
            resolve(value);
          },
          reject: (error) => {
            clearTimeout(timer);
            reject(error);
          },
        });
        socket.send(
          JSON.stringify({ id: requestId, method, params, ...(sessionId ? { sessionId } : {}) }),
        );
      });
    }
    try {
      const targets = (await send('Target.getTargets')).targetInfos;
      const parent = targets.find((target) => target.url.endsWith('/offscreen.html'));
      if (!parent || !targets.some((target) => target.targetId === targetId))
        throw new Error('Alvo offscreen/Worker ausente.');
      const { sessionId: parentSession } = await send('Target.attachToTarget', {
        targetId: parent.targetId,
        flatten: true,
      });
      await send(
        'Target.setAutoAttach',
        { autoAttach: true, waitForDebuggerOnStart: false, flatten: true },
        parentSession,
      );
      const deadline = Date.now() + 5000;
      while (!childSession && Date.now() < deadline) await page.waitForTimeout(100);
      const sessionId = childSession;
      if (!sessionId) throw new Error('Worker filho ausente.');
      await send('Runtime.enable', {}, sessionId);
      await send('Runtime.runIfWaitingForDebugger', {}, sessionId);
      const result = await send(
        'Runtime.evaluate',
        { expression, awaitPromise: true, returnByValue: true },
        sessionId,
      );
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      await send('Target.detachFromTarget', { sessionId: parentSession });
      return result.result?.value;
    } finally {
      socket.close();
    }
  }
  await menu();
  const coldMs = await proof(mode !== 'offline');
  const first = await workers();
  if (first.length !== 1) throw new Error('Esperado um Worker.');
  await menu();
  const warmMs = await proof();
  if ((await workers())[0]?.targetId !== first[0].targetId)
    throw new Error('Sessão não reutilizada.');
  output({ mode, coldMs, warmMs, sessionReused: true, proof: 'TESTE', errors });
  if (mode === 'lifecycle' || mode === 'recovery') {
    const idleStart = Date.now();
    if (mode === 'recovery') {
      await sw.evaluate(() => chrome.runtime.sendMessage({ target: 'offscreen', type: 'reset' }));
      while ((await workers()).length && Date.now() - idleStart < 5_000)
        await page.waitForTimeout(100);
    }
    while (mode === 'lifecycle' && (await workers()).length && Date.now() - idleStart < 330_000)
      await page.waitForTimeout(1000);
    const idleMs = Date.now() - idleStart;
    if ((await workers()).length || (mode === 'lifecycle' && idleMs < 290_000))
      throw new Error('Inatividade de cinco minutos não comprovada.');
    await menu();
    output({ idleMs, workerReleased: true, cacheRetained: true, mode });
    if (mode === 'lifecycle') {
      const reloadedMs = await proof();
      output({ idleMs, workerReleased: true, cacheRetained: true, reloadedMs });
    } else {
      const reloading = proof().then(
        (ms) => ({ ms }),
        (error) => ({ error }),
      );
      let next;
      const waitUntil = Date.now() + 15_000;
      while (!next && Date.now() < waitUntil) {
        next = (await workers())[0];
        if (!next) await page.waitForTimeout(100);
      }
      if (!next) throw new Error('Worker não criado.');
      const hooked = await workerEval(
        next.targetId,
        `(() => { const original=GPUAdapter.prototype.requestDevice; GPUAdapter.prototype.requestDevice=async function(...args){ const device=await original.apply(this,args); globalThis.__step13Device=device; return device; }; return true; })()`,
      );
      if (!hooked) throw new Error('Instrumentação GPU não instalada.');
      const reloaded = await reloading;
      if (reloaded.error) throw reloaded.error;
      const reloadedMs = reloaded.ms;
      output({ idleMs, workerReleased: true, cacheRetained: true, reloadedMs });
      await menu();
      const gpuEditor = page.locator('#main footer [role=textbox]');
      await gpuEditor.fill(
        'Preciso confirmar a revisão do documento até amanhã. '.repeat(10).trim(),
      );
      const gpuOriginal = await gpuEditor.textContent();
      await page.getByRole('button', { name: 'Reescrever com IA local', exact: true }).click();
      await page.getByLabel('Texto em geração').waitFor({ timeout: 180_000 });
      const destroyed = await workerEval(
        next.targetId,
        `(() => { if(!globalThis.__step13Device)return false; globalThis.__step13Device.destroy(); return true; })()`,
      );
      if (!destroyed) throw new Error('Dispositivo real não capturado.');
      await page.locator('[data-local-writing-host] p[role=alert]').waitFor({ timeout: 30_000 });
      if (
        (await page.getByLabel('Texto da sugestão').count()) ||
        (await gpuEditor.textContent()) !== gpuOriginal
      )
        throw new Error('Perda GPU liberou resposta.');
      await menu();
      await proof();
      output({ realDeviceDestroyed: true, gpuLossBlocked: true, explicitGpuRecovery: true });
      // Desconexão do offscreen durante streaming; nova ação não pode herdar a resposta.
      await menu();
      const editor = page.locator('#main footer [role=textbox]');
      await editor.fill('Preciso confirmar a revisão do documento até amanhã. '.repeat(10).trim());
      const original = await editor.textContent();
      await page.getByRole('button', { name: 'Reescrever com IA local', exact: true }).click();
      await page.getByLabel('Texto em geração').waitFor({ timeout: 180_000 });
      const coordinator = browser
        .serviceWorkers()
        .find((worker) => worker.url().startsWith('chrome-extension://'));
      if (!coordinator) throw new Error('Coordenador não encontrado.');
      await coordinator.evaluate(() => chrome.offscreen.closeDocument());
      await page.locator('[data-local-writing-host] p[role=alert]').waitFor();
      if (
        (await page.getByLabel('Texto da sugestão').count()) ||
        (await editor.textContent()) !== original
      )
        throw new Error('Pedido perdido alterou o original.');
      await menu();
      await proof();
      output({ offscreenLoss: true, draftPreserved: true, explicitRecovery: true });
    }
  }
  if (mode === 'repair') {
    // Bytes inconsistentes de mesmo tamanho depois da geração dos recibos.
    // Reset aceito somente do coordenador.
    await sw.evaluate(() => chrome.runtime.sendMessage({ target: 'offscreen', type: 'reset' }));
    await diagnostic.evaluate(async () => {
      const cache = await caches.open('webllm/model');
      const key = (await cache.keys()).find(
        (item) =>
          item.url.includes('Llama-3.2-3B-Instruct-q4f16_1-MLC/resolve/1e80') &&
          item.url.endsWith('/params_shard_0.bin'),
      );
      if (!key) throw new Error('Shard ausente.');
      const bytes = new Uint8Array(await (await cache.match(key)).arrayBuffer());
      bytes[0] ^= 1;
      await cache.put(key, new Response(bytes));
    });
    await menu();
    const originalDraft = await page.locator('#main footer [role=textbox]').textContent();
    await page.getByRole('button', { name: 'Corrigir com IA local', exact: true }).click();
    await page.getByRole('button', { name: 'Baixar e continuar' }).waitFor({ timeout: 120_000 });
    if (
      (await page.getByLabel('Texto da sugestão').count()) ||
      (await page.locator('#main footer [role=textbox]').textContent()) !== originalDraft
    )
      throw new Error('Cache inválido alterou o original.');
    await menu();
    await page.getByRole('button', { name: 'Testar IA local', exact: true }).click();
    await page.getByRole('button', { name: 'Baixar e continuar' }).waitFor({ timeout: 120_000 });
    if (await result.count()) throw new Error('Cache corrompido liberou resultado.');
    await page.getByRole('button', { name: 'Baixar e continuar' }).click();
    await page.getByText('Baixando modelo...', { exact: false }).waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1000);
    await cancel.click();
    await page.waitForTimeout(2200);
    await menu();
    await page.getByRole('button', { name: 'Testar IA local', exact: true }).click();
    await page.getByRole('button', { name: 'Baixar e continuar' }).waitFor({ timeout: 120_000 });
    output({ interruptedDownloadRequiresConfirmation: true, draftPreserved: true });
    await page.getByRole('button', { name: 'Baixar e continuar' }).click();
    await Promise.race([
      result.waitFor({ timeout: 600_000 }),
      page
        .locator('[data-local-writing-host] p[role=alert]')
        .waitFor({ timeout: 600_000 })
        .then(async () => {
          throw new Error(
            `Reparo recusado: ${await page.locator('[data-local-writing-host] p[role=alert]').textContent()}`,
          );
        }),
    ]);
    if (!(await result.textContent())?.includes('TESTE')) throw new Error('Reparo falhou.');
    output({ corruptCacheBlocked: true, confirmedRepair: true });
    await diagnostic.evaluate(async () => {
      await (
        await caches.open('webllm/model')
      ).put('https://example.com/step13-preserved.bin', new Response('artefato sintético alheio'));
      await (
        await caches.open('step13-unrelated-fixture')
      ).put('https://example.com/', new Response('fixture preservada'));
    });
    await menu();
    await page.getByRole('checkbox').check();
    await page.waitForFunction(
      () =>
        document
          .querySelector('[data-local-writing-host]')
          ?.shadowRoot?.querySelector('input[type=checkbox]')?.disabled === false,
    );
    const beforeRemoval = await inventory();
    await page.getByRole('button', { name: 'Remover cache da variante selecionada' }).click();
    await page
      .getByText('Artefatos da variante selecionada removidos.', { exact: false })
      .waitFor({ timeout: 30_000 });
    const afterRemoval = await inventory();
    const unrelatedPreserved = await diagnostic.evaluate(
      async () =>
        Boolean(
          await (
            await caches.open('webllm/model')
          ).match('https://example.com/step13-preserved.bin'),
        ) &&
        Boolean(
          await (await caches.open('step13-unrelated-fixture')).match('https://example.com/'),
        ),
    );
    if (
      afterRemoval.index ||
      !unrelatedPreserved ||
      JSON.stringify(beforeRemoval.preferences) !== JSON.stringify(afterRemoval.preferences)
    )
      throw new Error('Remoção ou preservação de preferência falhou.');
    await menu();
    await page.getByRole('button', { name: 'Testar IA local', exact: true }).click();
    await page.getByRole('button', { name: 'Baixar e continuar' }).waitFor({ timeout: 30_000 });
    output({
      removalConfirmed: true,
      preferencesPreserved: true,
      newDownloadRequired: true,
      unrelatedPreserved,
      afterRemoval,
    });
  }
  if (errors) throw new Error(`${errors} erros de página.`);
  output({ mode, completed: true, errors });
} finally {
  await browser.close();
}
