import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const executablePath = process.env.STEP11_CHROME;
if (!executablePath) throw new Error('Defina STEP11_CHROME com Chrome for Testing.');
const extension = path.join(root, 'dist');
const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json'), 'utf8'));
if (manifest.version !== '0.10.0') throw new Error('Execute npm run build antes da prova.');
const profile = path.resolve(
  process.env.STEP11_PROFILE ?? path.join(root, '.cache', 'step11-browser'),
);
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
    await worker.evaluate(() => chrome.storage.local.remove('writingPreferences'));
    await worker.evaluate(() => chrome.runtime.reload());
  } catch {
    // A recarga encerra o próprio service worker.
  }
} finally {
  await bootstrap.close();
}

const browser = await chromium.launchPersistentContext(profile, options);
let pageErrors = 0;
try {
  const page = await browser.newPage();
  page.on('pageerror', () => pageErrors++);
  await page.route('https://web.whatsapp.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: `<!doctype html><html lang="pt-BR"><head><style>
        body{margin:0;font:16px system-ui}main{height:100vh;display:flex;flex-direction:column}
        header{height:64px;border-bottom:1px solid #ccc}section{flex:1}
        footer{height:72px;display:flex;align-items:center;padding:16px;background:#eee}
        footer [role=textbox]{width:75%;min-height:32px;overflow:auto;background:white;border:1px solid #aaa}
      </style></head><body><main id="main"><header>Contexto sintético</header>
      <section>Fixture local, sem mensagens reais</section><footer><button>Anexar</button>
      <div role="textbox" aria-multiline="true" contenteditable="true"></div><button>Áudio</button>
      </footer></main></body></html>`,
    });
  });
  await page.goto('https://web.whatsapp.com/?step11=fixture');
  const editor = page.locator('#main footer [role="textbox"]');
  await editor.waitFor({ state: 'visible', timeout: 20_000 });
  const draft = 'vc consegue me mandar o relatório hj?';
  await editor.fill(draft);
  const launcher = page.locator('[data-local-writing-host] button.launcher');
  const checkbox = page.getByRole('checkbox', { name: /Revisão semântica adicional/ });
  const status = page.locator('[data-local-writing-host] p[role="status"]');
  const suggestion = page.getByLabel('Texto da sugestão');
  const alert = page.locator('[data-local-writing-host] p[role="alert"]');

  async function openMenu() {
    await launcher.click();
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.waitFor({ state: 'attached' });
    const deadline = Date.now() + 10_000;
    while (!(await checkbox.isEnabled()) && Date.now() < deadline) {
      if (await alert.isVisible())
        throw new Error(`Preferência indisponível: ${await alert.textContent()}`);
      await page.waitForTimeout(100);
    }
    if (!(await checkbox.isEnabled())) throw new Error('A preferência não ficou disponível.');
  }

  async function waitFor(predicate, label) {
    const deadline = Date.now() + 8 * 60_000;
    while (Date.now() < deadline) {
      if (await alert.isVisible()) throw new Error(`${label}: ${await alert.textContent()}`);
      if (await predicate()) return;
      await page.waitForTimeout(250);
    }
    throw new Error(`Tempo limite: ${label}`);
  }

  await openMenu();
  if (await checkbox.isChecked()) throw new Error('A revisão não começou desligada.');
  await page.evaluate(() => {
    const shadow = globalThis.document.querySelector('[data-local-writing-host]')?.shadowRoot;
    if (!shadow) throw new Error('Interface ausente.');
    globalThis.__step11Phases = { reviewing: 0, validating: 0, earlyActions: false };
    const inspect = () => {
      const text = shadow.querySelector('p[role="status"]')?.textContent ?? '';
      if (text.includes('Revisando significado')) globalThis.__step11Phases.reviewing++;
      if (text.includes('Validando resposta')) globalThis.__step11Phases.validating++;
      if (
        (text.includes('Revisando significado') || text.includes('Validando resposta')) &&
        [...shadow.querySelectorAll('button')].some(
          (button) =>
            ['Copiar', 'Substituir'].includes(button.textContent?.trim() ?? '') && !button.disabled,
        )
      )
        globalThis.__step11Phases.earlyActions = true;
    };
    globalThis.__step11Observer = new globalThis.MutationObserver(inspect);
    globalThis.__step11Observer.observe(shadow, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    inspect();
  });
  const run = async () => page.getByRole('button', { name: 'Corrigir com IA local' }).click();
  const close = async () => page.getByRole('button', { name: 'Cancelar' }).click();

  await run();
  await waitFor(() => suggestion.isVisible(), 'prévia sem revisão');
  const offPhases = await page.evaluate(() => ({ ...globalThis.__step11Phases }));
  if (offPhases.reviewing || !offPhases.validating || offPhases.earlyActions)
    throw new Error(`Fluxo desligado inválido: ${JSON.stringify(offPhases)}`);
  if ((await editor.textContent()) !== draft) throw new Error('Prévia alterou o rascunho.');
  await close();

  await openMenu();
  await checkbox.check();
  await waitFor(
    async () => (await checkbox.isEnabled()) && (await checkbox.isChecked()),
    'salvamento da preferência',
  );
  await close();
  await openMenu();
  if (!(await checkbox.isChecked())) throw new Error('A preferência não persistiu.');

  await run();
  await waitFor(() => suggestion.isVisible(), 'prévia com revisão');
  const onPhases = await page.evaluate(() => ({ ...globalThis.__step11Phases }));
  if (!onPhases.reviewing || onPhases.earlyActions)
    throw new Error(`Revisão não observada: ${JSON.stringify(onPhases)}`);
  if (!(await page.getByRole('button', { name: 'Copiar' }).isEnabled()))
    throw new Error('Copiar não foi liberado após aprovação.');
  if ((await editor.textContent()) !== draft) throw new Error('Revisão alterou o rascunho.');
  await close();

  await openMenu();
  await run();
  await waitFor(
    async () => (await status.allTextContents()).join(' ').includes('Revisando significado'),
    'início da revisão para cancelar',
  );
  await close();
  await page.waitForTimeout(2_500);
  if (await suggestion.count()) throw new Error('Resultado apareceu após cancelar a revisão.');
  if ((await editor.textContent()) !== draft) throw new Error('Cancelar alterou o rascunho.');

  await openMenu();
  await checkbox.uncheck();
  await waitFor(
    async () => (await checkbox.isEnabled()) && !(await checkbox.isChecked()),
    'restauração da preferência',
  );
  await close();
  const phases = await page.evaluate(() => {
    globalThis.__step11Observer.disconnect();
    return globalThis.__step11Phases;
  });
  if (pageErrors) throw new Error(`${pageErrors} erros de página.`);
  process.stdout.write(
    JSON.stringify({
      fixture: true,
      defaultOff: true,
      preferencePersisted: true,
      offPhases,
      onPhases,
      cancelledDuringReview: true,
      earlyActions: phases.earlyActions,
      pageErrors,
    }) + '\n',
  );
} finally {
  await browser.close();
}
