/* global window, setTimeout */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
assert.equal(
  process.env.STEP16A_CONTACT_CONFIRMED,
  '1',
  'Confirme a conversa de @gabrielrguarini na interface antes de definir STEP16A_CONTACT_CONFIRMED=1.',
);
const browser = await chromium.connectOverCDP(process.env.STEP16A_CDP ?? 'http://127.0.0.1:9258');
const page = browser
  .contexts()[0]
  .pages()
  .find((p) => p.url().startsWith('https://web.whatsapp.com/'));
assert(page, 'WhatsApp de teste não encontrado.');
page.setDefaultTimeout(7000);
const editor = page.locator('#main > footer [contenteditable]');
const authorizedHeader = await page.locator('#main > header').innerText();
const guard = async () =>
  assert(
    (await page.locator('#main > header').innerText()) === authorizedHeader,
    'Conversa alterada; teste interrompido.',
  );
const report = {
  browser: browser.version(),
  realWhatsApp: true,
  contactConfirmedByUser: true,
  syntheticGeneration: true,
  noMessageSent: true,
  checks: [],
  cleaned: false,
};
const waitText = async (text) =>
  page.waitForFunction((text) => window.streamingFixture.read() === text, text);
const clear = async () => {
  await guard();
  await editor.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
};
try {
  await guard();
  if ((await editor.innerText()).trim()) {
    if (await page.evaluate(() => window.streamingFixture?.state().kind === 'recovery')) {
      await page.getByRole('button', { name: 'Restaurar original', exact: true }).click();
      await waitText('Teste sintético original.');
    }
    const known = await page.evaluate(() => window.streamingFixture?.read());
    assert(
      [
        'Edição: Teste sintético\nSegunda linha 👋humana ',
        'Edição: humana Teste sintético\nSegunda linha 👋',
        'Teste sintético original.',
      ].includes(known),
      'Rascunho não reconhecido; não limpar.',
    );
    await page.evaluate(() => window.streamingFixture.dispose());
    await clear();
  }
  assert(!(await editor.innerText()).trim(), 'O rascunho precisa estar vazio antes do teste.');
  await page.evaluate(await readFile('.cache/step16a/fixture.js', 'utf8'));
  await page.evaluate(() => window.streamingFixture.mount());
  await editor.click();
  await page.keyboard.insertText('Teste sintético original.');
  await page.getByRole('button', { name: 'IA — assistente de escrita local', exact: true }).click();
  await page.waitForFunction(() => window.streamingFixture.state().kind === 'action-loading');
  await editor.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.insertText(' Digitado durante a espera.');
  await guard();
  await page.evaluate(() => window.streamingFixture.partial('Teste sintético'));
  await waitText('Teste sintético');
  report.checks.push('Primeiro trecho substituiu a digitação posterior ao clique.');
  await editor.click();
  await page.keyboard.press('Control+Home');
  await page.keyboard.insertText('Edição: ');
  await page.evaluate(() => window.streamingFixture.partial('Teste sintético\nSegunda linha 👋'));
  await waitText('Edição: Teste sintético\nSegunda linha 👋');
  await page.keyboard.press('Control+Home');
  for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight');
  await page.keyboard.insertText('humana ');
  await waitText('Edição: humana Teste sintético\nSegunda linha 👋');
  await page.evaluate(() =>
    window.streamingFixture.finish('Teste sintético\nSegunda linha 👋\n\nFinal.'),
  );
  await waitText('Edição: humana Teste sintético\nSegunda linha 👋\n\nFinal.');
  await page.waitForFunction(() => window.streamingFixture.state().kind === 'closed');
  report.checks.push('Streaming preservou edição, emoji e linhas vazias; cursor pode ir ao final.');
  await page.keyboard.press('Control+Z');
  assert.notEqual(
    await page.evaluate(() => window.streamingFixture.read()),
    'Edição: humana Teste sintético\nSegunda linha 👋\n\nFinal.',
  );
  report.checks.push('Histórico nativo responde a Ctrl+Z após streaming.');
  await clear();
  await page.keyboard.insertText('Teste sintético original.');
  await page.getByRole('button', { name: 'IA — assistente de escrita local', exact: true }).click();
  await page.waitForFunction(() => window.streamingFixture.state().kind === 'action-loading');
  await page.evaluate(() => window.streamingFixture.partial('Teste parcial\nsegunda'));
  await waitText('Teste parcial\nsegunda');
  await page.keyboard.press('Escape');
  await waitText('Teste sintético original.');
  report.checks.push('Escape restaurou o original após inserção multilinha.');
  await page.evaluate(() => window.streamingFixture.finish('Teste parcial\nsegunda atrasada'));
  await new Promise((resolve) => setTimeout(resolve, 100));
  await waitText('Teste sintético original.');
  report.checks.push('Conclusão atrasada não reaplicou texto depois do cancelamento.');

  await page.getByRole('button', { name: 'IA — assistente de escrita local', exact: true }).click();
  await page.waitForFunction(() => window.streamingFixture.state().kind === 'action-loading');
  await page.evaluate(() => window.streamingFixture.partial('Teste de falha'));
  await waitText('Teste de falha');
  await editor.click();
  await page.keyboard.press('Control+Home');
  await page.keyboard.insertText('Edição humana: ');
  await page.evaluate(() => window.streamingFixture.fail());
  await page.getByRole('button', { name: 'Restaurar original', exact: true }).waitFor();
  await waitText('Edição humana: Teste de falha');
  await page.getByRole('button', { name: 'Restaurar original', exact: true }).click();
  await waitText('Teste sintético original.');
  report.checks.push('Falha preservou edição humana e permitiu recuperar o original por clique.');

  await clear();
  const line = 'Linha sintética para testar. '.repeat(110).trim();
  const long = line + '\n' + line;
  await page.keyboard.insertText(line);
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.insertText(line);
  await waitText(long);
  await page.getByRole('button', { name: 'IA — assistente de escrita local', exact: true }).click();
  await page.waitForFunction(() => window.streamingFixture.state().kind === 'action-loading');
  await page.evaluate(() => window.streamingFixture.partial('Resposta sintética\nmultilinha'));
  await waitText('Resposta sintética\nmultilinha');
  await page.evaluate(() =>
    window.streamingFixture.finish('Resposta sintética\nmultilinha\nFinal.'),
  );
  await waitText('Resposta sintética\nmultilinha\nFinal.');
  await page.waitForFunction(() => window.streamingFixture.state().kind === 'closed');
  report.checks.push('Rascunho longo multilinha substituído sem revisão obrigatória.');

  await clear();
  await page.keyboard.insertText('Teste sintético original.');
  await page.evaluate(() => window.streamingFixture.dispose());
  await page.evaluate(() => window.streamingFixture.mount('preview'));
  await page.getByRole('button', { name: 'IA — assistente de escrita local', exact: true }).click();
  await page.waitForFunction(() => window.streamingFixture.state().kind === 'action-loading');
  await page.evaluate(() => window.streamingFixture.finish('Prévia sintética\nmultilinha.'));
  await waitText('Teste sintético original.');
  await page.getByRole('button', { name: 'Substituir', exact: true }).click();
  await waitText('Prévia sintética\nmultilinha.');
  report.checks.push('Prévia opcional substituiu múltiplas linhas por clique.');
  await page.evaluate(() => window.streamingFixture.dispose());
  await clear();
  report.cleaned = !(await editor.innerText()).trim();
} catch (error) {
  report.failure = {
    name: error.name,
    step: report.checks.length,
    message: error.message.split('\n')[0],
  };
  const state = await page.evaluate(() => window.streamingFixture?.state());
  report.fixtureState = state;
} finally {
  await writeFile('.cache/step16a/whatsapp.json', JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify(report) + '\n');
  await browser.close();
}
assert(!report.failure, 'Validação incompleta; consulte whatsapp.json, sem conteúdo real.');
