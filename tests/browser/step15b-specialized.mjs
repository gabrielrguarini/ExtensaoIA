/* global document, window, Rewriter, Proofreader, AbortController */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

// Controles em inglês das APIs especializadas; não comprova suporte delas a pt-BR.
const executablePath = process.env.STEP15B_REGULAR_CHROME;
if (!executablePath) throw new Error('Defina STEP15B_REGULAR_CHROME.');
const out = path.resolve('.cache/step15b/specialized');
await mkdir(out, { recursive: true });
const context = await chromium.launchPersistentContext(path.resolve('.cache/step15b-chrome'), {
  executablePath,
  headless: false,
  ignoreDefaultArgs: [
    '--disable-extensions',
    '--disable-component-update',
    '--disable-background-networking',
    '--disable-field-trial-config',
  ],
  args: [
    '--enable-unsafe-extension-debugging',
    '--enable-blink-features=AIRewriterAPI,AIProofreadingAPI',
  ],
});
const report = {
  browser: context.browser().version(),
  language: 'en',
  startedAt: new Date().toISOString(),
  apis: {},
};
try {
  const cdp = await context.browser().newBrowserCDPSession();
  const { id } = await cdp.send('Extensions.loadUnpacked', { path: path.resolve('dist') });
  const manager = await context.newPage();
  await manager.goto('chrome://extensions');
  const mode = manager.locator('extensions-toolbar #devMode');
  if ((await mode.getAttribute('aria-checked')) !== 'true') await mode.click();
  const page = await context.newPage();
  await page.goto(`chrome-extension://${id}/sidepanel.html`);
  report.availability = await page.evaluate(async () => {
    const entries = {
      rewriter: {
        api: Rewriter,
        options: {
          expectedInputLanguages: ['en'],
          expectedContextLanguages: ['en'],
          outputLanguage: 'en',
          tone: 'more-formal',
          length: 'as-is',
          format: 'plain-text',
          sharedContext:
            'Edit the draft, preserve the question and who should act. Return only the edited text.',
        },
      },
      proofreader: { api: Proofreader, options: { expectedInputLanguages: ['en'] } },
    };
    window.specializedExperiment = entries;
    const result = {};
    for (const [name, entry] of Object.entries(entries)) {
      entry.availability = await entry.api.availability(entry.options);
      result[name] = entry.availability;
      const button = document.createElement('button');
      button.textContent = `Preparar teste ${name}`;
      button.disabled = entry.availability === 'unavailable';
      document.body.prepend(button);
      button.addEventListener('click', (event) => {
        if (!event.isTrusted || !navigator.userActivation.isActive) return;
        entry.controller = new AbortController();
        entry.state = 'preparing';
        const pending = entry.api.create({
          ...entry.options,
          signal: entry.controller.signal,
          monitor(monitor) {
            monitor.addEventListener('downloadprogress', (event) => {
              entry.progress = event.loaded;
            });
          },
        });
        void pending.then(
          (session) => {
            entry.session = session;
            entry.state = 'ready';
          },
          (error) => {
            entry.error = error.name;
            entry.state = 'failed';
          },
        );
      });
    }
    return result;
  });
  for (const name of ['rewriter', 'proofreader']) {
    if (report.availability[name] === 'unavailable') {
      report.apis[name] = { unavailable: true };
      continue;
    }
    await page.getByRole('button', { name: `Preparar teste ${name}`, exact: true }).click();
    await page.waitForFunction(
      (name) => ['ready', 'failed'].includes(window.specializedExperiment[name].state),
      name,
      { timeout: 10 * 60_000 },
    );
    const preparation = await page.evaluate((name) => {
      const entry = window.specializedExperiment[name];
      return { state: entry.state, error: entry.error, progress: entry.progress };
    }, name);
    report.apis[name] = { preparation };
    assert.equal(preparation.state, 'ready');
  }
  await context.setOffline(true);
  report.offline = true;
  if (!report.apis.proofreader.unavailable) {
    const result = await page.evaluate(async () =>
      window.specializedExperiment.proofreader.session.proofread('i dont have the report yet.'),
    );
    assert.equal(typeof result.correctedInput, 'string');
    assert(Array.isArray(result.corrections));
    report.apis.proofreader.result = result;
  }
  if (!report.apis.rewriter.unavailable) {
    const result = await page.evaluate(async () => {
      const session = window.specializedExperiment.rewriter.session;
      let first = '';
      for await (const part of session.rewriteStreaming('can you send the report tomorrow?', {
        context: 'Keep the recipient responsible for sending it.',
      }))
        first += part;
      const second = await session.rewrite('please check the file.', {
        context: 'Preserve the request.',
      });
      let quota;
      try {
        await session.rewrite('word '.repeat(100000));
        quota = 'unexpected-result';
      } catch (error) {
        quota = error.name;
      }
      return { first, second, quota };
    });
    assert(result.first.trim());
    assert(result.second.trim());
    assert.equal(result.quota, 'QuotaExceededError');
    report.apis.rewriter.result = result;
  }
  await page.evaluate(() => {
    for (const entry of Object.values(window.specializedExperiment)) entry.session?.destroy();
  });
  report.completedAt = new Date().toISOString();
  await writeFile(path.join(out, 'result.json'), JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify(report) + '\n');
} catch (error) {
  report.error = error.message;
  await writeFile(path.join(out, 'attempt.json'), JSON.stringify(report, null, 2) + '\n');
  throw error;
} finally {
  await context.close();
}
