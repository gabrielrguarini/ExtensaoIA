// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WhatsAppAdapter } from '../src/integration/whatsapp/adapter';
import { readDraft } from '../src/integration/whatsapp/draft';
import { composerFixture } from './whatsapp-fixture';

let adapter: WhatsAppAdapter;
let editor: HTMLElement;
let text: string;
let exec = vi.fn<(command: string, show?: boolean, value?: string) => boolean>();
beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = composerFixture;
  const field = document.querySelector<HTMLElement>('#main > footer [contenteditable]');
  if (!field) throw new Error('Fixture ausente.');
  editor = field;
  editor.tabIndex = 0;
  text = 'Original Olá 👋';
  editor.textContent = text;
  Object.defineProperty(editor, 'innerText', { configurable: true, get: () => text });
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
    new DOMRect(0, 0, 100, 20),
  ] as unknown as DOMRectList);
  Object.defineProperty(document, 'queryCommandSupported', {
    configurable: true,
    value: vi.fn(() => true),
  });
  Object.defineProperty(document, 'queryCommandEnabled', {
    configurable: true,
    value: vi.fn(() => true),
  });
  exec = vi.fn((_command, _show, value) => {
    if (_command === 'selectAll') return true;
    text = value ?? '';
    return true;
  });
  Object.defineProperty(document, 'execCommand', { configurable: true, value: exec });
  adapter = new WhatsAppAdapter(document);
  adapter.start();
});
afterEach(() => {
  adapter.stop();
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.replaceChildren();
});
function capture() {
  const snapshot = adapter.capture();
  if (!snapshot) throw new Error('Sem snapshot.');
  return snapshot;
}

