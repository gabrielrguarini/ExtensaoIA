/* global document, WebSocket, fetch, setTimeout, clearTimeout */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import path from 'node:path';
import { chromium } from 'playwright-core';

const out = path.resolve(process.env.STEP16B_OUTPUT ?? '.cache/step16b');
await mkdir(out, { recursive: true });
const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
const extension = path.resolve('release/ia-local-whatsapp-' + manifest.version);
const executablePath =
  process.env.STEP16B_CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = process.env.STEP16B_PORT ?? '9260';
const panelAccess = process.env.STEP16E_ACCESS === '1';
assert.match(port, /^\d{4,5}$/u);
const profile = path.join(out, 'chrome');
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
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') report.panelExceptions++;
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
  async function popup() {
    await controller.evaluate(async () =>
      chrome.action.openPopup({ windowId: (await chrome.windows.getCurrent()).id }),
    );
    return attach('popup.html');
  }
  async function key(sessionId, name) {
    const codes = { Home: 36, End: 35, ArrowDown: 40, Enter: 13 };
    for (const type of ['keyDown', 'keyUp'])
      await command(
        'Input.dispatchKeyEvent',
        {
          type,
          key: name,
          code: name,
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
  const native = await popup();
  await waitFor(
    native.sessionId,
    '!document.querySelector("#chrome-ai-title").parentElement.textContent.includes("Verificando disponibilidade")',
  );
  const nativeState = await evaluate(
    native.sessionId,
    `(() => {
    const source = document.querySelector('[aria-label="Tipo de IA"]');
    return { source: source.value, choices: [...source.options].map(x => x.textContent),
      models: document.querySelectorAll('[aria-label="Modelo"]').length,
      nativeControls: Boolean(document.querySelector('#chrome-ai-title')),
      width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      firstChoiceVisible: source.getBoundingClientRect().bottom < innerHeight };
  })()`,
  );
  assert.equal(nativeState.source, 'chrome-preferred');
  assert.deepEqual(nativeState.choices, ['IA Nativa', 'Modelo']);
  assert.equal(nativeState.models, 0);
  assert(nativeState.nativeControls && nativeState.firstChoiceVisible);
  assert(nativeState.width >= 360 && nativeState.width <= 400);
  assert(nativeState.scrollWidth <= nativeState.width);
  report.nativePopup = nativeState;
  if (panelAccess) {
    report.panelAccess = await evaluate(
      native.sessionId,
      `(() => {
      const button = document.querySelector('.panel-link');
      return { buttonBelowFields: button.getBoundingClientRect().top >= document.querySelector('fieldset').getBoundingClientRect().bottom };
    })()`,
    );
    await evaluate(
      native.sessionId,
      'document.querySelector(".panel-link").scrollIntoView({block:"center"})',
    );
    await screenshot(native.sessionId, 'popup-panel-access.png');
    const point = await evaluate(
      native.sessionId,
      `(() => {
      const r = document.querySelector('.panel-link').getBoundingClientRect();
      return { x:r.x+r.width/2, y:r.y+r.height/2 };
    })()`,
    );
    for (const type of ['mousePressed', 'mouseReleased'])
      await command(
        'Input.dispatchMouseEvent',
        { type, ...point, button: 'left', clickCount: 1 },
        native.sessionId,
      );
    await attach('sidepanel.html');
    report.checks.push(
      'Abrir painel lateral funciona com clique confiável no popup real, após rolar até o botão.',
    );
  }
  await screenshot(native.sessionId, 'popup-native.png');
  await browserCDP.send('Target.closeTarget', { targetId: native.targetId });
  report.checks.push(
    'Popup real mostra IA Nativa/Modelo no início; IA Nativa oculta seletor e controles de modelos.',
  );

  const preserved = {
    defaultAction: 'conciso',
    interaction: 'preview',
    preserveSlang: false,
    addEmojis: true,
    theme: 'dark',
  };
  await controller.evaluate(
    (patch) => chrome.runtime.sendMessage({ target: 'preferences', type: 'update', patch }),
    preserved,
  );
  await controller.getByRole('button', { name: 'Abrir painel lateral', exact: true }).click();
  const panel = await attach('sidepanel.html');
  await choose(panel.sessionId, 'Tipo de IA', 1);
  await controller.waitForFunction(
    () =>
      document.querySelector('[aria-label="Tipo de IA"]').value === 'local' &&
      !document.querySelector('fieldset').disabled,
  );
  await waitFor(
    panel.sessionId,
    'document.querySelector("[aria-label=Modelo]") && !document.querySelector("fieldset").disabled',
  );
  const modelChoices = await evaluate(
    panel.sessionId,
    '[...document.querySelector("[aria-label=Modelo]").options].map(x => ({value:x.value,label:x.textContent}))',
  );
  assert.deepEqual(
    modelChoices.map((x) => x.value),
    ['economico', 'equilibrado', 'qualidade', 'gemma'],
  );
  assert.equal(
    await evaluate(panel.sessionId, 'Boolean(document.querySelector("#chrome-ai-title"))'),
    false,
  );
  report.checks.push(
    'Painel lateral real exibe quatro modelos e somente seus controles após escolher Modelo por teclado.',
  );
  for (let index = 0; index < modelChoices.length; index++) {
    await choose(panel.sessionId, 'Modelo', index);
    const expected = modelChoices[index].value;
    await controller.waitForFunction(
      (expected) =>
        document.querySelector('[aria-label="Modelo"]').value === expected &&
        !document.querySelector('fieldset').disabled,
      expected,
    );
    await waitFor(panel.sessionId, '!document.querySelector("fieldset").disabled');
    if (panelAccess) {
      const downloadButton = `([...document.querySelectorAll('button')].find(x => x.textContent === 'Baixar modelo'))`;
      await waitFor(panel.sessionId, downloadButton + ' && !' + downloadButton + '.disabled');
      await controller.waitForFunction(() =>
        [...document.querySelectorAll('button')].some(
          (x) => x.textContent === 'Baixar modelo' && x.disabled,
        ),
      );
      report.modelDownloads ??= [];
      report.modelDownloads.push({ model: expected, panelEnabled: true, popupDisabled: true });
    }
  }
  report.checks.push(
    'Llama, Qwen 4B/8B e Gemma selecionáveis por teclado, com sincronização entre interfaces.',
  );
  await screenshot(panel.sessionId, 'sidepanel-model.png');
  const modelPopup = await popup();
  await waitFor(
    modelPopup.sessionId,
    'document.querySelector("[aria-label=Modelo]").value === "gemma"',
  );
  await screenshot(modelPopup.sessionId, 'popup-model.png');
  await choose(modelPopup.sessionId, 'Tipo de IA', 0);
  await waitFor(
    modelPopup.sessionId,
    '!document.querySelector("[aria-label=Modelo]") && !document.querySelector("fieldset").disabled',
  );
  await waitFor(panel.sessionId, '!document.querySelector("[aria-label=Modelo]")');
  await choose(modelPopup.sessionId, 'Tipo de IA', 1);
  await waitFor(
    modelPopup.sessionId,
    'document.querySelector("[aria-label=Modelo]")?.value === "gemma" && !document.querySelector("fieldset").disabled',
  );
  await waitFor(
    panel.sessionId,
    'document.querySelector("[aria-label=Modelo]")?.value === "gemma"',
  );
  const popupState = await evaluate(
    modelPopup.sessionId,
    '({width:innerWidth, scrollWidth:document.documentElement.scrollWidth, theme:document.documentElement.dataset.theme, focused:document.activeElement.getAttribute("aria-label")})',
  );
  assert(popupState.scrollWidth <= popupState.width);
  assert.equal(popupState.theme, 'dark');
  assert.equal(popupState.focused, 'Tipo de IA');
  report.modelPopup = popupState;
  if (panelAccess) {
    const disabled = await evaluate(
      modelPopup.sessionId,
      `([...document.querySelectorAll('button')].find(x => x.textContent === 'Baixar modelo')).disabled`,
    );
    assert(disabled, 'Download deve permanecer restrito ao painel visível.');
    report.panelAccess.actualModelPopupDownloadDisabled = disabled;
    report.checks.push(
      'Quatro modelos: download habilitado no painel compatível e desativado no popup; nenhum download iniciado.',
    );
  }
  report.checks.push(
    'Popup alterna modos por teclado, conserva foco e retorna ao último modelo; tema escuro sem rolagem horizontal.',
  );
  const stored = await controller.evaluate(() => chrome.storage.local.get(null));
  assert.deepEqual(Object.keys(stored), ['writingPreferences']);
  assert.deepEqual(
    Object.fromEntries(Object.keys(preserved).map((key) => [key, stored.writingPreferences[key]])),
    preserved,
  );
  assert.equal(stored.writingPreferences.engine, 'local');
  assert.equal(stored.writingPreferences.localModel, 'gemma');
  assert.equal(stored.writingPreferences.profile, 'qualidade');
  assert.equal(report.pageModelRequests, 0);
  report.checks.push(
    'Ação, comportamento, gírias, emojis e tema preservados; somente preferências persistidas, sem iniciar download.',
  );
  if (panelAccess)
    assert(
      report.panelAccess.buttonBelowFields,
      'Abrir painel lateral ainda aparece acima dos campos.',
    );
  socket.close();
  socket = undefined;
  await context.close();
  context = await chromium.launchPersistentContext(profile, options);
  const cdp = await context.browser().newBrowserCDPSession();
  const reloaded = await cdp.send('Extensions.loadUnpacked', { path: extension });
  const restored = await context.newPage();
  restored.on('pageerror', () => report.pageErrors++);
  await restored.goto('chrome-extension://' + reloaded.id + '/popup.html');
  await restored.waitForFunction(() => !document.querySelector('fieldset')?.disabled);
  assert.equal(await restored.getByLabel('Tipo de IA').inputValue(), 'local');
  assert.equal(await restored.getByLabel('Modelo', { exact: true }).inputValue(), 'gemma');
  assert.equal(await restored.getByLabel('Ação do botão IA').inputValue(), 'conciso');
  report.checks.push(
    'Modo/modelo e ação permanecem após reiniciar o Chrome com a extensão instalada.',
  );
  assert.equal(report.pageErrors, 0);
  assert.equal(report.panelExceptions, 0);
} catch (error) {
  report.failure = { name: error.name, message: error.message.split('\n')[0] };
  throw error;
} finally {
  socket?.close();
  await context.close();
  await writeFile(path.join(out, 'settings.json'), JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify(report) + '\n');
}
