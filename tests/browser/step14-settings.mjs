/* global document, getComputedStyle, setTimeout, clearTimeout */
import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium } from 'playwright-core';

const root = process.cwd();
const executablePath = process.env.STEP14_CHROME;
if (!executablePath) throw new Error('Defina STEP14_CHROME.');
const profile = path.join(root, '.cache', 'step14-isolated');
const extension = path.join(root, 'dist');
const options = {
  executablePath,
  headless: false,
  serviceWorkers: 'block',
  viewport: { width: 1280, height: 800 },
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
};
const output = (value) => process.stdout.write(JSON.stringify(value) + '\n');
async function extensionWorker(browser) {
  for (let i = 0; i < 100; i++) {
    const worker = browser
      .serviceWorkers()
      .find((item) => item.url().endsWith('/service-worker.js'));
    if (
      worker &&
      (await worker.evaluate(() => Boolean(globalThis.chrome?.runtime?.id)).catch(() => false))
    )
      return worker;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Service Worker da extensão indisponível.');
}
const bootstrap = await chromium.launchPersistentContext(profile, options);
try {
  const sw = await extensionWorker(bootstrap);
  try {
    await sw.evaluate(() => chrome.runtime.reload());
  } catch {
    /* recarga */
  }
} finally {
  await bootstrap.close();
}
const context = await chromium.launchPersistentContext(profile, options);
let errors = 0;
context.on('page', (page) => page.on('pageerror', () => errors++));
try {
  const sw = await extensionWorker(context);
  const id = new URL(sw.url()).host;
  const rootCdp = await context.browser().newBrowserCDPSession();
  const nested = new Map();
  let sequence = 0;
  rootCdp.on('Target.receivedMessageFromTarget', (event) => {
    const message = JSON.parse(event.message);
    const key = `${event.sessionId}:${message.id}`;
    const entry = nested.get(key);
    if (entry) {
      nested.delete(key);
      clearTimeout(entry.timer);
      if (message.error) entry.reject(new Error(message.error.message));
      else entry.resolve(message.result);
    }
  });
  async function command(sessionId, method, params = {}) {
    const messageId = ++sequence;
    const promise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        nested.delete(`${sessionId}:${messageId}`);
        reject(new Error(`CDP ${method} timeout`));
      }, 10000);
      nested.set(`${sessionId}:${messageId}`, { resolve, reject, timer });
    });
    await rootCdp.send('Target.sendMessageToTarget', {
      sessionId,
      message: JSON.stringify({ id: messageId, method, params }),
    });
    return promise;
  }
  async function target(pathname) {
    for (let i = 0; i < 50; i++) {
      const { targetInfos } = await rootCdp.send('Target.getTargets');
      const found = targetInfos.find((info) => info.url === `chrome-extension://${id}/${pathname}`);
      if (found) return found;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Interface ${pathname} não abriu.`);
  }
  await sw.evaluate(() => chrome.storage.local.remove('writingPreferences'));
  await sw.evaluate(() => chrome.action.openPopup());
  const popupTarget = await target('popup.html');
  const { sessionId: popupSession } = await rootCdp.send('Target.attachToTarget', {
    targetId: popupTarget.targetId,
    flatten: false,
  });
  const buttonExpression = `(() => { const button = [...document.querySelectorAll('button')].find(item => item.textContent === 'Abrir painel lateral'); if (!button || button.disabled) return null; const r = button.getBoundingClientRect(); return { x:r.x+r.width/2, y:r.y+r.height/2 }; })()`;
  let position;
  for (let i = 0; i < 30; i++) {
    position = (
      await command(popupSession, 'Runtime.evaluate', {
        expression: buttonExpression,
        returnByValue: true,
      })
    ).result.value;
    if (position) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(position);
  await command(popupSession, 'Input.dispatchMouseEvent', {
    type: 'mousePressed',
    ...position,
    button: 'left',
    clickCount: 1,
  });
  await command(popupSession, 'Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    ...position,
    button: 'left',
    clickCount: 1,
  });
  const panelTarget = await target('sidepanel.html');
  const { sessionId: panelSession } = await rootCdp.send('Target.attachToTarget', {
    targetId: panelTarget.targetId,
    flatten: false,
  });
  let panelRendered;
  for (let i = 0; i < 40; i++) {
    panelRendered = await command(panelSession, 'Runtime.evaluate', {
      expression: `({ visible:document.visibilityState, heading:document.querySelector('h1')?.textContent, fields:document.querySelectorAll('select').length })`,
      returnByValue: true,
    });
    if (panelRendered.result.value.visible === 'visible' && panelRendered.result.value.fields === 4)
      break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(panelRendered.result.value.visible, 'visible');
  assert.equal(panelRendered.result.value.heading, 'IA local · Configurações');
  output({
    browser: context.browser().version(),
    nativePopup: true,
    sidePanelFromTrustedGesture: panelRendered.result.value,
  });
  await rootCdp.send('Target.detachFromTarget', { sessionId: popupSession }).catch(() => undefined);
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${id}/sidepanel.html`);
  const stored = () => popup.evaluate(() => chrome.storage.local.get(null));
  const expected = {
    version: 3,
    semanticReview: false,
    profile: 'economico',
    language: 'pt-BR',
    theme: 'system',
    defaultAction: 'corrigir',
    preserveSlang: true,
    addEmojis: false,
  };
  await popup.getByLabel('Tema', { exact: true }).waitFor();
  assert.deepEqual((await stored()).writingPreferences, expected);
  await popup.evaluate(() =>
    chrome.storage.local.set({
      writingPreferences: {
        version: 2,
        semanticReview: true,
        profile: 'equilibrado',
        prompt: 'Fixture a descartar',
      },
    }),
  );
  await popup.reload();
  await popup.waitForFunction(() => !document.querySelector('fieldset')?.disabled);
  assert.deepEqual((await stored()).writingPreferences, {
    ...expected,
    semanticReview: true,
    profile: 'equilibrado',
  });
  await popup.evaluate(() =>
    chrome.storage.local.set({
      writingPreferences: {
        version: 3,
        theme: 'invalid',
        profile: 'invalid',
        text: 'Fixture a descartar',
      },
    }),
  );
  await popup.reload();
  await popup.waitForFunction(() => !document.querySelector('fieldset')?.disabled);
  assert.deepEqual((await stored()).writingPreferences, expected);
  assert.deepEqual(Object.keys(await stored()), ['writingPreferences']);
  await context.route('https://web.whatsapp.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html><head><style>body{font:16px system-ui}main{height:95vh;display:flex;flex-direction:column}section{flex:1}footer{display:flex;height:72px}footer [role=textbox]{width:75%;background:#eee}</style></head><body><main id="main"><header>Contexto sintético</header><section>Fixture STEP-14 sem conversa</section><footer><button>Anexar</button><div role="textbox" aria-multiline="true" contenteditable="true">mano, vc pode ver isso? 🙂</div><button>Áudio</button></footer></main></body></html>',
    }),
  );
  const page = await context.newPage();
  await (
    await context.newCDPSession(page)
  ).send('Network.setBypassServiceWorker', { bypass: true });
  await page.goto('https://web.whatsapp.com/?step14=fixture');
  await page.getByText('Fixture STEP-14 sem conversa', { exact: true }).waitFor();
  const launcher = page.locator('[data-local-writing-host] button.launcher');
  await launcher.focus();
  await launcher.press('Enter');
  await page.getByRole('button', { name: 'Usar ação padrão: Corrigir' }).waitFor();
  async function select(surface, label, keys) {
    const control = surface.getByLabel(label, { exact: true });
    await control.focus();
    for (const key of keys) await control.press(key);
    await surface.waitForFunction(() => !document.querySelector('fieldset')?.disabled);
  }
  await select(popup, 'Tema', ['End', 'Enter']);
  await panel.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  await page.waitForFunction(
    () => document.querySelector('[data-local-writing-host]')?.dataset.theme === 'dark',
  );
  await select(panel, 'Ação padrão', ['f']);
  await page.getByRole('button', { name: 'Usar ação padrão: Formal' }).waitFor();
  assert.equal(await popup.getByLabel('Ação padrão', { exact: true }).inputValue(), 'formal');
  const nativeValue = await command(panelSession, 'Runtime.evaluate', {
    expression: `({ theme:document.documentElement.dataset.theme, action:document.querySelectorAll('select')[1].value })`,
    returnByValue: true,
  });
  assert.deepEqual(nativeValue.result.value, { theme: 'dark', action: 'formal' });
  await rootCdp.send('Target.detachFromTarget', { sessionId: panelSession });
  await panel.getByLabel('Permitir novos emojis').focus();
  await panel.getByLabel('Permitir novos emojis').press('Space');
  await popup.waitForFunction(() => [...document.querySelectorAll('input')][1]?.checked === true);
  assert.equal(await page.getByLabel('Permitir novos emojis').isChecked(), true);
  await popup.getByLabel('Permitir novos emojis').focus();
  await popup.getByLabel('Permitir novos emojis').press('Space');
  await panel.waitForFunction(() => [...document.querySelectorAll('input')][1]?.checked === false);
  async function contrast(surface, shadow = false) {
    return surface.evaluate((shadow) => {
      const root = shadow
        ? document.querySelector('[data-local-writing-host]').shadowRoot
        : document;
      const numbers = (color) => color.match(/[\d.]+/g).map(Number);
      const luminance = (color) =>
        numbers(color)
          .slice(0, 3)
          .map((item) => {
            const x = item / 255;
            return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
          })
          .reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0);
      const ratios = [...root.querySelectorAll('p,a,button:not(:disabled),select:not(:disabled)')]
        .filter((element) => element.getClientRects().length)
        .map((element) => {
          const style = getComputedStyle(element);
          let painted = element;
          while (painted && getComputedStyle(painted).backgroundColor === 'rgba(0, 0, 0, 0)')
            painted = painted.parentElement;
          const background = painted
            ? getComputedStyle(painted).backgroundColor
            : getComputedStyle(document.body).backgroundColor;
          const a = luminance(style.color);
          const b = luminance(background);
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        });
      return Math.min(...ratios);
    }, shadow);
  }
  const darkContrast = {
    popup: await contrast(popup),
    panel: await contrast(panel),
    editor: await contrast(page, true),
  };
  for (const ratio of Object.values(darkContrast)) assert.ok(ratio >= 4.5);
  await popup.setViewportSize({ width: 380, height: 780 });
  await popup.screenshot({ path: path.join(root, '.cache', 'step14-dark.png'), fullPage: true });
  await select(popup, 'Tema', ['c']);
  await panel.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  await page.waitForFunction(
    () => document.querySelector('[data-local-writing-host]')?.dataset.theme === 'light',
  );
  await popup.emulateMedia({ colorScheme: 'dark' });
  await panel.emulateMedia({ colorScheme: 'dark' });
  await page.emulateMedia({ colorScheme: 'dark' });
  const lightContrast = {
    popup: await contrast(popup),
    panel: await contrast(panel),
    editor: await contrast(page, true),
  };
  for (const ratio of Object.values(lightContrast)) assert.ok(ratio >= 4.5);
  await popup.screenshot({ path: path.join(root, '.cache', 'step14-light.png'), fullPage: true });
  await select(popup, 'Tema', ['Home']);
  await page.waitForFunction(
    () => document.querySelector('[data-local-writing-host]')?.dataset.theme === 'system',
  );
  assert.equal(
    await page
      .locator('[data-local-writing-host] .preview-panel')
      .evaluate((element) => getComputedStyle(element).backgroundColor),
    'rgb(31, 44, 52)',
  );
  await select(popup, 'Tema', ['End']);
  output({
    darkContrast,
    lightContrast,
    systemUsesDarkOS: true,
    explicitLightOverridesDarkOS: true,
  });
  const keyboardAction = page.getByRole('button', { name: 'Usar ação padrão: Formal' });
  await keyboardAction.focus();
  await keyboardAction.press('Tab');
  assert.equal(
    await page
      .getByRole('button', { name: 'Corrigir com IA local', exact: true })
      .evaluate((element) => element === element.getRootNode().activeElement),
    true,
  );
  await page.keyboard.press('Escape');
  assert.equal(
    await page
      .locator('#main footer [role=textbox]')
      .evaluate((element) => document.activeElement === element),
    true,
  );
  output({
    defaults: true,
    migration: true,
    invalidRecovery: true,
    synchronizedThreeInterfaces: true,
    keyboardAndEscape: true,
    storageKeys: Object.keys(await stored()),
  });
  // Conserva o estado e verifica após reiniciar o processo do Chrome na segunda fase.
  await context.close();
} finally {
  if (context.browser()?.isConnected()) await context.close();
}

