import { readDraft } from './draft';
import type { StreamWriteResult } from './streaming-draft';

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

// O Chrome normaliza Range(editor, fim) para Range(último texto, fim).
// Comparar limites semânticos permite essa normalização sem aceitar outro cursor.
function atBoundary(editor: HTMLElement, node: Node | null, offset: number, end: boolean): boolean {
  if (!node || !editor.contains(node)) return false;
  while (true) {
    let size =
      node.nodeType === Node.TEXT_NODE ? (node.nodeValue?.length ?? 0) : node.childNodes.length;
    if (
      end &&
      node instanceof Element &&
      ['P', 'DIV'].includes(node.tagName) &&
      node.lastChild instanceof HTMLBRElement
    )
      size--;
    if (end ? offset < size : offset !== 0) return false;
    if (node === editor) return true;
    const parent: ParentNode | null = node.parentNode;
    if (!parent) return false;
    offset = [...parent.childNodes].indexOf(node as ChildNode) + (end ? 1 : 0);
    node = parent;
  }
}

/** Edição pública do contenteditable, sem APIs internas ou acesso ao clipboard do sistema. */
export async function editDraft(
  editor: HTMLElement,
  text: string,
  append: boolean,
  expected: string,
  current: () => boolean,
  composing: () => boolean,
  active: () => boolean = () => true,
): Promise<StreamWriteResult> {
  const document = editor.ownerDocument;
  if (!current() || !active()) return 'stale';
  if (composing()) return 'retry';
  if (!append && text === expected) return 'applied';
  if (!readDraft(editor).replacementAllowed) return 'unsupported';
  if (typeof document.execCommand !== 'function') return 'unsupported';
  const selection = document.getSelection();
  if (!selection) return 'unsupported';
  editor.focus({ preventScroll: true });
  await tick();
  if (!current() || !active()) return 'stale';
  if (composing() || readDraft(editor).text !== expected) return 'retry';
  if (document.activeElement !== editor) return 'retry';
  const range = document.createRange();
  range.selectNodeContents(editor);
  if (append) range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  if (!append) document.execCommand('selectAll');
  await tick();
  if (!current() || !active()) return 'stale';
  if (composing() || readDraft(editor).text !== expected) return 'retry';
  if (
    document.activeElement !== editor ||
    selection.rangeCount !== 1 ||
    !editor.contains(selection.anchorNode) ||
    !editor.contains(selection.focusNode)
  )
    return 'retry';
  // Se a pessoa moveu o cursor durante o await, não inserir em sua nova seleção.
  const selected = selection.getRangeAt(0);
  if (
    !atBoundary(editor, selected.endContainer, selected.endOffset, true) ||
    (append
      ? !selection.isCollapsed
      : !atBoundary(editor, selected.startContainer, selected.startOffset, false))
  )
    return 'retry';
  const desired = append ? expected + text : text;
  let handledPaste = false;
  try {
    if (
      /[\r\n]/u.test(text) &&
      typeof DataTransfer === 'function' &&
      typeof ClipboardEvent === 'function'
    ) {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/plain', text);
      // Editores controlados podem tratar paste e criar seus próprios parágrafos/undo.
      handledPaste = !editor.dispatchEvent(
        new ClipboardEvent('paste', {
          clipboardData,
          bubbles: true,
          cancelable: true,
          composed: true,
        }),
      );
    }
    if (!handledPaste) {
      const lines = text.split('\n');
      for (let index = 0; index < lines.length; index++) {
        if (index > 0 && !document.execCommand('insertLineBreak')) break;
        const line = lines[index] ?? '';
        if (line) document.execCommand('insertText', false, line);
        else if (index === 0 && !append) document.execCommand('delete');
      }
    }
  } catch {
    // Uma falha pode ocorrer depois de uma escrita parcial; sempre conferir o resultado.
  }
  let userEdited = false;
  const edited = () => {
    userEdited = true;
  };
  editor.addEventListener('beforeinput', edited);
  editor.addEventListener('input', edited);
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
  editor.removeEventListener('beforeinput', edited);
  editor.removeEventListener('input', edited);
  if (!current()) return 'stale';
  if (readDraft(editor).text !== desired && !userEdited) return 'failed';
  return 'applied';
}
