import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const executablePath = process.env.STEP12_CHROME;
if (!executablePath) throw new Error('Defina STEP12_CHROME com Chrome for Testing.');
const profile = path.resolve(
  process.env.STEP12_PROFILE ?? path.join(root, '.cache', 'step12-browser'),
);
const mode = process.argv[2] ?? 'inspect';
if (!['inspect', 'economico', 'equilibrado', 'qualidade'].includes(mode))
  throw new Error('Modo inválido.');
const extension = path.join(root, 'dist');
const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json'), 'utf8'));
if (manifest.version !== '0.13.0') throw new Error('Execute npm run build antes da prova.');
const options = {
  headless: false,
  viewport: { width: 1280, height: 800 },
  executablePath,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
};

const bootstrap = await chromium.launchPersistentContext(profile, options);
try {
  let worker = bootstrap
    .serviceWorkers()
    .find((item) => item.url().startsWith('chrome-extension://'));
  worker ??= await bootstrap.waitForEvent('serviceworker', { timeout: 15_000 });
  try {
    await worker.evaluate(() => chrome.runtime.reload());
  } catch {
    /* reload ends the worker */
  }
} finally {
  await bootstrap.close();
}

const browser = await chromium.launchPersistentContext(profile, options);
let errors = 0;
try {
  const page = await browser.newPage();
  page.on('pageerror', () => errors++);
  await page.route('https://web.whatsapp.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: `<!doctype html><html lang="pt-BR"><head><style>
        body{margin:0;font:16px system-ui}main{height:100vh;display:flex;flex-direction:column}
        header{height:64px;border-bottom:1px solid #ccc}section{flex:1}
        footer{height:72px;display:flex;align-items:center;padding:16px;background:#eee}
        footer [role=textbox]{width:75%;min-height:32px;background:white;border:1px solid #aaa}
      </style></head><body><main id="main"><header>Contexto sintético</header>
      <section>Fixture local, sem conversa</section><footer><button>Anexar</button>
      <div role="textbox" aria-multiline="true" contenteditable="true">vc consegue me mandar o relatório hj?</div>
      <button>Áudio</button></footer></main></body></html>`,
    });
  });
  await page.goto('https://web.whatsapp.com/?step12=fixture');
  const launcher = page.locator('[data-local-writing-host] button.launcher');
  const selector = page.getByLabel('Perfil de IA local');
  const alert = page.locator('[data-local-writing-host] p[role="alert"]');
  const result = page.getByLabel('Resposta do teste de IA local');
  const prompt = page.getByRole('button', { name: 'Baixar e continuar' });
  await launcher.click();
  await selector.waitFor({ state: 'visible' });
  await selector.waitFor({ state: 'attached' });
  const deadline = Date.now() + 10_000;
  while (!(await selector.isEnabled()) && Date.now() < deadline) await page.waitForTimeout(100);
  if (!(await selector.isEnabled())) throw new Error('Seletor de perfil indisponível.');
  const hardwareLabel = page.locator('[data-local-writing-host] .hardware-info');
  const hardwareDeadline = Date.now() + 12_000;
  while (
    (await hardwareLabel.textContent())?.includes('Verificando') &&
    Date.now() < hardwareDeadline
  )
    await page.waitForTimeout(200);
  const hardware = await hardwareLabel.textContent();
  if (mode !== 'inspect') {
    await selector.focus();
    await selector.press(mode === 'qualidade' ? 'End' : 'Home');
    if (mode === 'equilibrado') await selector.press('ArrowDown');
    await selector.press('Enter');
    await page.waitForFunction(
      (expected) =>
        globalThis.document
          .querySelector('[data-local-writing-host]')
          ?.shadowRoot?.querySelector('[aria-label="Perfil de IA local"]')?.value === expected,
      mode,
    );
  }
  if (mode !== 'inspect') {
    const readyAt = Date.now() + 10_000;
    while (!(await selector.isEnabled()) && Date.now() < readyAt) await page.waitForTimeout(100);
    if (!(await selector.isEnabled())) throw new Error('Novo perfil não foi salvo.');
  }
  await page.getByRole('button', { name: 'Testar IA local' }).click();
  const first = await Promise.race([
    prompt.waitFor({ state: 'visible', timeout: 90_000 }).then(() => 'download'),
    result.waitFor({ state: 'visible', timeout: 90_000 }).then(() => 'result'),
    alert.waitFor({ state: 'visible', timeout: 90_000 }).then(() => 'error'),
  ]);
  if (mode === 'inspect') {
    process.stdout.write(
      JSON.stringify({
        mode,
        hardware,
        first,
        detail: first === 'error' ? await alert.textContent() : null,
        errors,
      }) + '\n',
    );
  } else {
    if (first === 'error') throw new Error(`Falha antes do download: ${await alert.textContent()}`);
    const confirmation =
      first === 'download'
        ? await page.locator('[data-local-writing-host] .model-proof').last().textContent()
        : null;
    if (first === 'download') await prompt.click();
    const started = Date.now();
    let outcome =
      first === 'result' ? { type: 'result', response: await result.textContent() } : null;
    while (Date.now() - started < 30 * 60_000) {
      if (outcome) break;
      if (await result.isVisible()) {
        outcome = { type: 'result', response: await result.textContent() };
        break;
      }
      if (await alert.isVisible()) {
        outcome = { type: 'error', message: await alert.textContent() };
        break;
      }
      if ((Date.now() - started) % 60_000 < 1_000)
        process.stdout.write(
          `aguardando ${mode}: ${Math.floor((Date.now() - started) / 60_000)} min\n`,
        );
      await page.waitForTimeout(1_000);
    }
    if (!outcome) throw new Error(`Tempo limite no perfil ${mode}.`);
    if (outcome.type === 'result' && outcome.response?.includes('<think>'))
      throw new Error('Bloco de raciocínio exposto no resultado.');
    let action;
    if (outcome.type === 'result') {
      await page.getByRole('button', { name: 'Cancelar' }).click();
      await launcher.click();
      await page.getByRole('button', { name: 'Corrigir com IA local' }).click();
      const suggestion = page.getByLabel('Texto da sugestão');
      const actionAt = Date.now();
      while (Date.now() - actionAt < 8 * 60_000) {
        if (await suggestion.isVisible()) {
          action = { type: 'preview', text: await suggestion.textContent() };
          break;
        }
        if (await alert.isVisible()) {
          action = { type: 'error', message: await alert.textContent() };
          break;
        }
        await page.waitForTimeout(300);
      }
      if (!action) throw new Error(`Tempo limite na ação ${mode}.`);
      if (action.type === 'preview' && action.text?.includes('<think>'))
        throw new Error('Bloco de raciocínio exposto na prévia.');
    }
    process.stdout.write(
      JSON.stringify({ mode, hardware, confirmation, outcome, action, errors }) + '\n',
    );
    if (outcome.type !== 'result' || !outcome.response?.includes('TESTE'))
      throw new Error('A prova sintética não foi concluída.');
    if (action?.type !== 'preview') throw new Error('A correção sintética não foi concluída.');
  }
  if (errors) throw new Error(`${errors} erros de página.`);
} finally {
  await browser.close();
}
