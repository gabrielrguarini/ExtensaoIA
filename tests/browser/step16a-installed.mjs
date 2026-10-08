/* global document */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const out = path.resolve('.cache/step16a');
await mkdir(out, { recursive: true });
const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
const extension = path.resolve('release/ia-local-whatsapp-' + manifest.version);
const context = await chromium.launchPersistentContext(path.join(out, 'installed-chrome'), {
  executablePath:
    process.env.STEP16A_CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  ignoreDefaultArgs: ['--disable-extensions'],
  args: ['--enable-unsafe-extension-debugging', '--disable-component-update'],
});
const report = {
  version: manifest.version,
  browser: context.browser().version(),
  installedPackage: true,
  realWhatsApp: false,
  syntheticDraft: true,
  noMessageSent: true,
  checks: [],
  pageErrors: 0,
};
context.on('page', (page) => page.on('pageerror', () => report.pageErrors++));
try {
  const cdp = await context.browser().newBrowserCDPSession();
  const { id } = await cdp.send('Extensions.loadUnpacked', { path: extension });
  assert.match(id, /^[a-p]{32}$/u);
  const settings = await context.newPage();
  settings.setDefaultTimeout(10_000);
  await settings.goto('chrome-extension://' + id + '/popup.html');
  await settings.waitForFunction(() => !document.querySelector('fieldset')?.disabled);
  const preferences = await settings.evaluate(() =>
    chrome.runtime.sendMessage({ target: 'preferences', type: 'get' }),
  );
  assert.equal(preferences.interaction, 'direct');
  assert.equal(preferences.defaultAction, 'corrigir');
  report.checks.push('Pacote release instalado, popup funcional e padrões diretos.');
  await settings.evaluate(() =>
    chrome.runtime.sendMessage({ target: 'local-engine', type: 'prepare' }),
  );
  report.nativeAvailability = await settings.evaluate(() =>
    chrome.runtime.sendMessage({ target: 'chrome-ai', type: 'status' }),
  );
  await context.route('https://web.whatsapp.com/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>body{font:18px Arial;margin:50px}main{margin-top:200px}footer{padding:40px 0}[contenteditable]{white-space:pre-wrap;border:1px solid;padding:16px;min-height:100px;max-height:180px;overflow-y:auto;width:750px}</style><main id="main"><header>Contexto sintético</header><footer><div role="textbox" contenteditable="true"></div></footer></main></html>',
    }),
  );
  await context.setOffline(true);
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  await page.goto('https://web.whatsapp.com/?step16a=synthetic');
  const editor = page.locator('#main > footer [contenteditable]');
  const original = 'Rascunho longo sintético.\n'.repeat(240).trim();
  await editor.fill(original);
  await page.getByRole('button', { name: 'IA — assistente de escrita local', exact: true }).click();
  await page
    .getByRole('tooltip')
    .filter({ hasText: 'Prepare o modelo nas configurações' })
    .waitFor();
  assert.equal(await editor.innerText(), original);
  assert.equal(await page.getByRole('dialog').count(), 0);
  report.checks.push(
    'Rascunho longo multilinha chegou ao motor sem pedir revisão; cache ausente não baixou nem alterou o original.',
  );
  const stored = await settings.evaluate(() => chrome.storage.local.get(null));
  assert.deepEqual(Object.keys(stored), ['writingPreferences']);
  assert.equal(JSON.stringify(stored).includes(original), false);
  report.checks.push('Storage da extensão contém somente preferências.');
  assert.equal(report.pageErrors, 0);
} catch (error) {
  report.failure = { name: error.name, message: error.message.split('\n')[0] };
  throw error;
} finally {
  await writeFile(path.join(out, 'installed.json'), JSON.stringify(report, null, 2) + '\n');
  await context.close();
}
