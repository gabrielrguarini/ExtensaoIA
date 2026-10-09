/* global WebSocket, fetch, setTimeout, clearTimeout, document */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const out = path.resolve(process.env.STEP16G_OUTPUT ?? '.cache/step16g/after');
await mkdir(out, { recursive: true });
const version = JSON.parse(await readFile('manifest.json', 'utf8')).version;
const extension = path.resolve('release/ia-local-whatsapp-' + version);
const port = '9264';
const context = await chromium.launchPersistentContext(path.resolve('.cache/step15b-chrome'), {
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: false,
  viewport: null,
  ignoreDefaultArgs: ['--disable-extensions'],
  args: [
    '--enable-unsafe-extension-debugging',
    '--disable-component-update',
    '--remote-debugging-port=' + port,
  ],
});
const report = {
  version,
  browser: context.browser().version(),
  syntheticOnly: true,
  noMessageSent: true,
  noDownloadRequested: true,
  nativeLanguageErrors: [],
  pageErrors: 0,
};
let socket;
try {
  const endpoint = await (await fetch('http://127.0.0.1:' + port + '/json/version')).json();
  socket = new WebSocket(endpoint.webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
  const pending = new Map();
  let sequence = 0;
  function command(method, params = {}, sessionId) {
    const id = ++sequence;
    const result = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(method + ' timeout'));
      }, 15000);
      pending.set(id, { resolve, reject, timer });
    });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return result;
  }
  const sessions = new Set();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.method === 'Target.attachedToTarget') {
      const { sessionId, targetInfo } = message.params;
      sessions.add(sessionId);
      void (async () => {
        if (targetInfo.type !== 'browser') {
          await command('Runtime.enable', {}, sessionId).catch(() => undefined);
          await command('Log.enable', {}, sessionId).catch(() => undefined);
        }
        await command('Runtime.runIfWaitingForDebugger', {}, sessionId).catch(() => undefined);
      })();
    }
    const text =
      message.method === 'Log.entryAdded'
        ? message.params.entry.text
        : message.method === 'Runtime.consoleAPICalled'
          ? message.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' ')
          : message.method === 'Runtime.exceptionThrown'
            ? (message.params.exceptionDetails.exception?.description ??
              message.params.exceptionDetails.text)
            : '';
    if (
      /Unsupported LanguageModel API languages|requested language options are not supported/iu.test(
        text,
      )
    )
      report.nativeLanguageErrors.push(text);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timer);
    message.error
      ? request.reject(new Error(message.error.message))
      : request.resolve(message.result);
  });
  await command('Target.setAutoAttach', {
    autoAttach: true,
    waitForDebuggerOnStart: true,
    flatten: true,
    filter: [{ type: 'tab', exclude: true }, { exclude: false }],
  });
  const { id } = await command('Extensions.loadUnpacked', { path: extension });
  const page = await context.newPage();
  page.on('pageerror', () => report.pageErrors++);
  await page.goto('chrome-extension://' + id + '/popup.html');
  await page.waitForFunction(() => !document.querySelector('fieldset')?.disabled);
  await page.evaluate(() =>
    chrome.runtime.sendMessage({
      target: 'preferences',
      type: 'update',
      patch: { engine: 'chrome-preferred', defaultAction: 'corrigir' },
    }),
  );
  report.status = await page.evaluate(async () => {
    await chrome.runtime.sendMessage({ target: 'local-engine', type: 'prepare' });
    return chrome.runtime.sendMessage({ target: 'chrome-ai', type: 'status' });
  });
  // Todas as ações consultadas no produto, sem criar sessão nem baixar pesos.
  await page.waitForFunction(
    () =>
      !document
        .querySelector('#chrome-ai-title')
        ?.parentElement.textContent.includes('Verificando disponibilidade'),
    {},
    { timeout: 30000 },
  );
  const action = page.getByLabel('Ação do botão IA');
  await action.focus();
  await action.press('Home');
  for (let n = 0; n < 3; n++) {
    await action.press('ArrowDown');
    await page.waitForFunction(() => !document.querySelector('fieldset').disabled);
  }
  await action.press('Enter');
  await page.waitForFunction(
    () =>
      document.querySelector('[aria-label="Ação do botão IA"]').value === 'profissional' &&
      !document
        .querySelector('#chrome-ai-title')
        .parentElement.textContent.includes('Verificando disponibilidade'),
  );
  report.visibleSettingsActions = ['corrigir', 'profissional'];
  report.inferencePerformed = false;
  report.inferenceSkippedReason =
    'Roteiro de consultas de disponibilidade, sem criação de sessão; estado registrado em status.';
  assert.equal(report.status.ok, true);
  assert.equal(report.status.actions.length, 9);
  report.attachedContexts = sessions.size;
  assert.equal(
    report.nativeLanguageErrors.length,
    0,
    'O produto consultou idiomas incompatíveis: ' + JSON.stringify(report.nativeLanguageErrors),
  );
  assert.equal(report.pageErrors, 0);
} catch (error) {
  report.failure = { name: error.name, message: error.message.split('\n')[0] };
  throw error;
} finally {
  socket?.close();
  await context.close();
  await writeFile(path.join(out, 'language.json'), JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify(report) + '\n');
}
