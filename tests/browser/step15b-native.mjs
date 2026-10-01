/* global document, setTimeout, clearTimeout */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import { chromium } from 'playwright-core';
const root = process.cwd();
const regular = Boolean(process.env.STEP15B_REGULAR_CHROME);
const portuguesePrompt = process.env.STEP15B_PORTUGUESE_PROMPT === '1';
const skipIdle = process.env.STEP15B_SKIP_IDLE === '1';
const executablePath = process.env.STEP15B_REGULAR_CHROME ?? process.env.STEP15B_CHROME;
if (!executablePath) throw new Error('Defina STEP15B_CHROME.');
const experimental = process.env.STEP15B_EXPERIMENTAL === '1';
const extension = path.join(root, 'dist');
const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json'), 'utf8'));
const run = regular
  ? skipIdle
    ? 'regular-controls'
    : 'regular'
  : experimental
    ? 'experimental'
    : 'standard';
const out = path.join(root, '.cache', 'step15b', run);
await mkdir(out, { recursive: true });
const context = await chromium.launchPersistentContext(
  path.join(root, '.cache', regular ? 'step15b-chrome' : 'step15-isolated'),
  {
    executablePath,
    headless: false,
    serviceWorkers: 'block',
    viewport: { width: 1280, height: 800 },
    ignoreDefaultArgs: [
      '--disable-extensions',
      ...(experimental || regular
        ? [
            '--disable-component-update',
            '--disable-background-networking',
            '--disable-field-trial-config',
          ]
        : []),
    ],
    args: [
      ...(experimental ? ['--enable-blink-features=AIRewriterAPI,AIProofreadingAPI'] : []),
      ...(regular
        ? ['--enable-unsafe-extension-debugging']
        : ['--disable-extensions-except=' + extension, '--load-extension=' + extension]),
    ],
  },
);
const report = {
  browser: context.browser().version(),
  version: manifest.version,
  experimental,
  regular,
  portuguesePrompt,
  checks: {},
  nativeGeneration: 'pending',
  startedAt: new Date().toISOString(),
};
let pageErrors = 0;
context.on('page', (page) => page.on('pageerror', () => pageErrors++));
try {
  if (regular) {
    const install = await context.browser().newBrowserCDPSession();
    await install.send('Extensions.loadUnpacked', { path: extension });
  }
  const manager = await context.newPage();
  await manager.goto('chrome://extensions');
  const developerMode = manager.locator('extensions-toolbar #devMode');
  await developerMode.waitFor();
  if ((await developerMode.getAttribute('aria-checked')) !== 'true') await developerMode.click();
  const item = manager
    .locator('extensions-item')
    .filter({ has: manager.getByText(manifest.name, { exact: true }) });
  await item.waitFor({ timeout: 15000 });
  const id = await item.getAttribute('id');
  assert(id && /^[a-p]{32}$/u.test(id));
  const toggle = item.locator('#enableToggle');
  if ((await toggle.getAttribute('aria-checked')) !== 'true') await toggle.click();
  // Recarga do pacote pela interface. O Chrome permanece aberto até confirmar o MV3 novo.
  await item.locator('#dev-reload-button').click();
  const settings = await context.newPage();
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      await settings.goto('chrome-extension://' + id + '/popup.html');
      break;
    } catch (error) {
      if (attempt === 39) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  await settings.waitForFunction(() => !document.querySelector('fieldset')?.disabled);
  await manager.close();
  await settings.evaluate(() =>
    chrome.storage.local.set({
      writingPreferences: {
        version: 3,
        profile: 'economico',
        semanticReview: true,
        language: 'pt-BR',
        theme: 'system',
        defaultAction: 'corrigir',
        preserveSlang: true,
        addEmojis: false,
      },
    }),
  );
  const migrated = await settings.evaluate(() =>
    chrome.runtime.sendMessage({ target: 'preferences', type: 'get' }),
  );
  assert.equal(migrated.version, 4);
  assert.equal(migrated.engine, 'chrome-preferred');
  assert.equal(migrated.profile, 'economico');
  report.checks.migration = true;
  await settings.goto('chrome-extension://' + id + '/diagnostic.html');
  let popupOpened = false;
  for (let attempt = 0; attempt < 30 && !popupOpened; attempt++) {
    for (const sw of context
      .serviceWorkers()
      .filter((w) => w.url().endsWith('/service-worker.js'))
      .reverse()) {
      try {
        await sw.evaluate(() => chrome.action.openPopup());
        popupOpened = true;
        break;
      } catch {
        /* A recarga pode deixar um wrapper antigo do Worker no harness. */
      }
    }
    if (!popupOpened) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(popupOpened, 'O Service Worker vigente não abriu o popup.');
  const rootCdp = await context.browser().newBrowserCDPSession();
  const nested = new Map();
  let sequence = 0;
  rootCdp.on('Target.receivedMessageFromTarget', (event) => {
    const message = JSON.parse(event.message);
    const key = `${event.sessionId}:${message.id}`;
    const entry = nested.get(key);
    if (entry) {
      nested.delete(key);
      clearTimeout(entry.timer);
      if (message.error) entry.reject(new Error(message.error.message));
      else entry.resolve(message.result);
    }
  });
  async function command(sessionId, method, params = {}) {
    const messageId = ++sequence;
    const promise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        nested.delete(`${sessionId}:${messageId}`);
        reject(new Error(`CDP ${method} timeout`));
      }, 10000);
      nested.set(`${sessionId}:${messageId}`, { resolve, reject, timer });
    });
    await rootCdp.send('Target.sendMessageToTarget', {
      sessionId,
      message: JSON.stringify({ id: messageId, method, params }),
    });
    return promise;
  }
  async function target(pathname) {
    for (let i = 0; i < 50; i++) {
      const { targetInfos } = await rootCdp.send('Target.getTargets');
      const found = targetInfos.find((info) => info.url === `chrome-extension://${id}/${pathname}`);
      if (found) return found;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Interface ${pathname} não abriu.`);
  }

  async function attach(pathname) {
    return (
      await rootCdp.send('Target.attachToTarget', {
        targetId: (await target(pathname)).targetId,
        flatten: false,
      })
    ).sessionId;
  }
  async function evaluate(sessionId, expression) {
    const r = await command(sessionId, 'Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    return r.result.value;
  }
  async function click(sessionId, text) {
    const expression =
      '(()=>{const b=[...document.querySelectorAll("button")].find(x=>x.textContent.trim()===' +
      JSON.stringify(text) +
      ');if(!b||b.disabled)return null;b.scrollIntoView({block:"center"});const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()';
    let pos;
    for (let i = 0; i < 40; i++) {
      pos = await evaluate(sessionId, expression);
      if (pos) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert(pos, 'Botão não ficou disponível: ' + text);
    for (const type of ['mousePressed', 'mouseReleased'])
      await command(sessionId, 'Input.dispatchMouseEvent', {
        type,
        ...pos,
        button: 'left',
        clickCount: 1,
      });
  }
  const popup = await attach('popup.html');
  await click(popup, 'Abrir painel lateral');
  const panel = await attach('sidepanel.html');
  for (let i = 0; i < 50; i++) {
    if ((await evaluate(panel, 'document.visibilityState')) === 'visible') break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(await evaluate(panel, 'document.visibilityState'), 'visible');
  report.checks.visibleSidePanel = true;
  await click(panel, 'Verificar IA do Chrome');
  for (let i = 0; i < 90; i++) {
    const state = await evaluate(
      panel,
      '[...document.querySelectorAll("button")].find(x=>x.textContent==="Verificar IA do Chrome")?.disabled',
    );
    if (state === false) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  report.status = await evaluate(
    panel,
    'chrome.runtime.sendMessage({target:"chrome-ai",type:"status"})',
  );
  if (portuguesePrompt) {
    report.declaredStatus = report.status;
    await new Promise((resolve) => setTimeout(resolve, 300));
    const position = await evaluate(
      panel,
      `(()=>{
      const label=[...document.querySelectorAll('label')].find(x=>x.textContent.includes('Português por prompt no Chrome'));
      const input=label?.querySelector('input');
      if(!input||input.disabled)return null;
      if(input.checked)return {alreadyChecked:true};
      input.scrollIntoView({block:'center'});
      const r=input.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};
    })()`,
    );
    assert(position);
    report.checkboxBefore = position;
    if (!position.alreadyChecked) {
      await command(panel, 'Input.dispatchMouseEvent', { type: 'mouseMoved', ...position });
      for (const type of ['mousePressed', 'mouseReleased'])
        await command(panel, 'Input.dispatchMouseEvent', {
          type,
          ...position,
          button: 'left',
          clickCount: 1,
        });
    }
    for (let i = 0; i < 50; i++) {
      if (
        await evaluate(
          panel,
          '(async()=>{const p=await chrome.runtime.sendMessage({target:"preferences",type:"get"});return p.chromePortuguesePrompt})()',
        )
      )
        break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    await click(panel, 'Verificar IA do Chrome');
    for (let i = 0; i < 90; i++) {
      if (
        (await evaluate(
          panel,
          '[...document.querySelectorAll("button")].find(x=>x.textContent==="Verificar IA do Chrome")?.disabled',
        )) === false
      )
        break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    report.status = await evaluate(
      panel,
      'chrome.runtime.sendMessage({target:"chrome-ai",type:"status"})',
    );
    assert.equal(report.status.chromePortuguesePrompt, true);
    await click(panel, 'Preparar Corrigir');
    for (let i = 0; i < 1800; i++) {
      const prepared = await evaluate(
        panel,
        'document.body.textContent.includes("Preparação concluída e confirmada")',
      );
      if (prepared) {
        report.checks.nativePreparation = true;
        break;
      }
      if (
        await evaluate(
          panel,
          'Boolean(document.querySelector("#chrome-ai-title").parentElement.querySelector("[role=alert]"))',
        )
      )
        break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!report.checks.nativePreparation)
      report.preparationFailure = await evaluate(panel, 'document.body.textContent');
    assert(report.checks.nativePreparation);
  }
  assert.equal(report.status.ok, true);
  assert.equal(report.status.actions.length, 10);
  report.apisPresent = await evaluate(
    panel,
    '({prompt:typeof LanguageModel!=="undefined",rewriter:typeof Rewriter!=="undefined",proofreader:typeof Proofreader!=="undefined"})',
  );
  report.englishControl = await evaluate(
    panel,
    `(async()=>{
    const result={};
    for(const [name,options] of [['LanguageModel',{expectedInputs:[{type:'text',languages:['en']}],expectedOutputs:[{type:'text',languages:['en']}]}],['Rewriter',{expectedInputLanguages:['en'],expectedContextLanguages:['en'],outputLanguage:'en',tone:'more-formal',format:'plain-text',length:'as-is'}],['Proofreader',{expectedInputLanguages:['en']}]]) {
      if(!globalThis[name]) {result[name]='absent';continue;}
      try {result[name]=await Promise.race([globalThis[name].availability(options),new Promise(resolve=>setTimeout(()=>resolve('timeout-2s'),2000))]);}catch(error){result[name]=error.name;}
    }
    return result;
  })()`,
  );
  // Controle do contorno localstudio, sem criar sessão ou baixar artefatos.
  const portugueseControl = `(async()=>{
    if(typeof LanguageModel==='undefined')return {withoutDeclarations:'absent',pt:'absent'};
    const probe=async(options)=>{
      try{return await Promise.race([options===undefined?LanguageModel.availability():LanguageModel.availability(options),new Promise(resolve=>setTimeout(()=>resolve('timeout-2s'),2000))]);}catch(error){return error.name;}
    };
    const [withoutDeclarations,pt]=await Promise.all([probe(),probe({expectedInputs:[{type:'text',languages:['en','pt']}],expectedOutputs:[{type:'text',languages:['pt']}]})]);
    return {withoutDeclarations,pt};
  })()`;
  report.portugueseControl = {
    panel: await evaluate(panel, portugueseControl),
    offscreen: await evaluate(await attach('offscreen.html'), portugueseControl),
    generation: 'availability-control-only',
  };
  report.panel = await evaluate(
    panel,
    '[...document.querySelectorAll("#chrome-ai-title ~ ul li")].map(li=>({text:li.textContent,disabled:li.querySelector("button")?.disabled}))',
  );
  report.checks.offscreenStatus = true;
  const offscreenDocument = await attach('offscreen.html');
  if (portuguesePrompt) {
    await evaluate(
      offscreenDocument,
      `(()=>{
      const created=new WeakSet();const bases=new WeakMap();let baseId=0;const clone=LanguageModel.prototype.clone;const destroy=LanguageModel.prototype.destroy;
      const probe={clones:0,clonesDestroyed:0,basesDestroyed:0,baseUsage:[],baseIds:[]};globalThis.nativeLifecycleProbe=probe;
      LanguageModel.prototype.clone=function(options){
        if(!bases.has(this))bases.set(this,++baseId);
        probe.baseIds.push(bases.get(this));
        probe.baseUsage.push(this.contextUsage);
        return clone.call(this,options).then(session=>{created.add(session);probe.clones++;return session;});
      };
      LanguageModel.prototype.destroy=function(){if(created.has(this))probe.clonesDestroyed++;else probe.basesDestroyed++;return destroy.call(this);};
    })()`,
    );
  }
  await evaluate(
    panel,
    'document.getElementById("chrome-ai-title").scrollIntoView({block:"start"})',
  );
  const panelImage = await command(panel, 'Page.captureScreenshot', { format: 'png' });
  await writeFile(path.join(out, 'painel.png'), Buffer.from(panelImage.data, 'base64'));
  report.checks.downloadBlockedWhenUnavailable = report.panel.every(
    (row) => !row.text.includes('Indisponível') || row.disabled,
  );
  assert(report.checks.downloadBlockedWhenUnavailable);
  await context.route('https://web.whatsapp.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html><head><meta charset="utf-8"><style>body{font:16px system-ui}main{height:95vh;display:flex;flex-direction:column}section{flex:1}footer{display:flex;height:72px}footer [role=textbox]{width:75%;background:#eee}</style></head><body><main id="main"><header>Contexto sintético</header><section>Fixture STEP-15-B sem conversa</section><footer><button>Anexar</button><div role="textbox" aria-multiline="true" contenteditable="true">mano vc pode ver isso? 🙂</div><button>Áudio</button></footer></main></body></html>',
    }),
  );
  const page = await context.newPage();
  await (
    await context.newCDPSession(page)
  ).send('Network.setBypassServiceWorker', { bypass: true });
  await page.goto('https://web.whatsapp.com/?step15b=fixture');
  await page.getByText('Fixture STEP-15-B sem conversa', { exact: true }).waitFor();
  await context.setOffline(true);
  report.checks.offline = true;
  const original = 'mano vc pode ver isso? 🙂';
  const draft = page.locator('#main footer [role=textbox]');
  await page.locator('[data-local-writing-host] button.launcher').click();
  const before = Date.now();
  await page.getByRole('button', { name: 'Corrigir com IA local', exact: true }).click();
  const preview = page.getByLabel('Texto da sugestão');
  await preview.waitFor({ timeout: 180000 });
  assert((await preview.innerText()).trim().length);
  assert.equal(await draft.innerText(), original);
  const metadata = await page.locator('.preview-panel').innerText();
  report.generationMs = Date.now() - before;
  report.engine = metadata.includes(' · chrome')
    ? 'chrome'
    : metadata.includes(' · webllm')
      ? 'webllm'
      : 'unknown';
  assert.notEqual(report.engine, 'unknown');
  const nativeReady =
    report.status.actions.find((row) => row.action === 'corrigir').availability === 'available';
  assert.equal(report.engine, nativeReady ? 'chrome' : 'webllm');
  report.checks.engineSelectedBeforeGeneration = true;
  report.checks.originalPreserved = true;
  report.checks.reviewWarnings =
    (await page
      .getByText('Revise o texto e os avisos antes de usar a sugestão.', { exact: false })
      .count()) > 0;
  assert(report.checks.reviewWarnings);
  if (report.engine === 'chrome') {
    const beforeReview = await preview.innerText();
    await page.getByRole('button', { name: 'Analisar sentido', exact: true }).click();
    await page
      .getByText('Análise adicional concluída. Revise os avisos.', { exact: true })
      .waitFor({ timeout: 60000 });
    await page.getByText('A análise de sentido também pode errar.', { exact: true }).waitFor();
    assert.equal(await preview.innerText(), beforeReview);
    report.checks.nativeStructuredReview = true;
    await page.screenshot({ path: path.join(out, 'preview.png'), caret: 'initial' });
  }
  await page.getByRole('button', { name: /^Substituir(?: mesmo assim)?$/u }).click();
  await preview.waitFor({ state: 'hidden' });
  await draft.focus();
  await draft.press('Control+z');
  assert.equal(await draft.innerText(), original);
  report.checks.manualReplacementUndo = true;
  if (report.engine === 'chrome') {
    report.actions = [];
    for (const label of [
      'Melhorar',
      'Formal',
      'Profissional',
      'Amigável',
      'Natural',
      'Conciso',
      'Engraçado',
      'Reescrever',
    ]) {
      await page.locator('[data-local-writing-host] button.launcher').click();
      const started = Date.now();
      await page.getByRole('button', { name: label + ' com IA local', exact: true }).click();
      await preview.waitFor({ timeout: 60000 });
      assert((await preview.innerText()).trim());
      assert((await page.locator('.preview-panel').innerText()).includes(' · chrome'));
      assert.equal(await draft.innerText(), original);
      report.actions.push({
        action: label,
        text: await preview.innerText(),
        warnings: await page.locator('.suggestion-warnings ul li').allTextContents(),
        totalMs: Date.now() - started,
      });
      await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await preview.waitFor({ state: 'hidden' });
    }
    report.checks.nativeAllActions = true;
  }
  await page.locator('[data-local-writing-host] button.launcher').click();
  await page.getByRole('button', { name: 'Corrigir com IA local', exact: true }).click();
  if (report.engine === 'chrome') {
    await page.getByLabel('Texto em geração', { exact: true }).waitFor({ timeout: 60000 });
    report.checks.nativeStreaming = true;
  }
  await draft.fill('Rascunho sintético alterado durante o pedido.');
  await page
    .getByText('O rascunho ou a conversa mudou. Feche e crie uma nova prévia.', { exact: true })
    .waitFor();
  assert.equal(await page.getByRole('button', { name: /^Substituir/u }).count(), 0);
  report.checks.staleBlocked = true;
  if (report.engine === 'chrome' && !skipIdle) {
    const ready = await evaluate(
      panel,
      'chrome.runtime.sendMessage({target:"chrome-ai",type:"status"})',
    );
    assert(ready.sessionReady);
    process.stdout.write('Validando liberação nativa após cinco minutos sem uso.\n');
    const idleStart = Date.now();
    for (let i = 0; i < 34; i++) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      const state = await evaluate(
        panel,
        'chrome.runtime.sendMessage({target:"chrome-ai",type:"status"})',
      );
      if (!state.sessionReady) {
        report.checks.nativeIdle = true;
        break;
      }
    }
    report.nativeIdleMs = Date.now() - idleStart;
    assert(report.checks.nativeIdle);
    assert(report.nativeIdleMs >= 290000);
  }
  if (skipIdle)
    report.nativeIdleValidation = 'não repetida neste complemento; ver execução regular';
  await evaluate(panel, 'chrome.runtime.sendMessage({target:"chrome-ai",type:"unload"})');
  report.checks.nativeUnloadCommand = true;
  if (portuguesePrompt) {
    report.lifecycle = await evaluate(offscreenDocument, 'globalThis.nativeLifecycleProbe');
    assert.equal(report.lifecycle.clones, report.lifecycle.clonesDestroyed);
    assert(report.lifecycle.clones >= 11);
    for (const id of new Set(report.lifecycle.baseIds))
      assert.equal(
        new Set(
          report.lifecycle.baseUsage.filter((_, index) => report.lifecycle.baseIds[index] === id),
        ).size,
        1,
      );
    assert(report.lifecycle.basesDestroyed >= 1);
    report.checks.nativeIsolatedClones = true;
  }
  const stored = await settings.evaluate(() => chrome.storage.local.get(null));
  assert.deepEqual(Object.keys(stored), ['writingPreferences']);
  assert.equal(stored.writingPreferences.engine, 'chrome-preferred');
  assert.equal(stored.writingPreferences.chromePortuguesePrompt, portuguesePrompt);
  report.checks.preferencesOnly = true;
  await page.screenshot({ path: path.join(out, 'fixture.png'), caret: 'initial' });
  report.nativeGeneration = report.engine === 'chrome' ? 'passed' : 'pending-browser-availability';
  report.pageErrors = pageErrors;
  assert.equal(pageErrors, 0);
  report.completedAt = new Date().toISOString();
  await writeFile(path.join(out, 'result.json'), JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify(report) + '\n');
} catch (error) {
  report.error = error.message;
  await writeFile(path.join(out, 'attempt.json'), JSON.stringify(report, null, 2) + '\n');
  await writeFile(
    path.join(out, `attempt-${Date.now()}.json`),
    JSON.stringify(report, null, 2) + '\n',
  );
  throw error;
} finally {
  await context.close();
}
