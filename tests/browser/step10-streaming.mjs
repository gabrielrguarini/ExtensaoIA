import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const executablePath = process.env.STEP10_CHROME;
if (!executablePath) throw new Error('Defina STEP10_CHROME com Chrome for Testing.');
const extension = path.join(root, 'dist');
const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json'), 'utf8'));
if (!['0.9.0', '0.10.0'].includes(manifest.version))
  throw new Error('Execute npm run build antes da prova.');
const profile = path.resolve(
  process.env.STEP10_PROFILE ?? path.join(root, '.cache', 'step10-browser'),
);
const options = {
  headless: false,
  viewport: { width: 1280, height: 800 },
  executablePath,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
};

// Perfil reutilizado pode reter uma versão antiga do service worker da extensão.
const bootstrap = await chromium.launchPersistentContext(profile, options);
try {
  let worker = bootstrap
    .serviceWorkers()
    .find((item) => item.url().startsWith('chrome-extension://'));
  worker ??= await bootstrap.waitForEvent('serviceworker', { timeout: 15_000 });
  try {
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
  await page.goto('https://web.whatsapp.com/?step10=fixture');
  const editor = page.locator('#main footer [role="textbox"]');
  await editor.waitFor({ state: 'visible', timeout: 20_000 });
  const draft = 'vc consegue me mandar o relatório hj?';
  await editor.fill(draft);
  await page.locator('[data-local-writing-host] button.launcher').click();
  await page.evaluate(() => {
    const shadow = globalThis.document.querySelector('[data-local-writing-host]')?.shadowRoot;
    if (!shadow) throw new Error('Interface da extensão ausente.');
    globalThis.__step10 = {
      partialUpdates: 0,
      leakedMarker: false,
      prematureActions: false,
      generating: false,
      validating: false,
    };
    const inspect = () => {
      const current = globalThis.__step10;
      const partial = shadow.querySelector('pre[aria-label="Texto em geração"]');
      if (partial) {
        current.partialUpdates++;
        if (/ENTITY/iu.test(partial.textContent ?? '')) current.leakedMarker = true;
        if (
          [...shadow.querySelectorAll('button')].some(
            (button) =>
              ['Copiar', 'Substituir'].includes(button.textContent?.trim() ?? '') &&
              !button.disabled,
          )
        )
          current.prematureActions = true;
      }
      const status = shadow.querySelector('p[role="status"]')?.textContent ?? '';
      if (status.includes('Gerando sugestão')) current.generating = true;
      if (status.includes('Validando resposta')) current.validating = true;
    };
    globalThis.__step10Observer = new globalThis.MutationObserver(inspect);
    globalThis.__step10Observer.observe(shadow, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    inspect();
  });

  const start = async () => {
    await page.getByRole('button', { name: 'Corrigir com IA local' }).click();
  };
  const partial = page.getByLabel('Texto em geração');
  async function waitFor(kind) {
    const deadline = Date.now() + 10 * 60_000;
    let previousStatus = '';
    let previousUpdates = -1;
    while (Date.now() < deadline) {
      const alert = page.locator('[data-local-writing-host] p[role="alert"]');
      if (await alert.isVisible())
        throw new Error(`A extensão recusou a geração: ${await alert.textContent()}`);
      if (kind === 'partial' && (await page.getByLabel('Texto da sugestão').isVisible()))
        throw new Error('A resposta terminou sem exibir um trecho provisório.');
      if (
        await page
          .getByLabel(kind === 'partial' ? 'Texto em geração' : 'Texto da sugestão')
          .isVisible()
      )
        return;
      const status = (
        await page.locator('[data-local-writing-host] p[role="status"]').allTextContents()
      ).join(' ');
      if (status !== previousStatus) {
        previousStatus = status;
        process.stdout.write(`state=${status || 'sem status'}\n`);
      }
      const updates = await page.evaluate(() => globalThis.__step10?.partialUpdates ?? 0);
      if (updates !== previousUpdates) {
        previousUpdates = updates;
        process.stdout.write(`partial-updates=${updates}\n`);
      }
      await page.waitForTimeout(1_000);
    }
    throw new Error(`A etapa ${kind} não apareceu dentro do prazo.`);
  }
  await start();
  await waitFor('partial');
  const firstPartial = (await partial.textContent()) ?? '';
  if (!firstPartial || /ENTITY/iu.test(firstPartial))
    throw new Error('O trecho provisório está vazio ou contém marcador.');
  if ((await page.getByRole('button', { name: 'Copiar' }).count()) !== 0)
    throw new Error('Copiar apareceu antes da validação.');
  if ((await page.getByRole('button', { name: 'Substituir' }).count()) !== 0)
    throw new Error('Substituir apareceu antes da validação.');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await page.locator('[data-local-writing-host] [role="dialog"]').waitFor({ state: 'hidden' });
  if ((await editor.textContent()) !== draft) throw new Error('Cancelar alterou o rascunho.');
  await page.waitForTimeout(2_500);
  if (await page.getByLabel('Texto da sugestão').count())
    throw new Error('Apareceu resultado após cancelar.');

  await page.locator('[data-local-writing-host] button.launcher').click();
  await start();
  const suggestion = page.getByLabel('Texto da sugestão');
  await waitFor('final');
  const result = (await suggestion.textContent()) ?? '';
  if (!/relatório/iu.test(result) || !/hoje/iu.test(result) || !result.includes('?'))
    throw new Error(`Resultado final inválido: ${result}`);
  if ((await editor.textContent()) !== draft) throw new Error('Prévia alterou o rascunho.');
  if (!(await page.getByRole('button', { name: 'Copiar' }).isEnabled()))
    throw new Error('Copiar não foi liberado após validação.');
  if (!(await page.getByRole('button', { name: 'Substituir' }).isEnabled()))
    throw new Error('Substituir não foi liberado após validação.');
  await page.getByRole('button', { name: 'Cancelar' }).click();

  await page.locator('[data-local-writing-host] button.launcher').click();
  await start();
  await waitFor('partial');
  const changedDraft = 'Rascunho sintético alterado durante a geração.';
  await editor.fill(changedDraft);
  await page.waitForTimeout(2_500);
  if ((await editor.textContent()) !== changedDraft)
    throw new Error('A alteração do usuário foi perdida.');
  if (await page.getByLabel('Texto da sugestão').count())
    throw new Error('Resultado obsoleto apareceu após editar o rascunho.');
  if (await page.getByRole('button', { name: 'Copiar' }).count())
    throw new Error('Copiar apareceu após editar o rascunho.');
  if (await page.getByRole('button', { name: 'Substituir' }).count())
    throw new Error('Substituir apareceu após editar o rascunho.');
  if (await page.getByRole('button', { name: 'Cancelar' }).isVisible())
    await page.getByRole('button', { name: 'Cancelar' }).click();

  const observed = await page.evaluate(() => {
    globalThis.__step10Observer.disconnect();
    return globalThis.__step10;
  });
  if (!observed.generating || !observed.validating || observed.partialUpdates < 2)
    throw new Error(`Estados progressivos não observados: ${JSON.stringify(observed)}`);
  if (observed.leakedMarker || observed.prematureActions)
    throw new Error(`Falha de proteção durante streaming: ${JSON.stringify(observed)}`);
  if (pageErrors) throw new Error(`${pageErrors} erros de página.`);
  process.stdout.write(
    JSON.stringify({
      fixture: true,
      cancelledDuringGeneration: true,
      nextRequestCompleted: true,
      editedDraftCancelled: true,
      partialUpdates: observed.partialUpdates,
      generating: observed.generating,
      validating: observed.validating,
      leakedMarker: observed.leakedMarker,
      prematureActions: observed.prematureActions,
      pageErrors,
    }) + '\n',
  );
} finally {
  await browser.close();
}
