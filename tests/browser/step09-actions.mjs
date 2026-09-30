import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const mode = process.argv[2] ?? 'fixture';
if (!['fixture', 'whatsapp'].includes(mode)) throw new Error('Use fixture ou whatsapp.');
const executablePath = process.env.STEP09_CHROME;
if (!executablePath) throw new Error('Defina STEP09_CHROME com Chrome for Testing.');
const extension = path.join(root, 'dist');
const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json'), 'utf8'));
if (!['0.8.0', '0.9.0'].includes(manifest.version))
  throw new Error('Execute npm run build antes da prova.');
const profile = path.resolve(
  process.env.STEP09_PROFILE ?? path.join(root, '.cache', 'step09-browser'),
);
const launchOptions = {
  headless: false,
  viewport: { width: 1280, height: 800 },
  executablePath,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
};
// Um perfil reutilizado pode manter o service worker antigo mesmo com dist atualizado.
const bootstrap = await chromium.launchPersistentContext(profile, launchOptions);
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
const browser = await chromium.launchPersistentContext(profile, launchOptions);
let pageErrors = 0;
let page;

const cases = [
  {
    action: 'Corrigir',
    draft: 'vc consegue me mandar o relatório hj?',
    check: (text) => /relatório/iu.test(text) && /hoje/iu.test(text) && text.includes('?'),
  },
  {
    action: 'Melhorar',
    draft: 'vc pode dar uma olhada nesse texto quando puder.',
    check: (text) => /texto/iu.test(text) && /quando/iu.test(text) && text.endsWith('.'),
  },
  {
    action: 'Formal',
    draft: 'mano consegue ver isso pra mim hoje?',
    check: (text) => /hoje/iu.test(text) && text.includes('?') && !/mano/iu.test(text),
  },
  {
    action: 'Profissional',
    draft: 'mano consegue ver isso pra mim hoje?',
    check: (text) => /hoje/iu.test(text) && text.includes('?') && !/mano/iu.test(text),
  },
  {
    action: 'Amigável',
    draft: 'mano consegue ver isso pra mim hoje?',
    check: (text) => /hoje/iu.test(text) && text.includes('?'),
  },
  {
    action: 'Natural',
    draft: 'mano consegue ver isso pra mim hoje?',
    check: (text) => /mano/iu.test(text) && /hoje/iu.test(text) && text.includes('?'),
  },
  {
    action: 'Conciso',
    draft: 'Gostaria de pedir que você revisasse o texto hoje, se puder.',
    check: (text) => /texto/iu.test(text) && /hoje/iu.test(text) && /se puder/iu.test(text),
  },
  {
    action: 'Engraçado',
    draft: 'O texto ficou enorme, pode revisar hoje?',
    check: (text) => /texto/iu.test(text) && /hoje/iu.test(text) && text.includes('?'),
  },
  {
    action: 'Reescrever',
    draft: 'consegue me passar o arquivo hoje?',
    check: (text) => /arquivo/iu.test(text) && /hoje/iu.test(text) && text.includes('?'),
  },
  {
    action: 'Engraçado',
    draft: 'Não quero cancelar a reunião de hoje; pode me ajudar?',
    check: (text) =>
      /não/iu.test(text) &&
      /cancelar/iu.test(text) &&
      /reunião/iu.test(text) &&
      /hoje/iu.test(text) &&
      text.includes('?') &&
      !/piada|haha|kkk|😂|🤣/iu.test(text),
  },
  {
    action: 'Profissional',
    draft: 'Preciso enviar o relatório até 15/10, pode revisar antes?',
    check: (text) =>
      /relatório/iu.test(text) &&
      /até 15\/10/iu.test(text) &&
      /antes/iu.test(text) &&
      text.includes('?'),
  },
];

