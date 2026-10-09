/* global document, innerWidth, getComputedStyle */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const out = path.resolve('.cache/step16d/after');
await mkdir(out, { recursive: true });
await import('./step16d-preservation.mjs');
process.env.STEP16B_OUTPUT = path.join(out, 'native');
process.env.STEP16B_PORT ??= '9262';
// O roteiro B abre o popup da ação e o painel lateral reais do Chrome,
// testa teclado/sincronização e reinicia o perfil para verificar persistência.
await import('./step16b-settings.mjs');
const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
const context = await chromium.launchPersistentContext(path.join(out, 'layout-profile'), {
  executablePath:
    process.env.STEP16B_CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: false,
  viewport: { width: 360, height: 900 },
  ignoreDefaultArgs: ['--disable-extensions'],
  args: ['--enable-unsafe-extension-debugging', '--disable-component-update'],
});
const report = {
  version: manifest.version,
  browser: context.browser().version(),
  layoutSurfaces: 'Páginas instaladas de popup/painel em abas, para matriz de larguras/temas.',
  nativeSurfacesReport: 'native/settings.json',
  layouts: [],
  checks: [],
  pageErrors: 0,
  pageModelRequests: 0,
  noModelDownloaded: true,
  noConversationOpened: true,
  noMessageSent: true,
};
context.on('page', (page) => page.on('pageerror', () => report.pageErrors++));
context.on('request', (request) => {
  if (/^https:\/\/(?:huggingface\.co|us\.aws\.cdn\.hf\.co)\//u.test(request.url()))
    report.pageModelRequests++;
});
function contrast(first, second) {
  const luminance = (color) => {
    const channels = color
      .match(/[\d.]+/gu)
      .slice(0, 3)
      .map(Number);
    return channels.reduce((sum, value, index) => {
      const channel = value / 255;
      return (
        sum +
        (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4) *
          [0.2126, 0.7152, 0.0722][index]
      );
    }, 0);
  };
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
try {
  const cdp = await context.browser().newBrowserCDPSession();
  const { id } = await cdp.send('Extensions.loadUnpacked', {
    path: path.resolve('release/ia-local-whatsapp-' + manifest.version),
  });
  const page = await context.newPage();
  const base = 'chrome-extension://' + id + '/';
  await page.goto(base + 'sidepanel.html');
  const ready = () => page.waitForFunction(() => !document.querySelector('fieldset')?.disabled);
  await ready();
  async function patch(value) {
    await page.evaluate(
      (patch) => chrome.runtime.sendMessage({ target: 'preferences', type: 'update', patch }),
      value,
    );
    await page.waitForFunction(
      (theme) => document.documentElement.dataset.theme === theme,
      value.theme,
    );
    await ready();
  }
  async function choose(label, index) {
    await page.getByLabel(label, { exact: true }).focus();
    await page.keyboard.press('Home');
    await ready();
    for (let step = 0; step < index; step++) {
      await page.keyboard.press('ArrowDown');
      await ready();
    }
    await page.keyboard.press('Enter');
    await ready();
  }
  for (const mode of ['chrome-preferred', 'local']) {
    for (const theme of ['light', 'dark', 'system']) {
      for (const system of theme === 'system' ? ['light', 'dark'] : [theme]) {
        await page.emulateMedia({ colorScheme: system });
        await patch({ engine: mode, localModel: 'gemma', theme });
        await page.waitForFunction(
          (mode) => Boolean(document.querySelector('#model-title')) === (mode === 'local'),
          mode,
        );
        for (const width of [320, 360, 480, 800]) {
          await page.setViewportSize({ width, height: 900 });
          const state = await page.evaluate(() => {
            function background(node) {
              for (let current = node; current; current = current.parentElement) {
                const color = getComputedStyle(current).backgroundColor;
                if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') return color;
              }
              return 'rgb(255, 255, 255)';
            }
            return {
              width: innerWidth,
              scrollWidth: document.documentElement.scrollWidth,
              mainWidth: document.querySelector('main').getBoundingClientRect().width,
              headings: [...document.querySelectorAll('.settings-card > h2')].map(
                (x) => x.textContent,
              ),
              background: getComputedStyle(document.body).backgroundColor,
              text: [
                ...document.querySelectorAll(
                  'h1,h2,h3,p,label,summary,a,select,button:not(:disabled)',
                ),
              ].map((x) => ({
                tag: x.tagName,
                fg: getComputedStyle(x).color,
                bg: background(x),
              })),
              controls: [...document.querySelectorAll('select,button:not(:disabled)')]
                .map((x) => ({
                  border: getComputedStyle(x).borderTopColor,
                  bg: background(x),
                  parentBg: background(x.parentElement),
                  width: x.getBoundingClientRect().width,
                }))
                .filter((x) => x.width > 0),
              selectWidths: [...document.querySelectorAll('select')].map(
                (x) => x.getBoundingClientRect().width,
              ),
            };
          });
          assert(state.scrollWidth <= width, 'Rolagem horizontal nas configurações.');
          assert(state.mainWidth <= 480);
          assert.deepEqual(state.headings, [
            'Inteligência artificial',
            'Como escrever',
            'Aparência',
          ]);
          const minTextContrast = Math.min(...state.text.map((x) => contrast(x.fg, x.bg)));
          const minControlContrast = Math.min(
            ...state.controls.map((x) =>
              Math.max(contrast(x.border, x.bg), contrast(x.bg, x.parentBg)),
            ),
          );
          assert(minTextContrast >= 4.5, 'Contraste insuficiente em texto.');
          // Botões preenchidos são delimitados pela superfície, não pelo próprio contorno.
          assert(minControlContrast >= 3, 'Contraste insuficiente nos contornos dos controles.');
          assert(state.selectWidths.every((width) => width > 0));
          report.layouts.push({
            mode,
            theme,
            system,
            width,
            background: state.background,
            minTextContrast,
            minControlContrast,
            scrollWidth: state.scrollWidth,
          });
          if (width === 360 && theme !== 'system')
            await page.screenshot({
              path: path.join(out, `panel-${mode}-${theme}.png`),
              fullPage: true,
            });
        }
      }
    }
  }
  report.checks.push(
    '32 combinações de modo/tema/largura (320–800 px), três grupos e contraste de texto/controles aprovados.',
  );
  for (const layout of report.layouts.filter((x) => x.theme === 'system')) {
    const explicit = report.layouts.find(
      (x) => x.mode === layout.mode && x.width === layout.width && x.theme === layout.system,
    );
    assert.equal(layout.background, explicit.background);
  }
  await page.setViewportSize({ width: 360, height: 900 });
  await patch({
    engine: 'local',
    localModel: 'gemma',
    theme: 'dark',
    preserveSlang: false,
    addEmojis: true,
  });
  await choose('Tema', 1);
  assert.equal(await page.getByLabel('Tema', { exact: true }).inputValue(), 'light');
  const focus = await page.getByLabel('Tema', { exact: true }).evaluate((x) => ({
    focused: document.activeElement === x,
    visible: x.matches(':focus-visible'),
    outline: getComputedStyle(x).outlineStyle,
    width: getComputedStyle(x).outlineWidth,
  }));
  assert(focus.focused && focus.visible && focus.outline === 'solid' && focus.width === '3px');
  report.focus = focus;
  for (const label of ['Preservar gírias', 'Permitir novos emojis']) {
    const control = page.getByLabel(label, { exact: true });
    const original = await control.isChecked();
    await control.focus();
    await page.keyboard.press('Space');
    await ready();
    assert.equal(await control.isChecked(), !original);
    await page.keyboard.press('Space');
    await ready();
    assert.equal(await control.isChecked(), original);
  }
  const details = page.locator('details');
  await details.locator('summary').focus();
  await page.keyboard.press('Enter');
  assert.equal(await details.getAttribute('open'), '');
  await page.screenshot({ path: path.join(out, 'panel-storage-light.png'), fullPage: true });
  await page.keyboard.press('Enter');
  assert.equal(await details.getAttribute('open'), null);
  report.checks.push(
    'Tema, gírias, emojis e detalhes operados por teclado; foco visível e controles originais preservados.',
  );
  await page.goto(base + 'popup.html');
  await ready();
  await page.setViewportSize({ width: 375, height: 600 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(out, 'popup-full-light.png'), fullPage: true });
  await page.getByRole('link', { name: 'Licenças e informações legais' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(out, 'popup-footer-light.png') });
  report.checks.push(
    'Popup instalado completo: privacidade, licenças, controles e rodapé legíveis, sem rolagem horizontal.',
  );
  assert.equal(report.pageErrors, 0);
  assert.equal(report.pageModelRequests, 0);
} catch (error) {
  report.failure = { name: error.name, message: error.message.split('\n')[0] };
  throw error;
} finally {
  await context.close();
  await writeFile(path.join(out, 'layout.json'), JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify(report) + '\n');
}
