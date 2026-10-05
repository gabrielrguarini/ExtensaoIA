/* global document, setTimeout */
import assert from 'node:assert/strict';

export async function finalControls({
  context,
  settings,
  page,
  draft,
  report,
  id,
  command,
  workerSession,
  recoveryOnly = false,
}) {
  const pause = () => new Promise((resolve) => setTimeout(resolve, 3000));
  const update = (patch) =>
    settings.evaluate(
      (patch) => chrome.runtime.sendMessage({ target: 'preferences', type: 'update', patch }),
      patch,
    );
  const launcher = page.locator('button.launcher');
  const running = (target) =>
    target.getByRole('tooltip').filter({ hasText: 'Carregando IA' }).waitFor();
  const idle = (target) =>
    target.waitForFunction(
      () =>
        document
          .querySelector('[data-local-writing-host]')
          ?.shadowRoot.querySelector('button.launcher')
          ?.getAttribute('aria-busy') === 'false',
      {},
      { timeout: 240000 },
    );
  await page.keyboard.press('Escape');
  await pause();
  const long =
    'Teste STEP-16: fazendo a revisao do texto sintetico para verificar o comportamento da extensão. '
      .repeat(24)
      .trim();
  if (!recoveryOnly) {
    await update({ defaultAction: 'corrigir', interaction: 'preview' });
    for (const structured of [false, true]) {
      if (structured) {
        await draft.evaluate((editor) => {
          const mention = document.createElement('span');
          mention.setAttribute('contenteditable', 'false');
          mention.setAttribute('data-mention', 'synthetic');
          mention.textContent = '@ContatoSintético';
          editor.replaceChildren(
            document.createTextNode('Teste STEP-16: ola '),
            mention,
            document.createTextNode(' 🙂!'),
          );
        });
      } else
        await draft.fill('Teste STEP-16: primeira linha sem acento.\nSegunda linha com emoji 🙂.');
      const original = await draft.innerText();
      await launcher.click();
      const preview = page.getByLabel('Texto da sugestão');
      await preview.waitFor({ timeout: 240000 });
      assert.equal(await draft.innerText(), original);
      assert.equal(
        await page.getByRole('button', { name: 'Substituir', exact: true }).isEnabled(),
        false,
      );
      await page.getByRole('button', { name: 'Copiar', exact: true }).click();
      await page.getByText('Sugestão copiada.', { exact: true }).waitFor();
      assert.equal(
        await page.evaluate(() => navigator.clipboard.readText()),
        await preview.innerText(),
      );
      await page.keyboard.press('Escape');
      report.checks[structured ? 'structuredMentionCopyOnly' : 'multilineUnicodeCopyOnly'] = true;
    }
    await update({ interaction: 'direct', defaultAction: 'reescrever' });
    const second = await context.newPage();
    await (
      await context.newCDPSession(second)
    ).send('Network.setBypassServiceWorker', { bypass: true });
    await second.goto('https://web.whatsapp.com/?step15f=fixture&step16=second');
    const secondDraft = second.locator('#main footer [role=textbox]');
    await draft.fill(long);
    await secondDraft.fill('Teste STEP-16: segundo rascunho independente.');
    await launcher.click();
    await running(page);
    await second.locator('button.launcher').click();
    await second.getByRole('tooltip').filter({ hasText: 'IA ocupada' }).waitFor();
    assert.equal(await secondDraft.innerText(), 'Teste STEP-16: segundo rascunho independente.');
    await page.keyboard.press('Escape');
    await pause();
    assert.equal(await draft.innerText(), long);
    report.checks.twoTabsIsolatedAndBusy = true;
    await launcher.click();
    await running(page);
    await page.locator('#main > header').evaluate((header) => {
      const replacement = header.cloneNode(true);
      replacement.textContent = 'Outro contexto sintético STEP-16';
      header.replaceWith(replacement);
    });
    await idle(page);
    await pause();
    assert.equal(await draft.innerText(), long);
    report.checks.sameDraftDifferentContextBlocked = true;
    await second.close();
  }
  await update({ defaultAction: 'corrigir', interaction: 'direct' });
  const short = 'Teste STEP-16: verificando a extensao apos reiniciar a IA.';
  await draft.fill(short);
  await launcher.click();
  await running(page);
  await idle(page);
  assert.notEqual(await draft.innerText(), short);
  // Após uma inferência real, esta versão do ONNX expõe o dispositivo usado
  // pelo backend em env.webgpu.device. Importar o módulo já carregado do Worker
  // evita depender de construtores globais ou interceptar requestAdapter.
  const runtime = report.requests.find((request) =>
    /^\/assets\/transformers\.web-.*\.js$/u.test(request.path),
  );
  assert(runtime);
  assert(workerSession());
  const capture = await command(workerSession(), 'Runtime.evaluate', {
    expression: `(async()=>{const tf=await import(${JSON.stringify(runtime.origin + runtime.path)});const device=await tf.env.backends.onnx.webgpu.device;globalThis.__step16Device=device;return typeof device.destroy==='function';})()`,
    awaitPromise: true,
  });
  assert.equal(capture.exceptionDetails, undefined);
  assert.equal(capture.result.value, true);
  report.gpuInstrumentation = { source: 'ONNX env.webgpu.device após inferência', captured: true };
  await draft.fill(long);
  await launcher.click();
  await running(page);
  const loss = await command(workerSession(), 'Runtime.evaluate', {
    expression: 'globalThis.__step16Device.destroy();true',
  });
  assert.equal(loss.exceptionDetails, undefined);
  assert.equal(loss.result.value, true);
  await idle(page);
  assert.equal(await draft.innerText(), long);
  assert.equal(await page.locator('.preview-panel').count(), 0);
  report.checks.realWebGPUDeviceLossPreservesDraft = true;
  await settings.evaluate(() =>
    chrome.runtime.sendMessage({ target: 'gemma-cache', type: 'unload' }),
  );
  await pause();
  await draft.fill(short);
  await launcher.click();
  await running(page);
  await idle(page);
  const recovered = await draft.innerText();
  assert.notEqual(recovered, short, 'Recuperação não gerou/aplicou resultado.');
  report.recoveryOutput = recovered;
  await draft.focus();
  await draft.press('Control+z');
  assert.equal(await draft.innerText(), short);
  report.checks.explicitRecoveryOfflineAfterGPULoss = true;
  await draft.fill(long);
  await launcher.click();
  await running(page);
  const coordinator = context.serviceWorkers().find((sw) => new URL(sw.url()).host === id);
  assert(coordinator);
  await coordinator.evaluate(() => chrome.offscreen.closeDocument());
  await idle(page);
  assert.equal(await draft.innerText(), long);
  await pause();
  report.checks.offscreenLossPreservesDraft = true;
  await draft.fill(short);
  await launcher.click();
  await running(page);
  await idle(page);
  assert.notEqual(await draft.innerText(), short);
  report.checks.explicitRecoveryOfflineAfterOffscreenLoss = true;
  await page.keyboard.press('Escape');
}
