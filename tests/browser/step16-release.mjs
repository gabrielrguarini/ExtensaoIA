/* global document */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const executablePath = process.env.STEP16_CHROME;
assert(executablePath, 'Defina STEP16_CHROME.');
const mode = process.env.STEP16_MODE ?? 'clean';
assert(['clean', 'chrome', 'webllm', 'gemma', 'gemma-recovery'].includes(mode));
if (mode !== 'clean') {
  process.env.STEP15F_CHROME = executablePath;
  process.env.STEP15F_ENGINE = mode === 'gemma-recovery' ? 'gemma' : mode;
  process.env.STEP16_RECOVERY_ONLY = mode === 'gemma-recovery' ? '1' : '0';
  process.env.STEP15F_REGULAR = mode === 'chrome' ? '1' : '0';
  process.env.STEP15F_VALIDATION = 'step16';
  await import('./step15f-interface.mjs');
} else {
  const root = process.cwd();
  const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
  const extension = path.join(root, 'release', 'ia-local-whatsapp-' + manifest.version);
  await access(path.join(extension, 'manifest.json'));
  const out = path.join(root, '.cache', 'step16');
  await mkdir(out, { recursive: true });
  const profile = path.join(out, 'clean-' + Date.now());
  const report = {
    version: manifest.version,
    freshProfile: true,
    syntheticFixture: true,
    noMessageSent: true,
    checks: {},
    requests: [],
    console: [],
    pageErrors: 0,
  };
  const context = await chromium.launchPersistentContext(profile, {
    executablePath,
    headless: false,
    serviceWorkers: 'block',
    viewport: { width: 1280, height: 850 },
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [
      '--disable-component-update',
      '--disable-extensions-except=' + extension,
      '--load-extension=' + extension,
    ],
  });
  try {
    context.on('request', (request) => {
      const url = new URL(request.url());
      report.requests.push({
        origin: url.protocol + '//' + url.host,
        path: url.pathname,
        method: request.method(),
        hasPostData: request.postData() !== null,
      });
    });
    report.networkScope =
      'Eventos de páginas do perfil isolado; inferência indisponível e navegador offline. Workers auditados nos roteiros de candidatos preparados.';
    report.browser = context.browser().version();
    const sw = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    const id = new URL(sw.url()).host;
    const settings = await context.newPage();
    settings.on('pageerror', () => report.pageErrors++);
    await settings.goto('chrome-extension://' + id + '/popup.html');
    await settings.waitForFunction(() => !document.querySelector('fieldset')?.disabled);
    const get = () =>
      settings.evaluate(() => chrome.runtime.sendMessage({ target: 'preferences', type: 'get' }));
    const prefs = await get();
    assert.equal(prefs.version, 8);
    assert.equal(prefs.engine, 'chrome-preferred');
    assert.equal(prefs.interaction, 'direct');
    assert.equal(prefs.defaultAction, 'corrigir');
    assert.deepEqual(await settings.evaluate(() => caches.keys()), []);
    report.checks.cleanDefaultsAndNoModelCache = true;
    assert.equal(await settings.getByLabel('Ao clicar em IA').inputValue(), 'direct');
    assert.equal(await settings.locator('input[type=checkbox]').count(), 2);
    assert(
      !/WebLLM|Transformers|Simula|Testar IA|pt-BR/iu.test(
        await settings.locator('main').innerText(),
      ),
    );
    report.checks.productOnlySettings = true;
    await settings.locator('.ai-options > summary').click();
    await settings
      .getByText('Abra o painel lateral para preparar o modelo.', { exact: true })
      .waitFor();
    assert.equal(
      await settings.getByRole('button', { name: 'Baixar modelo', exact: true }).isEnabled(),
      false,
    );
    report.checks.explicitPreparationOutsidePopup = true;
    await settings.screenshot({ path: path.join(out, 'clean-settings.png'), fullPage: true });
    await context.route('https://web.whatsapp.com/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: '<!doctype html><html><head><meta charset="utf-8"><style>body{font:16px system-ui}main{height:95vh;display:flex;flex-direction:column}section{flex:1}footer{display:flex;height:72px}footer [role=textbox]{width:75%;background:#eee}</style></head><body><main id="main"><header>Contexto sintético STEP-16</header><section>Fixture sem conversa</section><footer><button>Anexar</button><div role="textbox" aria-multiline="true" contenteditable="true"></div><button>Áudio</button></footer></main></body></html>',
      }),
    );
    await context.setOffline(true);
    const page = await context.newPage();
    page.on('pageerror', () => report.pageErrors++);
    page.on('console', (event) => report.console.push({ type: event.type() }));
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.setBypassServiceWorker', { bypass: true });
    await page.goto('https://web.whatsapp.com/?step16=fixture');
    const draft = page.locator('#main footer [role=textbox]');
    const original = 'Teste STEP-16: extensao com ação e emoji 🙂.';
    await draft.fill(original);
    await page.locator('button.launcher').click();
    await page
      .getByRole('tooltip')
      .filter({ hasText: 'Prepare o modelo nas configurações' })
      .waitFor({ timeout: 30000 });
    assert.equal(await draft.innerText(), original);
    assert.equal(await page.locator('.preview-panel').count(), 0);
    report.checks.unavailableNativeFallsBackBeforeGenerationWithoutDownload = true;
    await page.screenshot({ path: path.join(out, 'clean-no-download.png') });
    const behavior = settings.getByLabel('Ao clicar em IA');
    await behavior.focus();
    await behavior.press('End');
    await behavior.press('Enter');
    await settings.waitForFunction(
      () =>
        document.querySelector('[aria-label="Ao clicar em IA"]')?.value === 'preview' &&
        !document.querySelector('fieldset')?.disabled,
    );
    await page.locator('button.launcher').click();
    await page.getByRole('button', { name: 'Baixar e continuar', exact: true }).waitFor();
    assert.equal(await draft.innerText(), original);
    await page.keyboard.press('Escape');
    report.checks.previewRequiresExplicitDownloadAndCancelPreservesDraft = true;
    await settings.evaluate(() =>
      chrome.runtime.sendMessage({
        target: 'preferences',
        type: 'update',
        patch: { engine: 'local', localModel: 'gemma' },
      }),
    );
    await page.locator('button.launcher').click();
    await page.getByRole('button', { name: 'Baixar e continuar', exact: true }).waitFor();
    assert.equal(await draft.innerText(), original);
    await page.keyboard.press('Escape');
    report.checks.gemmaMissingCacheRequiresConsent = true;
    await settings.evaluate(() =>
      chrome.runtime.sendMessage({
        target: 'preferences',
        type: 'update',
        patch: { interaction: 'direct' },
      }),
    );
    // Falta de WebGPU é exercitada no documento de configurações, sem falsificar o motor.
    const nogpu = await context.newPage();
    await nogpu.addInitScript(() =>
      Object.defineProperty(navigator, 'gpu', { get: () => undefined, configurable: true }),
    );
    await nogpu.goto('chrome-extension://' + id + '/sidepanel.html');
    await nogpu.locator('.ai-options > summary').click();
    await nogpu
      .getByText('Este modelo não está disponível neste computador. Experimente a IA automática.', {
        exact: true,
      })
      .waitFor();
    report.checks.noWebGPUExplainedInSettings = true;
    assert.equal(
      await nogpu.getByRole('button', { name: 'Baixar modelo', exact: true }).count(),
      0,
    );
    const store = await settings.evaluate(() => chrome.storage.local.get(null));
    assert.deepEqual(Object.keys(store), ['writingPreferences']);
    assert.equal(JSON.stringify(store).includes(original), false);
    report.checks.storageOnlyPreferences = true;
    await draft.evaluate((editor) => {
      const duplicate = editor.cloneNode(true);
      duplicate.id = 'step16-ambiguous';
      editor.parentElement.append(duplicate);
    });
    // Em ambiguidade, o adaptador remove o host inteiro, não somente hidden no botão.
    await page.locator('button.launcher').waitFor({ state: 'hidden' });
    await page.locator('#step16-ambiguous').evaluate((editor) => editor.remove());
    await page.locator('button.launcher').waitFor();
    assert.equal(await page.locator('[data-local-writing-host]').count(), 1);
    assert.equal(await draft.innerText(), original);
    report.checks.ambiguousEditorsDisableLauncherAndRecover = true;
    assert.equal(report.pageErrors, 0);
    report.finishedAt = new Date().toISOString();
    await writeFile(path.join(out, 'clean.json'), JSON.stringify(report, null, 2) + '\n');
    process.stdout.write(JSON.stringify(report) + '\n');
  } catch (error) {
    report.failure = { name: error.name, message: error.message };
    await writeFile(path.join(out, 'clean-failure.json'), JSON.stringify(report, null, 2) + '\n');
    throw error;
  } finally {
    await context.close();
  }
}
