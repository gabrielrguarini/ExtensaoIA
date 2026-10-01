/* global document */
import assert from 'node:assert/strict';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const root = process.cwd();
const executablePath = process.env.STEP15_CHROME;
if (!executablePath) throw new Error('Defina STEP15_CHROME.');
const modelProfile = process.env.STEP15_SMOKE_PROFILE ?? 'economico';
assert(['economico', 'equilibrado', 'qualidade'].includes(modelProfile));
const extension = path.join(root, 'dist');
const context = await chromium.launchPersistentContext(
  path.join(root, '.cache', 'step15-isolated'),
  {
    executablePath,
    headless: false,
    serviceWorkers: 'block',
    viewport: { width: 1280, height: 800 },
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  },
);
let pageErrors = 0;
context.on('page', (page) => page.on('pageerror', () => pageErrors++));
try {
  let sw;
  for (let i = 0; i < 100; i++) {
    sw = context.serviceWorkers().find((item) => item.url().endsWith('/service-worker.js'));
    if (sw && (await sw.evaluate(() => Boolean(globalThis.chrome?.runtime?.id)).catch(() => false)))
      break;
    await new Promise((resolve) => globalThis.setTimeout(resolve, 100));
  }
  assert(sw);
  const id = new URL(sw.url()).host;
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.waitForFunction(() => !document.querySelector('fieldset')?.disabled);
  await popup.evaluate(
    (profile) =>
      chrome.runtime.sendMessage({
        target: 'preferences',
        type: 'update',
        patch: {
          profile,
          semanticReview: true,
          defaultAction: 'corrigir',
          preserveSlang: true,
          addEmojis: false,
        },
      }),
    modelProfile,
  );
  const original = 'mano vc pode ver isso? 🙂';
  await context.route('https://web.whatsapp.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: `<!doctype html><html><head><meta charset="utf-8"><style>body{font:16px system-ui}main{height:95vh;display:flex;flex-direction:column}section{flex:1}footer{display:flex;height:72px}footer [role=textbox]{width:75%;background:#eee}</style></head><body><main id="main"><header>Contexto sintético</header><section>Fixture STEP-15 sem conversa</section><footer><button>Anexar</button><div role="textbox" aria-multiline="true" contenteditable="true">${original}</div><button>Áudio</button></footer></main></body></html>`,
    }),
  );
  const page = await context.newPage();
  await (
    await context.newCDPSession(page)
  ).send('Network.setBypassServiceWorker', { bypass: true });
  await page.goto('https://web.whatsapp.com/?step15=fixture');
  await page.getByText('Fixture STEP-15 sem conversa', { exact: true }).waitFor();
  await context.setOffline(true);
  const draft = page.locator('#main footer [role=textbox]');
  await page.locator('[data-local-writing-host] button.launcher').click();
  await page.getByRole('button', { name: 'Corrigir com IA local', exact: true }).click();
  const preview = page.getByLabel('Texto da sugestão');
  await preview.waitFor({ timeout: 180_000 });
  const output = await preview.innerText();
  assert(output.trim().length > 0);
  await page
    .getByText('Revise o texto e os avisos antes de usar a sugestão.', { exact: false })
    .waitFor();
  const warningCount = await page.locator('.suggestion-warnings li').count();
  assert(warningCount > 0, 'Este caso sintético conhecido deve demonstrar a prévia com avisos.');
  if (!output.includes('🙂'))
    await page
      .getByText('Possível alteração de emojis. Confira o original e a sugestão.', { exact: true })
      .waitFor();
  assert.equal(
    await page.getByRole('button', { name: 'Substituir mesmo assim', exact: true }).isEnabled(),
    true,
  );
  await page.screenshot({
    path: path.join(root, '.cache', 'step15a-preview.png'),
    caret: 'initial',
  });
  await page.getByRole('button', { name: 'Analisar sentido', exact: true }).click();
  await page
    .getByRole('button', { name: 'Analisar sentido', exact: true })
    .waitFor({ timeout: 180_000 });
  assert.equal(await preview.innerText(), output);
  const semanticCompleted = await page
    .getByText('Análise adicional concluída. Revise os avisos.', { exact: true })
    .count();
  assert.equal(semanticCompleted, 1);
  assert.equal(await draft.innerText(), original);
  await page.getByRole('button', { name: /^Substituir(?: mesmo assim)?$/u }).click();
  assert.equal(await draft.innerText(), output);
  await preview.waitFor({ state: 'hidden' });
  await draft.focus();
  await draft.press('Control+z');
  assert.equal(await draft.innerText(), original);
  await page.locator('[data-local-writing-host] button.launcher').click();
  await page.getByRole('button', { name: 'Corrigir com IA local', exact: true }).click();
  await draft.fill('Rascunho sintético alterado durante o pedido.');
  await page
    .getByText('O rascunho ou a conversa mudou. Feche e crie uma nova prévia.', { exact: true })
    .waitFor();
  assert.equal(await draft.innerText(), 'Rascunho sintético alterado durante o pedido.');
  assert.equal(await page.getByRole('button', { name: /^Substituir/u }).count(), 0);
  assert.equal(pageErrors, 0);
  const result = {
    profile: modelProfile,
    browser: context.browser().version(),
    offline: true,
    legiblePreviewWithWarnings: true,
    warningCount,
    emojiPreserved: output.includes('🙂'),
    explicitSemanticReviewPreservesCandidate: true,
    originalPreservedBeforeExplicitReplacement: true,
    manualReplacementAndUndo: true,
    staleDraftBlocksApplication: true,
    pageErrors,
    syntheticFixture: true,
    noMessageSent: true,
  };
  await writeFile(
    path.join(root, '.cache', 'step15-smoke.json'),
    JSON.stringify(result, null, 2) + '\n',
  );
  process.stdout.write(JSON.stringify(result) + '\n');
} finally {
  await context.close();
}
