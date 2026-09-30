/* global document, setTimeout */
import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium } from 'playwright-core';
const root = process.cwd();
const executablePath = process.env.STEP14_CHROME;
if (!executablePath) throw new Error('Defina STEP14_CHROME.');
const extension = path.join(root, 'dist');
const profile = path.join(root, '.cache', 'step14-isolated');
const options = {
  executablePath,
  headless: false,
  serviceWorkers: 'block',
  viewport: { width: 1280, height: 800 },
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
};
const bootstrap = await chromium.launchPersistentContext(profile, options);
try {
  const worker = bootstrap.serviceWorkers()[0] ?? (await bootstrap.waitForEvent('serviceworker'));
  try {
    await worker.evaluate(() => chrome.runtime.reload());
  } catch {
    /* recarga */
  }
} finally {
  await bootstrap.close();
}
const context = await chromium.launchPersistentContext(profile, options);
const output = (value) => process.stdout.write(JSON.stringify(value) + '\n');
let errors = 0;
context.on('page', (page) => page.on('pageerror', () => errors++));
try {
  const sw = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  const id = new URL(sw.url()).host;
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.waitForFunction(() => !document.querySelector('fieldset')?.disabled);
  await popup.evaluate(() =>
    chrome.runtime.sendMessage({
      target: 'preferences',
      type: 'update',
      patch: {
        profile: 'economico',
        defaultAction: 'corrigir',
        preserveSlang: true,
        addEmojis: false,
        semanticReview: false,
      },
    }),
  );
  output({
    browser: context.browser().version(),
    gpu: await popup.evaluate(async () => {
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
  await context.route('https://web.whatsapp.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html><head><style>body{font:16px system-ui}main{height:95vh;display:flex;flex-direction:column}section{flex:1}footer{display:flex;height:72px}footer [role=textbox]{width:75%;background:#eee}</style></head><body><main id="main"><header>Contexto sintético</header><section>Fixture STEP-14 sem conversa</section><footer><button>Anexar</button><div role="textbox" aria-multiline="true" contenteditable="true">mano vc pode ver isso? 🙂</div><button>Áudio</button></footer></main></body></html>',
    }),
  );
  const page = await context.newPage();
  await (
    await context.newCDPSession(page)
  ).send('Network.setBypassServiceWorker', { bypass: true });
  await page.goto('https://web.whatsapp.com/?step14=fixture');
  await page.getByText('Fixture STEP-14 sem conversa', { exact: true }).waitFor();
  const rootCdp = await context.browser().newBrowserCDPSession();
  const workerCount = async () =>
    (await rootCdp.send('Target.getTargets')).targetInfos.filter(
      (target) => target.type === 'worker',
    ).length;
  async function expectWorkers(expected) {
    for (let i = 0; i < 50; i++) {
      if ((await workerCount()) === expected) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.equal(await workerCount(), expected);
  }
  const inventory = () =>
    popup.evaluate(async () => ({
      model: (await (await caches.open('webllm/model')).keys()).length,
      config: (await (await caches.open('webllm/config')).keys()).length,
      receipts: (await (await caches.open('local-writing/artifact-integrity-v1')).keys()).length,
      prefs: await chrome.storage.local.get(null),
    }));
  const launcher = page.locator('[data-local-writing-host] button.launcher');
  const close = page.getByRole('button', { name: 'Cancelar', exact: true });
  async function menu() {
    if (await close.isVisible()) await close.click();
    await launcher.click();
    await page.waitForFunction(
      () =>
        !document.querySelector('[data-local-writing-host]')?.shadowRoot?.querySelector('fieldset')
          ?.disabled,
    );
  }
  async function success(result, allowDownload = false) {
    const download = page.getByRole('button', { name: 'Baixar e continuar' });
    if (allowDownload) {
      await Promise.race([
        download.waitFor({ timeout: 180000 }),
        result.waitFor({ timeout: 180000 }),
      ]);
      if (await download.isVisible()) {
        output({ explicitDownloadConfirmed: true });
        await download.click();
      }
    }
    await Promise.race([
      result.waitFor({ timeout: 600000 }),
      page
        .locator('[data-local-writing-host] p[role=alert]')
        .waitFor({ timeout: 600000 })
        .then(async () => {
          throw new Error(
            await page.locator('[data-local-writing-host] p[role=alert]').innerText(),
          );
        }),
    ]);
  }
  await menu();
  await page.getByRole('button', { name: 'Testar IA local', exact: true }).click();
  const proof = page.getByLabel('Resposta do teste de IA local');
  await success(proof, true);
  assert.match((await proof.innerText()).trim(), /^TESTE[.!]?$/u);
  output({ realWebGPUProof: true, workers: await workerCount() });
  await menu();
  await page.getByRole('button', { name: 'Usar ação padrão: Corrigir' }).focus();
  await page.getByRole('button', { name: 'Usar ação padrão: Corrigir' }).press('Enter');
  const preview = page.getByLabel('Texto da sugestão');
  let correctionAccepted = false;
  try {
    await success(preview);
    const corrected = await preview.innerText();
    assert.ok(corrected.includes('🙂'));
    assert.ok(corrected.includes('?'));
    assert.ok(/mano/iu.test(corrected));
    correctionAccepted = true;
  } catch (error) {
    if (!(await page.locator('[data-local-writing-host] p[role=alert]').isVisible())) throw error;
    assert.match(
      await page.locator('[data-local-writing-host] p[role=alert]').innerText(),
      /Nenhuma alteração foi aplicada/u,
    );
  }
  output({ correctionAccepted, originalDraftPreserved: true });
  assert.equal(
    await page.locator('#main footer [role=textbox]').innerText(),
    'mano vc pode ver isso? 🙂',
  );
  await close.click();
  const action = popup.getByLabel('Ação padrão', { exact: true });
  await action.focus();
  await action.press('f');
  await popup.waitForFunction(() => !document.querySelector('fieldset')?.disabled);
  await menu();
  await page.getByRole('button', { name: 'Usar ação padrão: Formal' }).click();
  await success(preview);
  const formal = await preview.innerText();
  assert.ok(formal.includes('🙂'));
  assert.ok(formal.includes('?'));
  assert.ok(!/mano/iu.test(formal));
  assert.ok(/verificar|ver isso/iu.test(formal));
  assert.ok(!/existência|diz respeito/iu.test(formal));
  await popup.getByRole('button', { name: 'Atualizar estado do modelo' }).click();
  await popup.getByText(/Cache: completo e verificado/).waitFor({ timeout: 180000 });
  await popup.getByText(/modelo carregado \(Econômico\)/).waitFor();
  const before = await inventory();
  assert.ok(before.model > 1);
  assert.equal(await workerCount(), 1);
  await popup.getByRole('button', { name: 'Liberar memória da GPU' }).click();
  await popup
    .getByRole('status')
    .getByText(/Memória da GPU liberada/)
    .waitFor();
  await expectWorkers(0);
  assert.deepEqual(await inventory(), before);
  await menu();
  await page.getByRole('button', { name: 'Testar IA local', exact: true }).click();
  await success(proof);
  assert.match((await proof.innerText()).trim(), /^TESTE[.!]?$/u);
  assert.equal(await workerCount(), 1);
  await popup.getByRole('button', { name: 'Apagar arquivos do modelo' }).click();
  await popup.getByRole('button', { name: 'Confirmar remoção', exact: true }).click();
  await popup
    .getByRole('status')
    .getByText(/Artefatos da variante selecionada apagados/)
    .waitFor();
  const after = await inventory();
  assert.equal(after.model, 0);
  assert.equal(after.config, 0);
  assert.equal(after.receipts, 0);
  assert.deepEqual(after.prefs, before.prefs);
  await expectWorkers(0);
  await menu();
  await page.getByRole('button', { name: 'Testar IA local', exact: true }).click();
  await page.getByRole('button', { name: 'Baixar e continuar' }).waitFor({ timeout: 180000 });
  await close.click();
  output({
    correctionAccepted,
    formalAdaptsSlangPreservingEmoji: true,
    verifiedCacheAndLoadedState: true,
    unloadPreservesArtifactsAndPrefs: true,
    reloadWithoutDownload: true,
    removeDeletesArtifactsPreservesPrefs: true,
    nextUseRequiresConfirmation: true,
    pageErrors: errors,
  });
  assert.equal(errors, 0);
} finally {
  await context.close();
}
