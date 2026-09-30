import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const executablePath = process.env.STEP12_CHROME;
if (!executablePath) throw new Error('Defina STEP12_CHROME.');
const profile = path.resolve(
  process.env.STEP12_PROFILE ?? path.join(root, '.cache', 'step12-browser'),
);
const extension = path.join(root, 'dist');
const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json'), 'utf8'));
if (manifest.version !== '0.13.0') throw new Error('Execute npm run build antes da prova.');
const options = {
  headless: false,
  serviceWorkers: 'block',
  viewport: { width: 1280, height: 800 },
  executablePath,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
};

const bootstrap = await chromium.launchPersistentContext(profile, options);
try {
  const worker = bootstrap.serviceWorkers()[0] ?? (await bootstrap.waitForEvent('serviceworker'));
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
  const draft = 'Preciso confirmar a revisão do documento até amanhã. '.repeat(12).trim();
  await browser.route('https://web.whatsapp.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: `<!doctype html><html lang="pt-BR"><head><style>
       body{margin:0;font:16px system-ui}main{height:100vh;display:flex;flex-direction:column}
       header{height:64px}section{flex:1}footer{height:72px;display:flex;align-items:center;padding:16px;background:#eee}
       footer [role=textbox]{width:75%;min-height:32px;max-height:40px;overflow:auto;background:white;border:1px solid #aaa}
       </style></head><body><main id="main"><header>Contexto sintético</header><section>Fixture sem conversa</section>
       <footer><button>Anexar</button><div role="textbox" aria-multiline="true" contenteditable="true">${draft}</div><button>Áudio</button></footer>
       </main></body></html>`,
    });
  });
  const a = await browser.newPage();
  const b = await browser.newPage();
  // Um perfil autenticado pode ter um Service Worker do site já instalado.
  // As duas navegações devem usar somente a fixture, inclusive nesse caso.
  for (const page of [a, b]) {
    const session = await browser.newCDPSession(page);
    await session.send('Network.setBypassServiceWorker', { bypass: true });
  }
  a.on('pageerror', () => errors++);
  b.on('pageerror', () => errors++);
  await Promise.all([
    a.goto('https://web.whatsapp.com/?step12=active'),
    b.goto('https://web.whatsapp.com/?step12=switch'),
  ]);
  for (const page of [a, b])
    if ((await page.getByText('Fixture sem conversa', { exact: true }).count()) !== 1)
      throw new Error('A página sintética não carregou; teste interrompido.');
  const editorA = a.locator('#main footer [role="textbox"]');
  await a.bringToFront();
  await a
    .locator('[data-local-writing-host] button.launcher')
    .waitFor({ state: 'visible', timeout: 20_000 });
  await a.locator('[data-local-writing-host] button.launcher').click();
  const profileA = a.getByLabel('Perfil de IA local');
  await profileA.waitFor({ state: 'visible' });
  await profileA.focus();
  await profileA.press('End');
  await profileA.press('Enter');
  const readyA = Date.now() + 10_000;
  while (!(await profileA.isEnabled()) && Date.now() < readyA) await a.waitForTimeout(100);
  if ((await profileA.inputValue()) !== 'qualidade' || !(await profileA.isEnabled()))
    throw new Error('Perfil Qualidade não foi salvo.');
  await b.bringToFront();
  await b.locator('[data-local-writing-host] button.launcher').click();
  const profileB = b.getByLabel('Perfil de IA local');
  await profileB.waitFor({ state: 'visible' });
  await a.bringToFront();
  await a.getByRole('button', { name: 'Reescrever com IA local' }).click();
  await a.getByLabel('Texto em geração').waitFor({ state: 'visible', timeout: 180_000 });
  const cdp = await browser.browser().newBrowserCDPSession();
  await cdp.send('Target.setDiscoverTargets', { discover: true });
  // A fixture não cria Workers; este é o único Worker do offscreen da extensão.
  const aiWorkers = async () =>
    (await cdp.send('Target.getTargets')).targetInfos.filter((target) => target.type === 'worker');
  const previousWorkers = await aiWorkers();
  if (previousWorkers.length !== 1) throw new Error('Esperado um Worker de IA antes da troca.');
  process.stdout.write('Geração Qwen3 8B observada; trocando perfil.\n');
  await b.bringToFront();
  await profileB.focus();
  await profileB.press('Home');
  await profileB.press('Enter');
  const readyB = Date.now() + 10_000;
  while (!(await profileB.isEnabled()) && Date.now() < readyB) await b.waitForTimeout(100);
  if ((await profileB.inputValue()) !== 'economico' || !(await profileB.isEnabled()))
    throw new Error('Perfil Econômico não foi salvo.');
  const releasedAt = Date.now() + 10_000;
  while ((await aiWorkers()).length && Date.now() < releasedAt) await b.waitForTimeout(100);
  if ((await aiWorkers()).length) throw new Error('Worker anterior continuou vivo após a troca.');
  const cancelled = a.locator('[data-local-writing-host] p[role="alert"]');
  await cancelled.waitFor({ state: 'visible', timeout: 30_000 });
  const cancellation = await cancelled.textContent();
  if (!cancellation?.includes('cancelad'))
    throw new Error(`Pedido antigo não foi cancelado: ${cancellation}`);
  if (await a.getByLabel('Texto da sugestão').count())
    throw new Error('Resposta antiga apareceu após a troca.');
  if ((await editorA.textContent()) !== draft) throw new Error('Rascunho foi alterado pela troca.');
  await b.getByRole('button', { name: 'Testar IA local' }).click();
  const result = b.getByLabel('Resposta do teste de IA local');
  await result.waitFor({ state: 'visible', timeout: 120_000 });
  const text = await result.textContent();
  if (!text?.includes('TESTE')) throw new Error(`Prova Econômica inválida: ${text}`);
  if (errors) throw new Error(`${errors} erros de página.`);
  const nextWorkers = await aiWorkers();
  if (nextWorkers.length !== 1 || nextWorkers[0].targetId === previousWorkers[0].targetId)
    throw new Error('O próximo perfil não recebeu um único Worker novo.');
  process.stdout.write(
    JSON.stringify({
      activeCancelled: true,
      draftPreserved: true,
      nextProfile: 'economico',
      previousWorkerReleased: true,
      newWorkerCount: nextWorkers.length,
      proof: text,
      errors,
    }) + '\n',
  );
} finally {
  await browser.close();
}
