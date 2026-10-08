export interface DraftContent {
  text: string;
  replacementAllowed: boolean;
}

// Uma lista conservadora: formatação rica, chips, imagens e elementos desconhecidos
// podem ter semântica que insertText não preserva. Não interpretar classes ofuscadas.
function plainElement(element: Element): boolean {
  if (!['P', 'DIV', 'SPAN', 'BR'].includes(element.tagName)) return false;
  if (element.hasAttribute('contenteditable') || element.hasAttribute('role')) return false;
  if (element.hasAttribute('data-mention') || element.hasAttribute('data-lexical-decorator'))
    return false;
  if (
    ![...element.attributes].every(({ name }) =>
      ['class', 'dir', 'style', 'data-lexical-text', 'data-lexical-paragraph'].includes(name),
    )
  )
    return false;
  if (!(element instanceof HTMLElement)) return false;
  return [...element.style].every((name) => {
    const value = element.style.getPropertyValue(name);
    if (['text-indent', 'margin-top', 'margin-bottom'].includes(name)) return value === '0px';
    if (name === 'white-space') return value === 'pre-wrap';
    // O WhatsApp desenha emojis sobre seu texto Unicode. Reintroduzir o Unicode
    // pela edição nativa permite ao próprio editor reconstruir essa apresentação.
    return (
      name === 'background-image' &&
      element.tagName === 'SPAN' &&
      element.getAttribute('data-lexical-text') === 'true' &&
      /^(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji_Modifier}|\uFE0F|\u200D)+$/u.test(
        element.textContent,
      )
    );
  });
}

function representableText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue ?? '';
  if (!(node instanceof Element)) return '';
  if (node.tagName === 'BR') return '\n';
  if (node.tagName === 'IMG') return node.getAttribute('alt') ?? '';
  if (['SCRIPT', 'STYLE'].includes(node.tagName)) return '';
  let text = '';
  let previousBlock = false;
  let hasPrevious = false;
  const children = [...node.childNodes];
  // O BR final de um bloco é o ponto de edição da última linha vazia.
  if (['P', 'DIV'].includes(node.tagName) && children.at(-1) instanceof HTMLBRElement)
    children.pop();
  for (const child of children) {
    const block = child instanceof Element && ['P', 'DIV'].includes(child.tagName);
    if (hasPrevious && (block || previousBlock)) text += '\n';
    text += representableText(child);
    previousBlock = block;
    hasPrevious = true;
  }
  return text;
}

/** Só chamar durante captura/conferência explícita; nunca durante observação do DOM. */
export function readDraft(editor: HTMLElement): DraftContent {
  const replacementAllowed = [...editor.querySelectorAll('*')].every(plainElement);
  // innerText acrescenta dois LF entre parágrafos, embora o WhatsApp mostre uma
  // única quebra. Ler seus blocos explicitamente evita expandir o rascunho ao editar.
  const hasBlocks = [...editor.children].some((node) => ['P', 'DIV'].includes(node.tagName));
  const text = hasBlocks || !replacementAllowed ? representableText(editor) : editor.innerText;
  return {
    text,
    replacementAllowed,
  };
}
