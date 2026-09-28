import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const mode = process.argv[2] ?? 'online';
if (!['online', 'offline', 'download-failure', 'cache', 'regression'].includes(mode))
  throw new Error('Use online, offline, download-failure, cache ou regression.');
const executablePath = process.env.STEP06_CHROME;
if (!executablePath) throw new Error('Defina STEP06_CHROME com o caminho do Chrome for Testing.');
const profile = path.resolve(
  process.env.STEP06_PROFILE ?? path.join(root, '.cache', 'step06-browser'),
);
const profileDir = mode === 'download-failure' ? `${profile}-download-blocked` : profile;
const extension = path.join(root, 'dist');
const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json'), 'utf8'));
if (manifest.version !== '0.5.0') throw new Error('Execute npm run build antes da prova.');

const browser = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  viewport: { width: 1280, height: 800 },
  executablePath,
  ...(mode === 'offline' || mode === 'download-failure'
    ? { proxy: { server: 'http://127.0.0.1:9' } }
    : {}),
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
});
let pageErrors = 0;
try {
  const worker =
    browser.serviceWorkers()[0] ??
    (await browser.waitForEvent('serviceworker', { timeout: 30_000 }));
  const extensionId = new URL(worker.url()).host;
  const page = await browser.newPage();
  page.on('pageerror', () => pageErrors++);
  await page.goto(`chrome-extension://${extensionId}/diagnostic.html`);
  const hardware = await page.evaluate(async () => {
    if (!navigator.gpu) return { gpu: false };
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) return { gpu: true, adapter: false };
    const info = adapter.info;
    return {
      gpu: true,
      adapter: true,
      vendor: info?.vendor ?? '',
      architecture: info?.architecture ?? '',
      shaderF16: adapter.features.has('shader-f16'),
      maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
      maxBufferSize: adapter.limits.maxBufferSize,
    };
  });
  if (mode === 'cache') {
    const cache = await page.evaluate(async () => {
      const entries = [];
      for (const name of await caches.keys()) {
        const keys = await (await caches.open(name)).keys();
        entries.push({
          name,
          count: keys.length,
          hosts: [...new Set(keys.map((key) => new URL(key.url).hostname))],
        });
      }
      return {
        entries,
        storageKeys: {
          local: Object.keys(await chrome.storage.local.get(null)),
          sync: Object.keys(await chrome.storage.sync.get(null)),
          session: Object.keys(await chrome.storage.session.get(null)),
        },
      };
    });
    if (!cache.entries.some((entry) => entry.name === 'webllm/model' && entry.count > 0))
      throw new Error('Artefatos do modelo ausentes do cache.');
    if (cache.entries.some((entry) => entry.hosts.some((host) => host !== 'huggingface.co')))
      throw new Error('O cache contém uma origem de modelo inesperada.');
    if (Object.values(cache.storageKeys).some((keys) => keys.length))
      throw new Error('Chrome Storage contém dados inesperados.');
    process.stdout.write(JSON.stringify({ mode, hardware, cache }) + '\n');
  } else {
    await page.route('https://web.whatsapp.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: `<!doctype html><html lang="pt-BR"><head><style>
          body{margin:0;font:16px system-ui}main{height:100vh;display:flex;flex-direction:column}
          header{height:64px;border-bottom:1px solid #ccc}section{flex:1}
          footer{height:72px;display:flex;align-items:center;padding:16px;background:#eee}
          footer [role=textbox]{width:75%;min-height:32px;background:white;border:1px solid #aaa}
        </style></head><body><input id="independent" aria-label="Campo independente">
        <main id="main"><header>Contexto sintético</header><section>Fixture local</section>
        <footer><button>Anexar</button><div role="textbox" aria-multiline="true" contenteditable="true">Rascunho sintético</div><button>Áudio</button></footer></main>
        </body></html>`,
      });
    });
    await page.goto('https://web.whatsapp.com/');
    if (mode === 'offline' || mode === 'download-failure') await browser.setOffline(true);
    await page.locator('[data-local-writing-host] button.launcher').click();
    let outcome;
    if (mode === 'regression') {
      await page.getByRole('button', { name: 'Criar prévia simulada' }).click();
      const preview = page.getByLabel('Texto da sugestão');
      await preview.waitFor({ timeout: 30_000 });
      if ((await preview.textContent()) !== '[Simulação] Rascunho sintético')
        throw new Error('Prévia simulada da STEP-05 não corresponde à fixture.');
      await page.getByRole('button', { name: 'Cancelar' }).click();
      outcome = { type: 'simulation-preserved' };
    } else {
      await page.getByRole('button', { name: 'Baixar modelo e testar IA local' }).click();
      const independent = page.getByRole('textbox', { name: 'Campo independente' });
      await independent.fill('Digitação responsiva durante a preparação');
      if ((await independent.inputValue()) !== 'Digitação responsiva durante a preparação')
        throw new Error('A digitação independente não respondeu.');
      let last = '';
      const deadline = Date.now() + 60 * 60_000;
      while (Date.now() < deadline) {
        const result = page.getByText('Este resultado não é uma sugestão para o seu rascunho.');
        const notice = page.locator('[data-local-writing-host] p[role="alert"]');
        if (await result.isVisible()) {
          outcome = {
            type: 'generated',
            response: await page.getByLabel('Resposta do teste de IA local').textContent(),
          };
          break;
        }
        if (await notice.isVisible()) {
          outcome = { type: 'error', notice: await notice.textContent() };
          break;
        }
        const status = (
          await page.locator('[data-local-writing-host] p[role="status"]').allTextContents()
        ).join(' ');
        if (status && status !== last) {
          last = status;
          process.stdout.write(`state=${status}\n`);
        }
        await page.waitForTimeout(5000);
      }
    }
    const draft = await page.locator('footer [role="textbox"]').textContent();
    if (draft !== 'Rascunho sintético') throw new Error('O rascunho da fixture foi alterado.');
    if (mode === 'download-failure') {
      if (outcome?.type !== 'error' || !outcome.notice.includes('Não foi possível baixar'))
        throw new Error(`Falha de download esperada: ${JSON.stringify(outcome)}`);
    } else if (
      mode !== 'regression' &&
      (outcome?.type !== 'generated' || !outcome.response?.trim())
    ) {
      throw new Error(`Inferência esperada: ${JSON.stringify(outcome)}`);
    }
    if (pageErrors) throw new Error(`${pageErrors} erros na página da fixture.`);
    process.stdout.write(
      JSON.stringify({
        mode,
        chrome: await page.evaluate(() => navigator.userAgent),
        hardware,
        outcome,
        draft,
        pageErrors,
      }) + '\n',
    );
  }
} finally {
  await browser.close();
}
