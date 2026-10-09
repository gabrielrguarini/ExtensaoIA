/* global window, document */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'vite';
import { chromium } from 'playwright-core';

const out = path.resolve('.cache/step16c');
await mkdir(out, { recursive: true });
await build({
  configFile: false,
  publicDir: false,
  define: { 'process.env.NODE_ENV': '"production"' },
  build: {
    outDir: out,
    emptyOutDir: false,
    lib: {
      entry: 'tests/browser/step16a-entry.ts',
      formats: ['iife'],
      name: 'StreamingFixture',
      fileName: () => 'fixture.js',
    },
  },
});
const browser = await chromium.launch({
  executablePath:
    process.env.STEP16C_CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(5000);
const report = {
  browser: browser.version(),
  syntheticGeneration: true,
  realWhatsApp: false,
  cases: [],
  pageErrors: 0,
};
page.on('pageerror', () => report.pageErrors++);
const long = 'Linha sintética para testar texto simples colado. '.repeat(110).trim();
const cases = [
  {
    name: 'minimal-pre-wrap',
    markup: '<span style="white-space:pre-wrap">x</span>',
    original: 'x',
  },
  {
    name: 'canonical-longhands',
    markup:
      '<p><span style="white-space-collapse:preserve;text-wrap-mode:wrap">Texto simples</span></p>',
    original: 'Texto simples',
  },
  {
    name: 'managed-linebreak',
    markup: '<p>x</p><p><br data-lexical-managed-linebreak="true"></p><p>y</p>',
    original: 'x\n\ny',
  },
  {
    name: 'long-plain-paste',
    markup: `<p><span style="white-space:pre-wrap">${long}</span></p><p><br data-lexical-managed-linebreak="true"></p><p>Final sintético.</p>`,
    original: long + '\n\nFinal sintético.',
  },
];
try {
  for (const test of cases) {
    await page.route('https://web.whatsapp.com/**', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>body{font:18px Arial;margin:50px}main{margin-top:200px}footer{padding:40px 0}[contenteditable]{white-space:pre-wrap;border:1px solid;padding:16px;min-height:100px;max-height:180px;overflow-y:auto;width:750px}</style><main id="main"><header><span data-testid="conversation-info-header-chat-title">Contexto sintético</span></header><footer><div role="textbox" contenteditable="true">${test.markup}</div></footer></main></html>`,
      }),
    );
    await page.goto('https://web.whatsapp.com/');
    await page.addScriptTag({ path: path.join(out, 'fixture.js') });
    await page.evaluate(() => window.streamingFixture.mount());
    assert.equal(await page.evaluate(() => window.streamingFixture.read()), test.original);
    await page
      .getByRole('button', { name: 'IA — assistente de escrita local', exact: true })
      .click();
    await page.waitForFunction(() => window.streamingFixture.state().kind === 'action-loading');
    await page.evaluate(() => window.streamingFixture.partial('Resposta sintética.'));
    await page.waitForFunction(
      () =>
        window.streamingFixture.read() === 'Resposta sintética.' ||
        window.streamingFixture.state().kind === 'notice',
    );
    const result = await page.evaluate(() => ({
      applied: window.streamingFixture.read() === 'Resposta sintética.',
      state: window.streamingFixture.state().kind,
      notice: document
        .querySelector('[data-local-writing-host]')
        ?.shadowRoot?.querySelector('[role=tooltip]')?.textContent,
    }));
    const item = { name: test.name, ...result };
    report.cases.push(item);
    if (result.applied) {
      await page.evaluate(() => window.streamingFixture.finish('Resposta sintética.\nFinal.'));
      await page.waitForFunction(() => window.streamingFixture.state().kind === 'closed');
      assert.equal(
        await page.evaluate(() => window.streamingFixture.read()),
        'Resposta sintética.\nFinal.',
      );
      assert.equal(await page.getByRole('dialog').count(), 0);
      item.completedWithoutReview = true;
    }
    await page.unroute('https://web.whatsapp.com/**');
  }
  assert(
    report.cases.every((item) => item.applied && item.completedWithoutReview),
    'Texto simples colado deve ser substituído sem o aviso de estrutura incompatível.',
  );
  assert.equal(report.pageErrors, 0);
} finally {
  await writeFile(path.join(out, 'structure.json'), JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify(report) + '\n');
  await browser.close();
}
