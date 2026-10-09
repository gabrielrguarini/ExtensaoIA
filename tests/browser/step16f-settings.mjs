/* global document, WebSocket, fetch, setTimeout, clearTimeout */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import path from 'node:path';
import { chromium } from 'playwright-core';

const out = path.resolve(process.env.STEP16F_OUTPUT ?? '.cache/step16f/actual');
await mkdir(out, { recursive: true });
const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
const extension = path.resolve('release/ia-local-whatsapp-' + manifest.version);
const executablePath =
  process.env.STEP16F_CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = process.env.STEP16F_PORT ?? '9263';
assert.match(port, /^\d{4,5}$/u);
const profile = await mkdtemp(path.join(out, 'chrome-'));
const options = {
  executablePath,
  headless: false,
  viewport: null,
  ignoreDefaultArgs: ['--disable-extensions'],
  args: [
    '--enable-unsafe-extension-debugging',
    '--disable-component-update',
    '--remote-debugging-port=' + port,
  ],
};
let context = await chromium.launchPersistentContext(profile, options);
let socket;
const report = {
  version: manifest.version,
  browser: context.browser().version(),
  actualChromeActionPopup: true,
  actualChromeSidePanel: true,
  checks: [],
  pageErrors: 0,
  panelExceptions: 0,
  pageModelRequests: 0,
  noModelDownloaded: true,
  noConversationOpened: true,
  noMessageSent: true,
};
context.on('page', (page) => page.on('pageerror', () => report.pageErrors++));
context.on('request', (request) => {
  if (/^https:\/\/(?:huggingface\.co|us\.aws\.cdn\.hf\.co)\//u.test(request.url()))
    report.pageModelRequests++;
});
try {
  const browserCDP = await context.browser().newBrowserCDPSession();
  const { id } = await browserCDP.send('Extensions.loadUnpacked', { path: extension });
  assert.match(id, /^[a-p]{32}$/u);
  const controller = await context.newPage();
  controller.setDefaultTimeout(10_000);
  await controller.goto('chrome-extension://' + id + '/popup.html');
  await controller.waitForFunction(() => !document.querySelector('fieldset')?.disabled);
  // Dados de configuração do perfil dedicado, sem rascunhos ou autenticação.
  await controller.evaluate(() =>
    chrome.runtime.sendMessage({
      target: 'preferences',
      type: 'update',
      patch: {
        engine: 'chrome-preferred',
        localModel: 'webllm',
        profile: 'economico',
        theme: 'light',
        defaultAction: 'corrigir',
        interaction: 'direct',
        preserveSlang: true,
        addEmojis: false,
      },
    }),
  );
  const endpoint = await (await fetch('http://127.0.0.1:' + port + '/json/version')).json();
  socket = new WebSocket(endpoint.webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
  let sequence = 0;
  const pending = new Map();
  const intercepted = [];
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') report.panelExceptions++;
    if (message.method === 'Fetch.requestPaused')
      intercepted.push({ ...message.params, sessionId: message.sessionId });
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timer);
    message.error
      ? request.reject(new Error(message.error.message))
      : request.resolve(message.result);
  });
  function command(method, params = {}, sessionId) {
    const messageId = ++sequence;
    const result = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(messageId);
        reject(new Error('CDP timeout: ' + method));
      }, 10_000);
      pending.set(messageId, { resolve, reject, timer });
    });
    socket.send(
      JSON.stringify({ id: messageId, method, params, ...(sessionId ? { sessionId } : {}) }),
    );
    return result;
  }
  async function evaluate(sessionId, expression) {
    const result = await command(
      'Runtime.evaluate',
      { expression, returnByValue: true, awaitPromise: true },
      sessionId,
    );
    assert(!result.exceptionDetails, 'Falha na inspeção da interface de teste.');
    return result.result.value;
  }
  async function waitFor(sessionId, expression) {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate(sessionId, expression)) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error('A interface não chegou ao estado esperado.');
  }
  const controllerID = (
    await (await context.newCDPSession(controller)).send('Target.getTargetInfo')
  ).targetInfo.targetId;
  async function attach(pathname) {
    let target;
    for (let attempt = 0; attempt < 100 && !target; attempt++) {
      const { targetInfos } = await browserCDP.send('Target.getTargets');
      target = targetInfos.find(
        (item) =>
          item.url === 'chrome-extension://' + id + '/' + pathname &&
          item.targetId !== controllerID,
      );
      if (!target) await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert(target, 'Interface nativa do Chrome ausente.');
    const { sessionId } = await command('Target.attachToTarget', {
      targetId: target.targetId,
      flatten: true,
    });
    await command('Runtime.enable', {}, sessionId);
    await waitFor(
      sessionId,
      'document.querySelector("fieldset") && !document.querySelector("fieldset").disabled',
    );
    return { targetId: target.targetId, sessionId };
  }
  async function key(sessionId, name) {
    const codes = { Home: 36, End: 35, ArrowDown: 40, Enter: 13, ' ': 32 };
    for (const type of ['keyDown', 'keyUp'])
      await command(
        'Input.dispatchKeyEvent',
        {
          type,
          key: name,
          code: name === ' ' ? 'Space' : name,
          windowsVirtualKeyCode: codes[name],
          nativeVirtualKeyCode: codes[name],
        },
        sessionId,
      );
  }
  async function choose(sessionId, label, index) {
    await evaluate(
      sessionId,
      'document.querySelector(' + JSON.stringify('[aria-label="' + label + '"]') + ').focus()',
    );
    await key(sessionId, 'Home');
    await waitFor(sessionId, '!document.querySelector("fieldset").disabled');
    for (let step = 0; step < index; step++) {
      await key(sessionId, 'ArrowDown');
      await waitFor(sessionId, '!document.querySelector("fieldset").disabled');
    }
    await key(sessionId, 'Enter');
  }
  async function screenshot(sessionId, name) {
    const shot = await command('Page.captureScreenshot', { format: 'png' }, sessionId);
    await writeFile(path.join(out, name), Buffer.from(shot.data, 'base64'));
  }
  const accessLabel = 'Abrir configurações no painel lateral';
  async function triggerAction(cdp, extensionId, page) {
    const { targetInfos } = await cdp.send('Target.getTargets', {
      filter: [{ type: 'tab' }, { exclude: true }],
    });
    const tab = targetInfos.find((target) => target.url === page.url());
    assert(tab, 'Aba do perfil de teste ausente.');
    await cdp.send('Extensions.triggerAction', { id: extensionId, targetId: tab.targetId });
  }
  const accessSelector = '[role="switch"][aria-label="' + accessLabel + '"]';
  const writingBefore = await controller.evaluate(() =>
    chrome.storage.local.get('writingPreferences'),
  );
  await controller.waitForFunction(async () => (await chrome.action.getPopup({})) === '');
  assert.equal(await controller.locator(accessSelector).getAttribute('aria-checked'), 'true');
  await triggerAction(browserCDP, id, controller);
  let panel = await attach('sidepanel.html');
  report.checks.push(
    'Ícone da extensão abre o painel lateral por padrão, com Switch ligado em Aparência.',
  );
  assert.equal(
    await evaluate(
      panel.sessionId,
      'document.querySelector(' +
        JSON.stringify(accessSelector) +
        ').closest("section").getAttribute("aria-labelledby")',
    ),
    'appearance-title',
  );
  assert.equal(
    await evaluate(panel.sessionId, 'document.querySelectorAll("[role=switch]").length'),
    3,
  );
  async function click(sessionId, selector) {
    const point = await evaluate(
      sessionId,
      `(() => { const e=document.querySelector(${JSON.stringify(selector)}); e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`,
    );
    for (const type of ['mousePressed', 'mouseReleased'])
      await command(
        'Input.dispatchMouseEvent',
        { type, ...point, button: 'left', clickCount: 1 },
        sessionId,
      );
  }
  async function toggle(sessionId, label, checked, keyboard = false) {
    const selector = '[role="switch"][aria-label="' + label + '"]';
    await waitFor(
      sessionId,
      '!document.querySelector(' + JSON.stringify(selector) + ').hasAttribute("data-disabled")',
    );
    if (keyboard) {
      await evaluate(sessionId, 'document.querySelector(' + JSON.stringify(selector) + ').focus()');
      await key(sessionId, ' ');
    } else await click(sessionId, selector);
    await waitFor(
      sessionId,
      'document.querySelector(' +
        JSON.stringify(selector) +
        ').getAttribute("aria-checked") === ' +
        JSON.stringify(String(checked)) +
        ' && !document.querySelector(' +
        JSON.stringify(selector) +
        ').hasAttribute("data-disabled")',
    );
    await controller.waitForFunction(
      ({ selector, checked }) =>
        document.querySelector(selector)?.getAttribute('aria-checked') === String(checked),
      { selector, checked },
    );
  }
  // Eventos injetados pela página não podem modificar as escolhas.
  await evaluate(
    panel.sessionId,
    'document.querySelector(' + JSON.stringify(accessSelector) + ').click()',
  );
  assert.equal(
    await evaluate(
      panel.sessionId,
      'document.querySelector(' + JSON.stringify(accessSelector) + ').getAttribute("aria-checked")',
    ),
    'true',
  );
  await toggle(panel.sessionId, 'Preservar gírias', false);
  await toggle(panel.sessionId, 'Preservar gírias', true, true);
  await toggle(panel.sessionId, 'Permitir novos emojis', true, true);
  await toggle(panel.sessionId, 'Permitir novos emojis', false);
  report.checks.push(
    'Switches de escrita salvam e sincronizam por mouse/Space; eventos não confiáveis ignorados.',
  );
  await toggle(panel.sessionId, accessLabel, false, true);
  assert.equal(
    await evaluate(panel.sessionId, 'document.activeElement.getAttribute("aria-label")'),
    accessLabel,
  );
  assert.deepEqual(
    await controller.evaluate(() => chrome.storage.local.get('writingPreferences')),
    writingBefore,
  );
  await screenshot(panel.sessionId, 'sidepanel-switches-light.png');
  await controller.evaluate(async () =>
    chrome.sidePanel.close({ windowId: (await chrome.windows.getCurrent()).id }),
  );
  await triggerAction(browserCDP, id, controller);
  const actualPopup = await attach('popup.html');
  report.checks.push(
    'Switch desligado abre popup pelo ícone; a alteração conserva foco e todas as preferências de escrita.',
  );
  await choose(actualPopup.sessionId, 'Tipo de IA', 1);
  const downloadSelector = '.preparation-trigger';
  await waitFor(
    actualPopup.sessionId,
    'document.querySelector(".preparation-trigger button")?.disabled',
  );
  await evaluate(
    actualPopup.sessionId,
    'document.querySelector(".preparation-trigger").scrollIntoView({block:"center"})',
  );
  const point = await evaluate(
    actualPopup.sessionId,
    '(() => {const r=document.querySelector(".preparation-trigger").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()',
  );
  await command(
    'Input.dispatchMouseEvent',
    { type: 'mouseMoved', ...point },
    actualPopup.sessionId,
  );
  const tooltip = 'document.querySelector("[role=tooltip]")';
  await waitFor(actualPopup.sessionId, 'getComputedStyle(' + tooltip + ').display === "block"');
  assert.equal(
    await evaluate(actualPopup.sessionId, tooltip + '.textContent'),
    'Abra o painel lateral para fazer o download.',
  );
  await screenshot(actualPopup.sessionId, 'popup-tooltip-light.png');
  await command(
    'Input.dispatchMouseEvent',
    { type: 'mouseMoved', x: 2, y: 2 },
    actualPopup.sessionId,
  );
  await evaluate(actualPopup.sessionId, 'document.querySelector(".preparation-trigger").focus()');
  assert.equal(
    await evaluate(actualPopup.sessionId, 'getComputedStyle(' + tooltip + ').display'),
    'block',
  );
  assert.equal(
    await evaluate(
      actualPopup.sessionId,
      'document.activeElement.getAttribute("aria-describedby")',
    ),
    await evaluate(actualPopup.sessionId, tooltip + '.id'),
  );
  report.checks.push(
    'Popup mantém download desativado; tooltip explica abrir painel e aparece por hover/foco com descrição acessível.',
  );
  await choose(actualPopup.sessionId, 'Tema', 2);
  await waitFor(actualPopup.sessionId, 'document.documentElement.dataset.theme === "dark"');
  await evaluate(actualPopup.sessionId, 'document.querySelector(".preparation-trigger").focus()');
  await screenshot(actualPopup.sessionId, 'popup-tooltip-dark.png');
  await toggle(actualPopup.sessionId, accessLabel, true);
  await browserCDP.send('Target.closeTarget', { targetId: actualPopup.targetId });
  await triggerAction(browserCDP, id, controller);
  panel = await attach('sidepanel.html');
  await choose(panel.sessionId, 'Modelo', 0);
  await waitFor(
    panel.sessionId,
    'document.querySelector(".preparation-trigger button") && !document.querySelector(".preparation-trigger button").disabled',
  );
  await screenshot(panel.sessionId, 'sidepanel-switches-dark.png');
  // Rede de modelos interceptada antes da transmissão: testar o fluxo real sem pesos.
  await command(
    'Fetch.enable',
    { patterns: [{ urlPattern: 'https://huggingface.co/*', requestStage: 'Request' }] },
    panel.sessionId,
  );
  async function waitForInterceptedRequest() {
    for (let attempt = 0; attempt < 100 && !intercepted.length; attempt++)
      await new Promise((resolve) => setTimeout(resolve, 100));
    assert(intercepted.length, 'O fluxo não chegou ao download interceptado.');
  }
  await click(panel.sessionId, downloadSelector + ' button');
  await waitFor(panel.sessionId, 'Boolean(document.querySelector(".download-warning"))');
  await waitForInterceptedRequest();
  assert.equal(
    await evaluate(panel.sessionId, 'document.querySelector(".download-warning").textContent'),
    'Mantenha o painel aberto. Se fechar, o download será cancelado.',
  );
  await waitFor(
    panel.sessionId,
    '[...document.querySelectorAll("button")].some(x=>x.textContent==="Cancelar download")',
  );
  await screenshot(panel.sessionId, 'sidepanel-download-warning.png');
  await evaluate(
    panel.sessionId,
    '[...document.querySelectorAll("button")].find(x=>x.textContent==="Cancelar download").id="synthetic-cancel"',
  );
  await click(panel.sessionId, '#synthetic-cancel');
  for (const paused of intercepted.splice(0))
    await command(
      'Fetch.failRequest',
      { requestId: paused.requestId, errorReason: 'Aborted' },
      paused.sessionId,
    ).catch(() => undefined);
  await waitFor(
    panel.sessionId,
    '!document.querySelector(".download-warning") && [...document.querySelectorAll("[role=alert]")].some(x=>x.textContent==="Download cancelado.")',
  );
  report.checks.push(
    'Preparo real com rede interceptada mostra aviso durante download; Cancelar conserva fluxo e remove aviso.',
  );
  await click(panel.sessionId, downloadSelector + ' button');
  await waitFor(panel.sessionId, 'Boolean(document.querySelector(".download-warning"))');
  await waitForInterceptedRequest();
  await controller.evaluate(async () =>
    chrome.sidePanel.close({ windowId: (await chrome.windows.getCurrent()).id }),
  );
  let closed = false;
  for (let attempt = 0; attempt < 100 && !closed; attempt++) {
    const afterClose = await browserCDP.send('Target.getTargets');
    closed = !afterClose.targetInfos.some((x) => x.targetId === panel.targetId);
    if (!closed) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(closed, 'O painel ainda está aberto.');
  report.checks.push(
    'Fechar painel durante preparo destrói a página; aviso visível antecipado, sem botão de fechar adicional.',
  );
  report.syntheticPreparation = {
    actualUI: true,
    modelNetworkIntercepted: true,
    realWeightsDownloaded: false,
  };
  // Salvar popup e conferir a restauração após reinício do navegador.
  await controller.getByRole('switch', { name: accessLabel, exact: true }).click();
  await controller.waitForFunction(async () => (await chrome.action.getPopup({})) === 'popup.html');
  const saved = await controller.evaluate(() => chrome.storage.local.get(null));
  assert.deepEqual(Object.keys(saved).sort(), ['settingsAccess', 'writingPreferences']);
  assert.equal(saved.settingsAccess.openInPanel, false);
  socket.close();
  socket = undefined;
  await context.close();
  context = await chromium.launchPersistentContext(profile, options);
  const restartedCDP = await context.browser().newBrowserCDPSession();
  const reloaded = await restartedCDP.send('Extensions.loadUnpacked', { path: extension });
  const restored = await context.newPage();
  await restored.goto('chrome-extension://' + reloaded.id + '/popup.html');
  await restored.waitForFunction(() => !document.querySelector('fieldset')?.disabled);
  await restored.waitForFunction(async () => (await chrome.action.getPopup({})) === 'popup.html');
  assert.deepEqual(await restored.evaluate(() => chrome.storage.local.get(null)), saved);
  const restoredID = (await (await context.newCDPSession(restored)).send('Target.getTargetInfo'))
    .targetInfo.targetId;
  await triggerAction(restartedCDP, reloaded.id, restored);
  let reopened = false;
  for (let n = 0; n < 100 && !reopened; n++) {
    const targets = await restartedCDP.send('Target.getTargets');
    reopened = targets.targetInfos.some(
      (x) =>
        x.url === 'chrome-extension://' + reloaded.id + '/popup.html' && x.targetId !== restoredID,
    );
    if (!reopened) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(reopened);
  report.checks.push(
    'Preferência de popup restaurada no próximo clique após reiniciar Chrome; valores da escrita intactos.',
  );
  assert.equal(report.pageErrors, 0);
  assert.equal(report.panelExceptions, 0);
  assert.equal(report.pageModelRequests, 0);
} catch (error) {
  report.failure = { name: error.name, message: error.message.split('\n')[0] };
  throw error;
} finally {
  socket?.close();
  await context.close();
  await writeFile(path.join(out, 'settings.json'), JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify(report) + '\n');
}
