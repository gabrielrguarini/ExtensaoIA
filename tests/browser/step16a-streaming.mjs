/* global window, document, setTimeout */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'vite';
import { chromium } from 'playwright-core';

const out = path.resolve('.cache/step16a');
await mkdir(out, { recursive: true });
await build({
  configFile: false,
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
    process.env.STEP16A_CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(8_000);
const report = {
  browser: browser.version(),
  syntheticGeneration: true,
  realWhatsApp: false,
  checks: [],
  pageErrors: 0,
};
page.on('pageerror', () => report.pageErrors++);
const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>
body{font:18px Arial;margin:50px}main{margin-top:200px}footer{padding:40px 0} [contenteditable]{white-space:pre-wrap;border:1px solid;padding:16px;min-height:100px;max-height:180px;overflow-y:auto;width:750px}
</style><main id="main"><header><span data-testid="conversation-info-header-chat-title">Contexto sintético</span></header><footer><div role="textbox" contenteditable="true">Teste sintético original.</div><button>Envio simulado</button></footer></main></html>`;
const editor = page.locator('#main > footer [contenteditable]');
const ia = page.getByRole('button', { name: 'IA — assistente de escrita local', exact: true });
await page.route('https://web.whatsapp.com/**', (route) =>
  route.fulfill({ contentType: 'text/html', body: html }),
);
async function waitText(expected) {
  try {
    await page.waitForFunction((text) => window.streamingFixture.read() === text, expected);
  } catch (error) {
    report.failure = await page.evaluate(() => ({
      ...window.streamingFixture.state(),
      text: window.streamingFixture.read(),
      selection: document.getSelection()?.toString(),
      editor: document.querySelector('#main > footer [contenteditable]')?.innerHTML,
    }));
    throw error;
  }
}
async function setup(interaction = 'direct') {
  await page.goto('https://web.whatsapp.com/');
  await page.addScriptTag({ path: path.join(out, 'fixture.js') });
  await page.evaluate((mode) => window.streamingFixture.mount(mode), interaction);
  await ia.waitFor({ state: 'visible' });
}
async function start() {
  await ia.click();
  await page.waitForFunction(() => window.streamingFixture.state().kind === 'action-loading');
}
try {
  await setup();
  await start();
  await editor.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type(' Digitado antes da IA.');
  await page.evaluate(() => window.streamingFixture.partial('Teste'));
  await waitText('Teste');
  await editor.click();
  await page.keyboard.press('Control+Home');
  await page.keyboard.type('Edição: ');
  await page.evaluate(() => window.streamingFixture.partial('Teste\nSegunda linha 👋'));
  await waitText('Edição: Teste\nSegunda linha 👋');
  await page.keyboard.press('Control+Home');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.type('humana ');
  await waitText('Edição: humana Teste\nSegunda linha 👋');
  await page.evaluate(() => window.streamingFixture.finish('Teste\nSegunda linha 👋\n\nFinal.'));
  await waitText('Edição: humana Teste\nSegunda linha 👋\n\nFinal.');
  await page.waitForFunction(() => window.streamingFixture.state().kind === 'closed');
  assert.equal(await page.getByRole('dialog').count(), 0);
  report.checks.push(
    'primeiro trecho substitui digitação; sufixos preservam edição, Unicode e linhas vazias; cursor pode ir ao final',
  );

  await setup();
  await start();
  await page.evaluate(() => window.streamingFixture.partial('Parcial\nsegunda'));
  await waitText('Parcial\nsegunda');
  await page.keyboard.press('Escape');
  await waitText('Teste sintético original.');
  await page.evaluate(() => window.streamingFixture.finish('Parcial\nsegunda atrasada'));
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(
    await page.evaluate(() => window.streamingFixture.read()),
    'Teste sintético original.',
  );
  report.checks.push('Escape restaura original e descarta conclusão atrasada');

  await setup();
  await start();
  await page.evaluate(() => window.streamingFixture.partial('Parcial'));
  await waitText('Parcial');
  await editor.click();
  await page.keyboard.press('Control+Home');
  await page.keyboard.type('Editado ');
  await page.evaluate(() => window.streamingFixture.fail());
  await page.getByRole('button', { name: 'Restaurar original' }).waitFor();
  await waitText('Editado Parcial');
  await page.getByRole('button', { name: 'Restaurar original' }).click();
  await waitText('Teste sintético original.');
  report.checks.push('falha mantém edição humana e permite restaurar o original');

  await setup();
  await start();
  await page.evaluate(() => {
    document.querySelector('header span').textContent = 'Outro contexto sintético';
    window.streamingFixture.partial('Resultado de outra conversa');
  });
  await page.waitForFunction(() => window.streamingFixture.state().kind !== 'action-loading');
  await waitText('Teste sintético original.');
  report.checks.push('troca de contexto impede escrita');

  await setup();
  const long = 'Linha sintética para testar.\n'.repeat(220).trim();
  await editor.fill(long);
  await start();
  await page.evaluate((text) => window.streamingFixture.partial(text), long.slice(0, 330));
  await waitText(long.slice(0, 330).trim());
  await page.evaluate((text) => window.streamingFixture.finish(text), long + '\nFim.');
  await waitText(long + '\nFim.');
  await page.waitForFunction(() => window.streamingFixture.state().kind === 'closed');
  assert.equal(await page.getByRole('dialog').count(), 0);
  await editor.click();
  await page.keyboard.press('Control+Z');
  assert.notEqual(await page.evaluate(() => window.streamingFixture.read()), long + '\nFim.');
  report.checks.push('rascunho longo multilinha não exige revisão e conserva histórico nativo');

  await setup();
  await start();
  await editor.dispatchEvent('compositionstart', { data: 'a' });
  await page.evaluate(() => window.streamingFixture.partial('Texto após composição'));
  await new Promise((resolve) => setTimeout(resolve, 150));
  await waitText('Teste sintético original.');
  await editor.dispatchEvent('compositionend', { data: 'a' });
  await waitText('Texto após composição');
  await page.keyboard.press('Escape');
  await waitText('Teste sintético original.');
  report.checks.push('eventos de composição adiam escrita sem perder trechos');

  for (const trigger of ['Enter', 'botão']) {
    await setup();
    await start();
    await page.evaluate(() => window.streamingFixture.partial('Parcial para envio simulado'));
    await waitText('Parcial para envio simulado');
    if (trigger === 'Enter') await page.keyboard.press('Enter');
    else await page.getByRole('button', { name: 'Envio simulado' }).click();
    await page.waitForFunction(() => window.streamingFixture.state().kind === 'closed');
    const after = await page.evaluate(() => window.streamingFixture.read());
    await page.evaluate(() =>
      window.streamingFixture.finish('Parcial para envio simulado atrasado'),
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(await page.evaluate(() => window.streamingFixture.read()), after);
    assert.notEqual(after, 'Teste sintético original.');
  }
  report.checks.push(
    'Enter/controle manual encerra escrita e ignora resposta atrasada, sem restauração',
  );

  await setup('preview');
  await start();
  await page.evaluate(() => window.streamingFixture.finish('Texto\ncom duas linhas.'));
  await page.getByRole('button', { name: 'Substituir', exact: true }).click();
  await waitText('Texto\ncom duas linhas.');
  report.checks.push('prévia opcional substitui múltiplas linhas sem restrição');
  assert.equal(report.pageErrors, 0);
  await page.screenshot({ path: path.join(out, 'synthetic-editor.png') });
} finally {
  await writeFile(path.join(out, 'browser.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
