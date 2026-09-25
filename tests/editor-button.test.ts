// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mountEditorButton } from '../src/extension/content/editor-button';
import { composerFixture } from './whatsapp-fixture';

let dispose = (): void => {};
const disconnect = vi.fn();
const elementsFromPoint = vi.fn<() => Element[]>(() => []);

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      disconnect = disconnect;
    },
  );
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
    new DOMRect(100, 400, 400, 60),
  ] as unknown as DOMRectList);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(100, 400, 400, 60),
  );
  elementsFromPoint.mockReset().mockReturnValue([]);
  Object.defineProperty(document, 'elementsFromPoint', {
    configurable: true,
    value: elementsFromPoint,
  });
  document.body.innerHTML = composerFixture;
});

afterEach(() => {
  dispose();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.replaceChildren();
});

function button(): HTMLButtonElement | null {
  return (
    document.querySelector('[data-local-writing-host]')?.shadowRoot?.querySelector('button') ?? null
  );
}

it('monta um único botão acessível com estilo isolado sem alterar o editor', async () => {
  const before = document.querySelector('footer')?.outerHTML;
  dispose = mountEditorButton(document);
  expect(mountEditorButton(document)).toBe(dispose);
  await vi.advanceTimersByTimeAsync(40);
  expect(document.querySelectorAll('[data-local-writing-host]')).toHaveLength(1);
  expect(button()?.getAttribute('aria-label')).toBe('IA — assistente de escrita local');
  expect(button()?.hidden).toBe(false);
  expect(document.querySelector('footer')?.outerHTML).toBe(before);
});

it('remove botão sem editor e remonta uma vez após a troca de conversa', async () => {
  dispose = mountEditorButton(document);
  document.querySelector('#main')?.remove();
  await vi.advanceTimersByTimeAsync(40);
  expect(button()).toBeNull();
  document.body.insertAdjacentHTML('beforeend', composerFixture);
  await vi.advanceTimersByTimeAsync(1_100);
  expect(document.querySelectorAll('[data-local-writing-host]')).toHaveLength(1);
  expect(button()?.hidden).toBe(false);
});

it('não lê o texto com clique disparado por código da página', async () => {
  const editor = document.querySelector('footer [contenteditable]');
  if (!editor) throw new Error('Fixture sem editor.');
  const read = vi.fn(() => 'Não ler automaticamente');
  Object.defineProperty(editor, 'innerText', { get: read });
  dispose = mountEditorButton(document);
  await vi.advanceTimersByTimeAsync(40);
  button()?.click();
  expect(read).not.toHaveBeenCalled();
});

it('esconde o botão se as posições disponíveis sobrepõem controles nativos', async () => {
  elementsFromPoint.mockReturnValue([document.createElement('button')]);
  dispose = mountEditorButton(document);
  await vi.advanceTimersByTimeAsync(40);
  expect(button()?.hidden).toBe(true);
});

it('encerra a montagem e permite outra sem deixar hosts ou timers', async () => {
  dispose = mountEditorButton(document);
  await vi.advanceTimersByTimeAsync(40);
  dispose();
  dispose();
  expect(button()).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
  expect(disconnect).toHaveBeenCalled();
  dispose = mountEditorButton(document);
  await vi.advanceTimersByTimeAsync(40);
  expect(document.querySelectorAll('[data-local-writing-host]')).toHaveLength(1);
});
