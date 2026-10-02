/* global document, WebSocket, fetch */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

const root = process.cwd();
const executablePath = process.env.STEP15F_CHROME;
assert(executablePath, 'Defina STEP15F_CHROME com Chrome instalado.');
const extension = path.join(root, 'dist');
const baseline = process.env.STEP15F_POPUP_BASELINE === '1';
const out = path.join(root, '.cache', 'step15f');
await mkdir(out, { recursive: true });
const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json'), 'utf8'));
const context = await chromium.launchPersistentContext(
  path.join(root, '.cache', 'step15b-chrome'),
  {
    executablePath,
    headless: false,
    viewport: null,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [
      '--enable-unsafe-extension-debugging',
      '--disable-component-update',
      '--remote-debugging-port=9242',
    ],
  },
);
let socket;
try {
  const browserCDP = await context.browser().newBrowserCDPSession();
  const loaded = await browserCDP.send('Extensions.loadUnpacked', { path: extension });
  assert(loaded.id);
  const controller = await context.newPage();
  await controller.goto('chrome-extension://' + loaded.id + '/popup.html');
  await controller.waitForFunction(() => {
    const fields = document.querySelector('fieldset');
    return fields && !fields.disabled;
  });
  await controller.evaluate(async () => {
    const current = await chrome.windows.getCurrent();
    await chrome.action.openPopup({ windowId: current.id });
  });
  await controller.waitForFunction(() => {
    const popup = chrome.extension.getViews({ type: 'popup' })[0];
    const fields = popup?.document.querySelector('fieldset');
    return fields && !fields.disabled;
  });
  const report = await controller.evaluate(() => {
    const popup = chrome.extension.getViews({ type: 'popup' })[0];
    const title = popup.document.querySelector('h1');
    return {
      nativePopupViews: chrome.extension.getViews({ type: 'popup' }).length,
      width: popup.innerWidth,
      height: popup.innerHeight,
      bodyWidth: popup.document.body.getBoundingClientRect().width,
      scrollWidth: popup.document.documentElement.scrollWidth,
      titleHeight: title.getBoundingClientRect().height,
      titleFontSize: Number.parseFloat(popup.getComputedStyle(title).fontSize),
    };
  });
  const controllerID = (
    await (await context.newCDPSession(controller)).send('Target.getTargetInfo')
  ).targetInfo.targetId;
  const { targetInfos } = await browserCDP.send('Target.getTargets');
  const target = targetInfos.find(
    (item) =>
      item.url === 'chrome-extension://' + loaded.id + '/popup.html' &&
      item.targetId !== controllerID,
  );
  assert(target, 'Popup nativo não encontrado entre os targets.');
  const endpoint = await (await fetch('http://127.0.0.1:9242/json/version')).json();
  socket = new WebSocket(endpoint.webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const result = JSON.parse(event.data);
    const request = pending.get(result.id);
    if (!request) return;
    pending.delete(result.id);
    result.error ? request.reject(new Error(result.error.message)) : request.resolve(result.result);
  });
  function command(method, params = {}, sessionId) {
    const id = ++sequence;
    const result = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return result;
  }
  const attached = await command('Target.attachToTarget', {
    targetId: target.targetId,
    flatten: true,
  });
  const shot = await command('Page.captureScreenshot', { format: 'png' }, attached.sessionId);
  const label = baseline ? 'baseline' : 'corrected';
  await writeFile(path.join(out, 'popup-real-' + label + '.png'), Buffer.from(shot.data, 'base64'));
  const result = {
    version: manifest.version,
    browser: context.browser().version(),
    baseline,
    actualChromeActionPopup: true,
    targetType: target.type,
    ...report,
    measuredAt: new Date().toISOString(),
  };
  await writeFile(
    path.join(out, 'popup-real-' + label + '.json'),
    JSON.stringify(result, null, 2) + '\n',
  );
  process.stdout.write(JSON.stringify(result) + '\n');
  if (!baseline) {
    assert(report.width >= 360 && report.width <= 400, 'Largura real incorreta.');
    assert.equal(report.bodyWidth, 360);
    assert(report.scrollWidth <= report.width, 'Rolagem horizontal no popup.');
    assert(report.titleHeight <= report.titleFontSize * 2, 'Título quebrando em várias linhas.');
  }
} finally {
  socket?.close();
  await context.close();
}
