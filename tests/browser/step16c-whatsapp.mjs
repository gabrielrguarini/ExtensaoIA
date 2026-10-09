/* global document, window, DataTransfer, ClipboardEvent */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

assert.equal(
  process.env.STEP16C_CONTACT_CONFIRMED,
  '1',
  'Confirme a conversa de @gabrielrguarini antes do teste.',
);
const browser = await chromium.connectOverCDP(process.env.STEP16C_CDP ?? 'http://127.0.0.1:9258');
const page = browser
  .contexts()[0]
  .pages()
  .find((p) => p.url().startsWith('https://web.whatsapp.com/'));
assert(page, 'WhatsApp do perfil dedicado não encontrado.');
page.setDefaultTimeout(7000);
const editor = page.locator('#main > footer [contenteditable]');
const header = await page.locator('#main > header').innerText();
const guard = async () =>
  assert.equal(
    await page.locator('#main > header').innerText(),
    header,
    'Conversa alterada; interromper.',
  );
const original =
  'Linha sintética de texto simples colado. '.repeat(140).trim() + '\n\nFinal sintético 👋';
const report = {
  browser: browser.version(),
  realWhatsApp: true,
  contactConfirmedByUser: true,
  syntheticGeneration: true,
  clipboardSystemUsed: false,
  noMessageSent: true,
  checks: [],
  cleaned: false,
};
const waitText = (text) =>
  page.waitForFunction((text) => window.streamingFixture.read() === text, text);
let mounted = false;
try {
  await guard();
  assert(!(await editor.innerText()).trim(), 'Não alterar rascunho existente.');
  assert.equal(
    await page.locator('[data-local-writing-host]').count(),
    0,
    'Montagem anterior presente; não duplicar o botão.',
  );
  await page.evaluate(await readFile('.cache/step16c/fixture.js', 'utf8'));
  await page.evaluate(() => window.streamingFixture.mount());
  mounted = true;
  await editor.click();
  await page.evaluate((text) => {
    const field = document.querySelector('#main > footer [contenteditable]');
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', text);
    field.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData,
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    );
  }, original);
  await waitText(original);
  await guard();
  // Somente metadados do DOM criado pelo texto sintético. Nunca registrar o cabeçalho/conversa.
  report.plainPasteStructure = await page.evaluate(() =>
    [
      ...new Set(
        [...document.querySelector('#main > footer [contenteditable]').querySelectorAll('*')].map(
          (n) =>
            JSON.stringify({
              tag: n.tagName,
              attributes: [...n.attributes].map((a) => a.name),
              styles: [...n.style].map((k) => [k, n.style.getPropertyValue(k)]),
            }),
        ),
      ),
    ].map((x) => JSON.parse(x)),
  );
  await page.getByRole('button', { name: 'IA — assistente de escrita local', exact: true }).click();
  await page.waitForFunction(() => window.streamingFixture.state().kind === 'action-loading');
  await editor.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.insertText(' Digitado durante a espera.');
  await page.evaluate(() => window.streamingFixture.partial('Resposta sintética\nsegunda linha'));
  await waitText('Resposta sintética\nsegunda linha');
  report.checks.push(
    'Texto simples colado com mais de cinco mil caracteres e linha vazia recebeu o primeiro trecho, substituindo digitação posterior ao clique.',
  );
  await editor.click();
  await page.keyboard.press('Control+Home');
  await page.keyboard.insertText('Edição humana: ');
  await page.evaluate(() =>
    window.streamingFixture.finish('Resposta sintética\nsegunda linha\n\nFinal 👋'),
  );
  await waitText('Edição humana: Resposta sintética\nsegunda linha\n\nFinal 👋');
  await page.waitForFunction(() => window.streamingFixture.state().kind === 'closed');
  report.checks.push(
    'Sufixos completaram a resposta e preservaram edição humana, linhas vazias e emoji, sem revisão obrigatória.',
  );
  await page.keyboard.press('Control+Z');
  assert.notEqual(
    await page.evaluate(() => window.streamingFixture.read()),
    'Edição humana: Resposta sintética\nsegunda linha\n\nFinal 👋',
  );
  report.checks.push('Ctrl+Z respondeu após o streaming.');
  await guard();
  await editor.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.insertText('Teste sintético original.');
  await page.getByRole('button', { name: 'IA — assistente de escrita local', exact: true }).click();
  await page.waitForFunction(() => window.streamingFixture.state().kind === 'action-loading');
  await page.evaluate(() => window.streamingFixture.partial('Resposta parcial\n\nsegunda linha'));
  await waitText('Resposta parcial\n\nsegunda linha');
  await page.keyboard.press('Escape');
  await waitText('Teste sintético original.');
  report.checks.push('Escape recuperou o original após escrever parágrafos e linha vazia.');
  await page.evaluate(() => window.streamingFixture.finish('Resposta atrasada'));
  await waitText('Teste sintético original.');
  report.checks.push('Resposta atrasada não reaplicou texto após cancelamento.');
  await guard();
  await editor.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  report.cleaned = !(await editor.innerText()).trim();
} catch (error) {
  report.failure = {
    name: error.name,
    step: report.checks.length,
    message: error.message.split('\n')[0],
  };
} finally {
  if (mounted)
    await page.evaluate(() => {
      window.streamingFixture.dispose();
      delete window.streamingFixture;
    });
  await writeFile('.cache/step16c/whatsapp.json', JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify(report) + '\n');
  await browser.close();
}
assert(
  !report.failure && report.cleaned,
  'Validação incompleta; consultar o resultado sem conteúdo real.',
);