describe('edição nativa isolada no adaptador', () => {
  it('lê parágrafos como quebras únicas, preservando linhas vazias e Unicode', () => {
    editor.innerHTML = '<p><br></p><p>Olá 👋</p><p><br></p><p>Fim</p><p><br></p>';
    expect(readDraft(editor).text).toBe('\nOlá 👋\n\nFim\n');
    expect(readDraft(editor).replacementAllowed).toBe(false);
  });
  it('mantém múltiplas linhas somente para cópia, inclusive em sugestões novas', async () => {
    const snapshot = capture();
    expect(adapter.canReplace(snapshot, 'Primeira\nSegunda')).toBe(false);
    expect(await adapter.replace(snapshot, 'Primeira\nSegunda')).toBe('copy-only');
    editor.innerHTML = '<p>Primeira</p><p>Segunda</p>';
    expect(await adapter.replace(capture(), 'Novo')).toBe('copy-only');
    expect(exec).not.toHaveBeenCalled();
  });
  it('preserva linhas vazias em blocos DIV criados pelo Chrome', () => {
    editor.innerHTML = 'Primeira<div><br></div><div>Terceira 👋</div><div><br></div>';
    expect(readDraft(editor)).toEqual({
      text: 'Primeira\n\nTerceira 👋\n',
      replacementAllowed: false,
    });
  });
  it('usa uma única inserção literal com seleção limitada ao editor', async () => {
    const snapshot = capture();
    const result = adapter.replace(snapshot, 'Novo 👋 <b>literal</b>');
    await vi.advanceTimersByTimeAsync(60);
    expect(await result).toBe('applied');
    expect(exec.mock.calls).toEqual([
      ['selectAll'],
      ['insertText', false, 'Novo 👋 <b>literal</b>'],
    ]);
    expect(document.getSelection()?.getRangeAt(0).commonAncestorContainer).toBe(editor);
  });
  it('confere novamente o texto original mesmo sem evento de input', async () => {
    const snapshot = capture();
    text = 'Texto alterado sem evento';
    expect(await adapter.replace(snapshot, 'Novo')).toBe('stale');
    expect(exec).not.toHaveBeenCalled();
  });
  it('rejeita snapshots forjados e contexto substituído mesmo com texto idêntico', async () => {
    const snapshot = capture();
    expect(await adapter.replace({ ...snapshot }, 'Novo')).toBe('stale');
    document.querySelector('header span')?.replaceChildren(document.createTextNode('Contexto B'));
    expect(await adapter.replace(snapshot, 'Novo')).toBe('stale');
    expect(exec).not.toHaveBeenCalled();
  });
  it('não escreve quando a API está indisponível', async () => {
    Object.defineProperty(document, 'queryCommandSupported', { value: () => false });
    expect(await adapter.replace(capture(), 'Novo')).toBe('copy-only');
    expect(exec).not.toHaveBeenCalled();
  });
  it.each([
    '<span style="font-weight:bold">Texto formatado</span>',
    '<span contenteditable="false" data-mention="synthetic">@Pessoa</span>',
    '<strong>Texto com formatação</strong>',
    '<img alt="👋">',
    '<span data-unknown="chip">Referência especial</span>',
  ])('estrutura especial só oferece texto para cópia: %s', async (markup) => {
    editor.innerHTML = markup;
    const snapshot = capture();
    expect(snapshot.replacementAllowed).toBe(false);
    expect(await adapter.replace(snapshot, 'Novo')).toBe('copy-only');
    expect(exec).not.toHaveBeenCalled();
  });
  it('texto representável de chips, imagens e blocos preserva separações', () => {
    editor.innerHTML =
      '<p>Olá <span contenteditable="false">@Pessoa</span><img alt="👋"></p><p>Segunda<br>Terceira</p>';
    expect(readDraft(editor)).toEqual({
      text: 'Olá @Pessoa👋\nSegunda\nTerceira',
      replacementAllowed: false,
    });
  });
  it('aceita o emoji Unicode desenhado pelo editor e layout neutro sem aceitar estilo arbitrário', () => {
    editor.innerHTML =
      '<p style="margin-top:0px;margin-bottom:0px;text-indent:0px"><span data-lexical-text="true" style="background-image:url(https://example.invalid/emoji.png)">👋</span></p>';
    expect(capture().replacementAllowed).toBe(true);
  });
  it('comando recusado preserva o original e não tenta uma segunda inserção', async () => {
    exec.mockImplementation((command) => command === 'selectAll');
    const result = adapter.replace(capture(), 'Novo');
    await vi.advanceTimersByTimeAsync(60);
    expect(await result).toBe('failed-preserved');
    expect(exec).toHaveBeenCalledTimes(2);
    expect(text).toBe('Original Olá 👋');
  });
  it('resultado incorreto é desfeito sincronamente pela transação nativa', async () => {
    exec.mockImplementation((command) => {
      if (command === 'selectAll') return true;
      text = command === 'undo' ? 'Original Olá 👋' : 'Incorreto';
      return true;
    });
    const result = adapter.replace(capture(), 'Novo');
    await vi.advanceTimersByTimeAsync(60);
    expect(await result).toBe('failed-preserved');
    expect(exec.mock.calls.map((call) => call[0])).toEqual(['selectAll', 'insertText', 'undo']);
  });
  it('não desfaz uma edição posterior enquanto verifica a reconciliação da página', async () => {
    const result = adapter.replace(capture(), 'Novo');
    await vi.advanceTimersByTimeAsync(1);
    text = 'Edição posterior';
    await vi.advanceTimersByTimeAsync(60);
    expect(await result).toBe('failed-review');
    expect(exec).toHaveBeenCalledTimes(2);
    expect(text).toBe('Edição posterior');
  });
  it('mudança de seleção durante a espera não altera nenhum campo', async () => {
    const result = adapter.replace(capture(), 'Novo');
    await vi.advanceTimersByTimeAsync(0);
    document.getSelection()?.collapse(editor, 0);
    await vi.advanceTimersByTimeAsync(60);
    expect(await result).toBe('stale');
    expect(exec.mock.calls).toEqual([['selectAll']]);
  });
  it('cancelamento durante a seleção impede a inserção', async () => {
    const cancel = new AbortController();
    const result = adapter.replace(capture(), 'Novo', cancel.signal);
    cancel.abort();
    await vi.advanceTimersByTimeAsync(60);
    expect(await result).toBe('stale');
    expect(exec).not.toHaveBeenCalled();
  });
  it('aguarda a restauração de seleção disparada pelo foco do editor', async () => {
    editor.addEventListener(
      'focus',
      () => {
        setTimeout(() => {
          document.getSelection()?.collapse(editor, 0);
        }, 0);
      },
      { once: true },
    );
    const result = adapter.replace(capture(), 'Novo');
    await vi.advanceTimersByTimeAsync(60);
    expect(await result).toBe('applied');
  });
});