const restarted = await chromium.launchPersistentContext(profile, options);
restarted.on('page', (page) => page.on('pageerror', () => errors++));
try {
  const sw = await extensionWorker(restarted);
  const id = new URL(sw.url()).host;
  const popup = await restarted.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.waitForFunction(() => !document.querySelector('fieldset')?.disabled);
  assert.equal(await popup.getByLabel('Tema', { exact: true }).inputValue(), 'dark');
  assert.equal(await popup.getByLabel('Ação padrão', { exact: true }).inputValue(), 'formal');
  assert.equal(await popup.getByLabel('Permitir novos emojis').isChecked(), false);
  await popup.getByRole('button', { name: 'Atualizar estado do modelo' }).click();
  await popup.getByText(/Cache: ausente, incompleto ou inconsistente/).waitFor();
  await popup.getByRole('button', { name: 'Liberar memória da GPU' }).focus();
  await popup.getByRole('button', { name: 'Liberar memória da GPU' }).press('Enter');
  await popup
    .getByRole('status')
    .getByText(/Memória da GPU liberada/)
    .waitFor();
  await popup.getByRole('button', { name: 'Apagar arquivos do modelo' }).focus();
  await popup.getByRole('button', { name: 'Apagar arquivos do modelo' }).press('Enter');
  const confirm = popup.getByRole('button', { name: 'Confirmar remoção', exact: true });
  await confirm.waitFor();
  assert.equal(await confirm.evaluate((element) => document.activeElement === element), true);
  await confirm.press('Enter');
  await popup
    .getByRole('status')
    .getByText(/Artefatos da variante selecionada apagados/)
    .waitFor();
  output({
    restartPersistence: true,
    cacheState: true,
    unloadControl: true,
    removeConfirmationKeyboard: true,
    pageErrors: errors,
  });
  assert.equal(errors, 0);
} finally {
  await restarted.close();
}