async function clearSyntheticDraft(page, editor, expected) {
  const current = await editor.textContent();
  if (current?.trim() && current !== expected)
    throw new Error('O rascunho mudou; limpeza interrompida para preservá-lo.');
  for (let attempt = 0; attempt < 3; attempt++) {
    await editor.click();
    await editor.press('ControlOrMeta+A');
    await editor.press('Backspace');
    await page.waitForTimeout(1_500);
    if (!(await editor.textContent())?.trim()) return;
    if ((await editor.textContent()) !== expected)
      throw new Error('O WhatsApp restaurou um rascunho diferente; limpeza interrompida.');
  }
  throw new Error('O rascunho sintético não foi limpo.');
}

try {
  page = await browser.newPage();
  page.on('pageerror', () => pageErrors++);
  if (mode === 'fixture') {
    await page.route('https://web.whatsapp.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: `<!doctype html><html lang="pt-BR"><head><style>
          body{margin:0;font:16px system-ui}main{height:100vh;display:flex;flex-direction:column}
          header{height:64px;border-bottom:1px solid #ccc}section{flex:1}
          footer{height:72px;display:flex;align-items:center;padding:16px;background:#eee}
          footer [role=textbox]{width:75%;min-height:32px;max-height:100px;overflow:auto;background:white;border:1px solid #aaa}
        </style></head><body><main id="main"><header>Contexto sintético</header>
        <section>Fixture local</section><footer><button>Anexar</button>
        <div role="textbox" aria-multiline="true" contenteditable="true"></div><button>Áudio</button>
        </footer></main></body></html>`,
      });
    });
    await page.goto('https://web.whatsapp.com/?step09=fixture');
  } else {
    await page.goto('https://web.whatsapp.com/', { waitUntil: 'domcontentloaded' });
    await page.locator('#side').waitFor({ state: 'visible', timeout: 60_000 });
    const group = page.locator('#side').getByText('Teste Extensão', { exact: true });
    if ((await group.count()) !== 1)
      throw new Error('Grupo Teste Extensão não está visível de forma única.');
    await group.click();
    const title = page.locator('#main header').getByText('Teste Extensão', { exact: true });
    await title.waitFor({ state: 'visible', timeout: 15_000 });
    if ((await title.count()) !== 1) throw new Error('Cabeçalho do grupo é ambíguo.');
  }

  const editor = page.locator('#main footer [role="textbox"][contenteditable="true"]');
  await editor.waitFor({ state: 'visible', timeout: 20_000 });
  const existing = await editor.textContent();
  if (existing?.trim()) {
    if (mode !== 'whatsapp' || !cases.some((test) => test.draft === existing))
      throw new Error('Há um rascunho preexistente; não iniciar os testes para preservá-lo.');
    await clearSyntheticDraft(page, editor, existing);
  }
  const labels = [
    'Corrigir',
    'Melhorar',
    'Formal',
    'Profissional',
    'Amigável',
    'Natural',
    'Conciso',
    'Engraçado',
    'Reescrever',
  ];
  const results = [];
  for (const [index, test] of cases.entries()) {
    if (
      process.env.STEP09_CASE &&
      !process.env.STEP09_CASE.split(',')
        .map(Number)
        .includes(index + 1)
    )
      continue;
    if (mode === 'whatsapp') {
      const title = page.locator('#main header').getByText('Teste Extensão', { exact: true });
      if ((await title.count()) !== 1 || !(await title.isVisible()))
        throw new Error('Conversa mudou; testes interrompidos antes de escrever.');
    }
    await editor.fill(test.draft);
    await page.locator('[data-local-writing-host] button.launcher').click();
    for (const label of labels) {
      if ((await page.getByRole('button', { name: `${label} com IA local` }).count()) !== 1)
        throw new Error(`A ação ${label} não apareceu exatamente uma vez.`);
    }
    await page.getByRole('button', { name: `${test.action} com IA local` }).click();
    const deadline = Date.now() + 10 * 60_000;
    let outcome;
    let lastStatus = '';
    let lastDiagnostic = '';
    let missingDialogSince = 0;
    while (Date.now() < deadline) {
      const suggestion = page.getByLabel('Texto da sugestão');
      const notice = page.locator('[data-local-writing-host] p[role="alert"]');
      if (await suggestion.isVisible()) {
        outcome = { type: 'preview', text: (await suggestion.textContent()) ?? '' };
        break;
      }
      if (await notice.isVisible()) {
        outcome = { type: 'rejected', message: (await notice.textContent()) ?? '' };
        break;
      }
      const status = (
        await page.locator('[data-local-writing-host] p[role="status"]').allTextContents()
      ).join(' ');
      if (status !== lastStatus) {
        lastStatus = status;
        process.stdout.write(`case=${index + 1} state=${status || 'sem status'}\n`);
      }
      const dialogCount = await page.locator('[data-local-writing-host] [role="dialog"]').count();
      if (dialogCount === 0) {
        missingDialogSince ||= Date.now();
        if (Date.now() - missingDialogSince > 10_000)
          throw new Error(`A prévia de ${test.action} desapareceu durante o processamento.`);
      } else {
        missingDialogSince = 0;
      }
      const diagnostic = JSON.stringify({
        dialog: dialogCount,
        suggestion: await suggestion.count(),
        notice: await notice.count(),
      });
      if (diagnostic !== lastDiagnostic) {
        lastDiagnostic = diagnostic;
        process.stdout.write(`case=${index + 1} ui=${diagnostic}\n`);
      }
      await page.waitForTimeout(1000);
    }
    if (!outcome) throw new Error(`A ação ${test.action} excedeu dez minutos.`);
    if ((await editor.textContent()) !== test.draft)
      throw new Error(`A ação ${test.action} alterou o rascunho antes da confirmação.`);
    if (outcome.type === 'rejected') {
      if (!outcome.message.includes('omitido ou alterado'))
        throw new Error(`Falha inesperada em ${test.action}: ${outcome.message}`);
      if ((await page.getByRole('button', { name: 'Substituir' }).count()) !== 0)
        throw new Error(`Substituir apareceu após rejeição em ${test.action}.`);
      if ((await page.getByRole('button', { name: 'Copiar' }).count()) !== 0)
        throw new Error(`Copiar apareceu após rejeição em ${test.action}.`);
      results.push({ case: index + 1, action: test.action, result: 'rejeição segura' });
    } else {
      if (!test.check(outcome.text))
        throw new Error(`Saída inválida em ${test.action}: ${outcome.text}`);
      if (!(await page.getByText(`IA local · ${test.action}`, { exact: true }).isVisible()))
        throw new Error(`Prévia sem rótulo do modo ${test.action}.`);
      if (index === 2 || index === 3) {
        results.push({
          case: index + 1,
          action: test.action,
          result: 'prévia',
          text: outcome.text,
        });
      } else {
        results.push({ case: index + 1, action: test.action, result: 'prévia' });
      }
      await page.getByRole('button', { name: 'Cancelar' }).click();
      if ((await editor.textContent()) !== test.draft)
        throw new Error(`Cancelar alterou o rascunho em ${test.action}.`);
    }
    if (mode === 'whatsapp') await clearSyntheticDraft(page, editor, test.draft);
    else await editor.fill('');
    process.stdout.write(`case=${index + 1} action=${test.action} result=${outcome.type}\n`);
  }
  const formal = results.find((result) => result.case === 3);
  const professional = results.find((result) => result.case === 4);
  if (
    !process.env.STEP09_CASE &&
    (!formal?.text || !professional?.text || formal.text === professional.text)
  )
    throw new Error('Formal e Profissional não produziram duas prévias distintas.');
  if (pageErrors) throw new Error(`${pageErrors} erros de página.`);
  process.stdout.write(
    JSON.stringify({ mode, groupVerified: mode === 'whatsapp', results, pageErrors }) + '\n',
  );
} finally {
  if (page && mode === 'whatsapp') {
    const group = page.locator('#main header').getByText('Teste Extensão', { exact: true });
    const editor = page.locator('#main footer [role="textbox"][contenteditable="true"]');
    if ((await group.count()) === 1 && (await editor.count()) === 1) {
      const draft = await editor.textContent();
      if (cases.some((test) => test.draft === draft)) {
        await clearSyntheticDraft(page, editor, draft);
      }
    }
  }
  await browser.close();
}
