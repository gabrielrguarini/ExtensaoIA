// Todos os seletores do site ficam aqui. Nenhum texto de contato ou histórico é lido.
const selectors = {
  conversation: '#main',
  composer: ':scope > footer',
  header: ':scope > header',
  editor:
    '[contenteditable="true"][role="textbox"], [contenteditable="plaintext-only"][role="textbox"]',
  excluded:
    '[role="search"], [role="searchbox"], [role="dialog"], [aria-modal="true"], [hidden], [inert], [aria-hidden="true"]',
};

export interface EditorTarget {
  readonly conversation: HTMLElement;
  readonly composer: HTMLElement;
  readonly editor: HTMLElement;
  readonly header: HTMLElement | null;
  readonly editorId: string;
}

export interface DraftSnapshot {
  readonly editorId: string;
  readonly snapshotId: string;
  readonly revision: number;
  readonly text: string;
}

export function isVisible(element: HTMLElement): boolean {
  if (!element.isConnected || element.closest(selectors.excluded)) return false;
  const style = getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility === 'visible' &&
    element.getClientRects().length > 0
  );
}

function locate(document: Document): Omit<EditorTarget, 'editorId'> | null {
  const conversation = document.querySelector<HTMLElement>(selectors.conversation);
  if (!conversation || !isVisible(conversation)) return null;
  // Buscar apenas na área de composição, nunca nos campos da barra lateral/histórico.
  const composers = conversation.querySelectorAll<HTMLElement>(selectors.composer);
  const candidates: Omit<EditorTarget, 'editorId'>[] = [];
  for (const composer of composers) {
    if (!isVisible(composer)) continue;
    for (const editor of composer.querySelectorAll<HTMLElement>(selectors.editor)) {
      if (
        editor.getAttribute('aria-disabled') === 'true' ||
        editor.getAttribute('aria-readonly') === 'true' ||
        !isVisible(editor)
      )
        continue;
      candidates.push({
        conversation,
        composer,
        editor,
        header: conversation.querySelector<HTMLElement>(selectors.header),
      });
    }
  }
  // Ambiguidade falha de forma conservadora; não escolher um campo por ordem no DOM.
  return candidates.length === 1 ? (candidates[0] ?? null) : null;
}

export class WhatsAppAdapter {
  private target: EditorTarget | null = null;
  private revision = 0;
  private observer: MutationObserver | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;
  private frame: number | undefined;
  private active = false;
  private readonly listeners = new Set<(target: EditorTarget | null) => void>();

  constructor(private readonly document: Document) {}

  subscribe(listener: (target: EditorTarget | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.target);
    return () => {
      this.listeners.delete(listener);
    };
  }

  start(): void {
    if (this.active) return;
    this.active = true;
    this.observer = new MutationObserver(this.onMutations);
    this.refresh(true);
    // Descoberta de contêineres inseridos sob wrappers novos sem observar body/subárvores
    // inteiras. Também detecta mudanças de visibilidade causadas por CSS externo.
    this.timer = setInterval(() => {
      this.refresh();
    }, 1_000);
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;
    if (this.timer !== undefined) clearInterval(this.timer);
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    this.observer?.disconnect();
    this.observer = undefined;
    this.unbindEditor();
    this.target = null;
    this.revision++;
    this.notify();
  }

  /** Chamado somente pelo controle acionado pelo usuário; não usar em observadores. */
  capture(): DraftSnapshot | null {
    this.flush();
    if (!this.active || !this.target) return null;
    return Object.freeze({
      editorId: this.target.editorId,
      snapshotId: crypto.randomUUID(),
      revision: this.revision,
      text: this.target.editor.innerText,
    });
  }

  isCurrent(snapshot: DraftSnapshot): boolean {
    this.flush();
    return (
      this.active &&
      this.target !== null &&
      snapshot.editorId === this.target.editorId &&
      snapshot.revision === this.revision
    );
  }

  private flush(): void {
    const records = this.observer?.takeRecords() ?? [];
    if (records.length) this.onMutations(records);
    if (this.active) this.refresh();
  }

  private readonly invalidate = (): void => {
    this.revision++;
    this.schedule();
  };

  private readonly onMutations = (records: MutationRecord[]): void => {
    // O host é filho do body e seu Shadow DOM não é observado. Ignorar sua inserção/remoção.
    const relevant = records.some(
      (record) =>
        !(
          record.type === 'childList' &&
          [...record.addedNodes, ...record.removedNodes].every(
            (node) => node instanceof HTMLElement && node.hasAttribute('data-local-writing-host'),
          )
        ),
    );
    if (relevant) this.invalidate();
  };

  private schedule(): void {
    if (!this.active || this.frame !== undefined) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = undefined;
      this.refresh();
      this.notify();
    });
  }

  private refresh(force = false): void {
    const next = locate(this.document);
    if (
      !force &&
      next?.editor === this.target?.editor &&
      next?.composer === this.target?.composer &&
      next?.conversation === this.target?.conversation &&
      next?.header === this.target?.header
    )
      return;
    this.unbindEditor();
    this.revision++;
    this.target = next ? { ...next, editorId: crypto.randomUUID() } : null;
    this.target?.editor.addEventListener('beforeinput', this.invalidate);
    this.target?.editor.addEventListener('input', this.invalidate);
    this.target?.editor.addEventListener('compositionstart', this.invalidate);
    this.observe();
    this.notify();
  }

  private unbindEditor(): void {
    this.target?.editor.removeEventListener('beforeinput', this.invalidate);
    this.target?.editor.removeEventListener('input', this.invalidate);
    this.target?.editor.removeEventListener('compositionstart', this.invalidate);
  }

  private observe(): void {
    const observer = this.observer;
    if (!observer) return;
    observer.disconnect();
    observer.observe(this.document.body, { childList: true });
    if (!this.target) return;
    const { conversation, composer, header } = this.target;
    // Só filhos diretos dos ancestrais; mensagens recebidas não disparam observação profunda.
    for (
      let ancestor: HTMLElement | null = conversation;
      ancestor && ancestor !== this.document.body;
      ancestor = ancestor.parentElement
    ) {
      observer.observe(ancestor, {
        childList: true,
        attributes: true,
        attributeFilter: ['hidden', 'inert', 'aria-hidden', 'class', 'style'],
      });
    }
    observer.observe(composer, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        'contenteditable',
        'role',
        'aria-disabled',
        'aria-readonly',
        'aria-hidden',
        'hidden',
        'inert',
        'class',
        'style',
      ],
    });
    // Invalidação conservadora se o WhatsApp reutiliza o mesmo editor ao trocar de conversa.
    // Não solicitar oldValue, ler registros de texto/atributos ou guardar identidade do contato.
    if (header)
      observer.observe(header, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
      });
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.target);
  }
}
