// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WhatsAppAdapter } from '../src/integration/whatsapp/adapter';
import type { EditorTarget } from '../src/integration/whatsapp/adapter';
import { composerFixture } from './whatsapp-fixture';

let adapter: WhatsAppAdapter;
let target: EditorTarget | null;
let changes = vi.fn<(target: EditorTarget | null) => void>();

function editor(): HTMLElement {
  const result = document.querySelector<HTMLElement>('#main footer [contenteditable]');
  if (!result) throw new Error('Fixture sem editor.');
  return result;
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await vi.advanceTimersByTimeAsync(32);
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = composerFixture;
  // jsdom não calcula layout nem innerText; o Chrome é validado separadamente.
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
    new DOMRect(100, 100, 400, 60),
  ] as unknown as DOMRectList);
  Object.defineProperty(editor(), 'innerText', {
    configurable: true,
    get: () => editor().textContent ?? '',
  });
  target = null;
  changes = vi.fn();
  adapter = new WhatsAppAdapter(document);
  adapter.subscribe((next) => {
    target = next;
    changes(next);
  });
});

afterEach(() => {
  adapter.stop();
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('adaptador do compositor do WhatsApp', () => {
  it('ignora footer e campo presentes dentro do histórico', () => {
    const history = document.querySelector('[data-history]');
    if (!history) throw new Error('Histórico ausente.');
    history.innerHTML =
      '<footer><div role="textbox" contenteditable="true">Campo alheio</div></footer>';
    adapter.start();
    expect(target?.editor).toBe(document.querySelector('#main > footer [contenteditable]'));
  });

  it('seleciona somente o textbox no footer da conversa, sem depender do idioma ou classes', () => {
    editor().setAttribute('aria-label', 'Nachricht schreiben');
    editor().className = 'obfuscated-class';
    adapter.start();
    expect(target?.editor).toBe(editor());
  });

  it.each([
    '<div role="search"><div contenteditable="true" role="textbox"></div></div>',
    '<div contenteditable="true" role="searchbox"></div>',
    '<div contenteditable="false" role="textbox"></div>',
    '<div contenteditable="true" role="textbox" aria-disabled="true"></div>',
    '<div contenteditable="true" role="textbox" aria-readonly="true"></div>',
    '<div hidden><div contenteditable="true" role="textbox"></div></div>',
    '<div inert><div contenteditable="true" role="textbox"></div></div>',
    '<div role="dialog"><div contenteditable="true" role="textbox"></div></div>',
    '<div contenteditable="true" role="textbox"></div><div contenteditable="true" role="textbox"></div>',
  ])('rejeita editor ausente, desativado, secundário ou ambíguo (%s)', (markup) => {
    const footer = document.querySelector('footer');
    if (!footer) throw new Error('Footer ausente.');
    footer.innerHTML = markup;
    adapter.start();
    expect(target).toBeNull();
  });

  it('não lê texto ao montar, observar ou consultar revisão; lê apenas na captura explícita', async () => {
    const read = vi.fn(() => 'Teste sintético\nOlá 👋');
    Object.defineProperty(editor(), 'innerText', { get: read });
    for (const node of document.querySelectorAll('header, [data-history], aside')) {
      Object.defineProperty(node, 'textContent', {
        get: () => {
          throw new Error('Leitura proibida.');
        },
      });
    }
    adapter.start();
    editor().dispatchEvent(new Event('input'));
    await settle();
    expect(read).not.toHaveBeenCalled();
    const snapshot = adapter.capture();
    expect(snapshot?.text).toBe('Teste sintético\nOlá 👋');
    expect(read).toHaveBeenCalledTimes(1);
    expect(snapshot && adapter.isCurrent(snapshot)).toBe(true);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('invalida imediatamente por input/IME, mesmo voltando ao texto original', () => {
    adapter.start();
    for (const type of ['beforeinput', 'input', 'compositionstart']) {
      const snapshot = adapter.capture();
      editor().dispatchEvent(new Event(type));
      expect(snapshot && adapter.isCurrent(snapshot)).toBe(false);
    }
  });

  it('drena mutações pendentes para recusar snapshot antes do callback do observer', () => {
    adapter.start();
    const snapshot = adapter.capture();
    editor().textContent = 'Alterado por programa';
    expect(snapshot && adapter.isCurrent(snapshot)).toBe(false);
  });

  it('invalida troca de conversa com o mesmo editor e texto idêntico sem ler cabeçalho', async () => {
    adapter.start();
    const originalEditor = editor();
    const snapshot = adapter.capture();
    const label = document.querySelector('header span')?.firstChild;
    if (!label) throw new Error('Cabeçalho ausente.');
    label.nodeValue = 'Contexto sintético B';
    await settle();
    expect(target?.editor).toBe(originalEditor);
    expect(snapshot && adapter.isCurrent(snapshot)).toBe(false);
  });

  it('ignora atualizações transitórias do status sem perder a detecção de troca de título', async () => {
    adapter.start();
    const snapshot = adapter.capture();
    const status = document.querySelector('header span[title]');
    if (!status) throw new Error('Status sintético ausente.');
    status.firstChild!.nodeValue = 'Outro status sintético';
    status.setAttribute('title', 'outro status');
    await settle();
    expect(snapshot && adapter.isCurrent(snapshot)).toBe(true);
    document
      .querySelector('[data-testid="conversation-info-header-chat-title"]')
      ?.replaceChildren('Contexto sintético B');
    expect(snapshot && adapter.isCurrent(snapshot)).toBe(false);
  });

  it('ignora controles transitórios do footer, mas invalida alteração do campo', () => {
    adapter.start();
    const snapshot = adapter.capture();
    const footer = document.querySelector('#main footer');
    if (!footer) throw new Error('Footer ausente.');
    footer.append(document.createElement('button'));
    footer.querySelector('button')?.setAttribute('style', 'opacity: .5');
    expect(snapshot && adapter.isCurrent(snapshot)).toBe(true);
    editor().textContent = 'Outro rascunho sintético';
    expect(snapshot && adapter.isCurrent(snapshot)).toBe(false);
  });

  it('acompanha remoção, recriação e nova conversa sem reaproveitar editorId', async () => {
    adapter.start();
    const previousId = target?.editorId;
    const previousEditor = editor();
    const snapshot = adapter.capture();
    previousEditor.remove();
    await settle();
    expect(target).toBeNull();
    expect(snapshot && adapter.isCurrent(snapshot)).toBe(false);
    document.body.innerHTML = composerFixture;
    await settle();
    expect(target?.editorId).not.toBe(previousId);
    const nextSnapshot = adapter.capture();
    previousEditor.dispatchEvent(new Event('input'));
    expect(nextSnapshot && adapter.isCurrent(nextSnapshot)).toBe(true);
  });

  it('descobre contêiner tardio sem observação profunda de body', async () => {
    document.body.innerHTML = '<div id="app"><div data-wrapper></div></div>';
    adapter.start();
    const wrapper = document.querySelector('[data-wrapper]');
    if (!wrapper) throw new Error('Wrapper ausente.');
    wrapper.innerHTML = composerFixture;
    await vi.advanceTimersByTimeAsync(1_100);
    expect(target?.editor).toBe(editor());
  });

  it('não observa mensagens recebidas nem entra em ciclos com seu próprio host', async () => {
    adapter.start();
    changes.mockClear();
    const snapshot = adapter.capture();
    const history = document.querySelector('[data-history]');
    if (!history) throw new Error('Histórico ausente.');
    history.append(document.createElement('div'));
    const host = document.createElement('div');
    host.setAttribute('data-local-writing-host', '');
    const shadow = host.attachShadow({ mode: 'open' });
    document.body.append(host);
    for (let i = 0; i < 30; i++) shadow.append(document.createElement('button'));
    await settle();
    expect(changes).not.toHaveBeenCalled();
    expect(snapshot && adapter.isCurrent(snapshot)).toBe(true);
  });

  it('coalesce alterações, aceita montagem repetida e encerra timers/listeners/observers', async () => {
    adapter.start();
    adapter.start();
    changes.mockClear();
    for (let i = 0; i < 20; i++) editor().dispatchEvent(new Event('input'));
    await settle();
    expect(changes).toHaveBeenCalledTimes(1);
    adapter.stop();
    changes.mockClear();
    editor().dispatchEvent(new Event('input'));
    editor().textContent = 'Depois do encerramento';
    await vi.advanceTimersByTimeAsync(2_000);
    expect(changes).not.toHaveBeenCalled();
    expect(adapter.capture()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
