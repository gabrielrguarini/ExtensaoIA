import { readDraft } from './draft';
import { editDraft } from './native-edit';
import { StreamingDraft } from './streaming-draft';
import type { StreamWriteResult } from './streaming-draft';

// Todos os seletores do site ficam aqui. Nenhum texto de contato ou histórico é lido.
const selectors = {
  conversation: '#main',
  composer: ':scope > footer',
  header: ':scope > header',
  title: '[data-testid="conversation-info-header-chat-title"]',
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
  readonly title: HTMLElement | null;
  readonly editorId: string;
}

export interface DraftSnapshot {
  readonly editorId: string;
  readonly snapshotId: string;
  readonly revision: number;
  readonly text: string;
  readonly replacementAllowed: boolean;
}

export type ReplacementResult =
  'applied' | 'stale' | 'copy-only' | 'failed-preserved' | 'failed-review';

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
        title: conversation.querySelector<HTMLElement>(selectors.title),
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
  private contextRevision = 0;
  private composing = false;
  private readonly issued = new WeakMap<
    DraftSnapshot,
    { url: string; editor: HTMLElement; contextRevision: number }
  >();
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
    const snapshot = Object.freeze({
      editorId: this.target.editorId,
      snapshotId: crypto.randomUUID(),
      revision: this.revision,
      ...readDraft(this.target.editor),
    });
    this.issued.set(snapshot, {
      url: this.document.URL,
      editor: this.target.editor,
      contextRevision: this.contextRevision,
    });
    return snapshot;
  }

  isCurrent(snapshot: DraftSnapshot): boolean {
    this.flush();
    return (
      this.active &&
      this.issued.get(snapshot)?.url === this.document.URL &&
      this.target !== null &&
      snapshot.editorId === this.target.editorId &&
      snapshot.revision === this.revision
    );
  }

  /** O modo direto autoriza digitação concorrente, mas nunca outro contexto. */
  isContextCurrent(snapshot: DraftSnapshot): boolean {
    this.flush();
    const issued = this.issued.get(snapshot);
    return (
      this.active &&
      !!issued &&
      issued.url === this.document.URL &&
      issued.contextRevision === this.contextRevision &&
      issued.editor === this.target?.editor &&
      snapshot.editorId === this.target.editorId
    );
  }

  beginStream(
    snapshot: DraftSnapshot,
    failed: (reason: StreamWriteResult) => void,
  ): StreamingDraft {
    const editor = this.issued.get(snapshot)?.editor;
    const current = () => !!editor && this.isContextCurrent(snapshot);
    return new StreamingDraft(
      {
        current,
        read: () => (editor ? readDraft(editor).text : ''),
        write: (text, append, expected, active) =>
          editor
            ? editDraft(editor, text, append, expected, current, () => this.composing, active)
            : Promise.resolve('stale'),
        restore: async (expected, original, active) => {
          if (!editor || !active() || !current() || readDraft(editor).text !== expected)
            return false;
          return (
            (await editDraft(
              editor,
              original,
              false,
              expected,
              current,
              () => this.composing,
              active,
            )) === 'applied'
          );
        },
      },
      snapshot.text,
      failed,
    );
  }

  /** Releitura na aplicação autorizada pelo clique em IA ou em Copiar/Substituir. */
  matches(snapshot: DraftSnapshot): boolean {
    if (!this.isCurrent(snapshot) || !this.target) return false;
    if (readDraft(this.target.editor).text === snapshot.text) return true;
    this.invalidate();
    return false;
  }

  canReplace(snapshot: DraftSnapshot, suggestion = snapshot.text): boolean {
    try {
      return (
        snapshot.replacementAllowed &&
        typeof suggestion === 'string' &&
        typeof this.document.execCommand === 'function' &&
        typeof this.document.queryCommandSupported === 'function' &&
        this.document.queryCommandSupported('insertText') &&
        this.document.queryCommandSupported('selectAll')
      );
    } catch {
      return false;
    }
  }

  focusEditor(editorId: string): void {
    this.flush();
    if (this.target?.editorId === editorId) this.target.editor.focus({ preventScroll: true });
  }

  async replace(
    snapshot: DraftSnapshot,
    text: string,
    signal?: AbortSignal,
  ): Promise<ReplacementResult> {
    if (signal?.aborted) return 'stale';
    if (!this.matches(snapshot) || !this.target) return 'stale';
    if (
      !this.canReplace(snapshot, text) ||
      !readDraft(this.target.editor).replacementAllowed ||
      !text.trim()
    )
      return 'copy-only';
    const editor = this.target.editor;
    if (/[\r\n]/u.test(text) || /[\r\n]/u.test(snapshot.text)) {
      const result = await editDraft(
        editor,
        text.replace(/\r\n?/gu, '\n'),
        false,
        snapshot.text,
        () => !signal?.aborted && this.isContextCurrent(snapshot),
        () => this.composing,
        () => !signal?.aborted && this.isCurrent(snapshot),
      );
      if (result === 'applied') return 'applied';
      if (result === 'stale' || result === 'retry') return 'stale';
      if (result === 'unsupported') return 'copy-only';
      return readDraft(editor).text === snapshot.text ? 'failed-preserved' : 'failed-review';
    }
    editor.focus({ preventScroll: true });
    // O foco também restaura a seleção anterior no editor controlado; esperar essa
    // restauração antes de selecionar evita que ela apague nossa seleção completa.
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
    if (signal?.aborted || !this.matches(snapshot) || this.document.activeElement !== editor)
      return 'stale';
    const selection = this.document.getSelection();
    if (!selection || !this.document.queryCommandEnabled('insertText')) return 'copy-only';
    const range = this.document.createRange();
    range.selectNodeContents(editor);
    selection.removeAllRanges();
    selection.addRange(range);
    // A seleção nativa também atualiza editores controlados que restauram uma
    // seleção criada apenas por Range. O foco e os limites são conferidos abaixo.
    try {
      if (!this.document.execCommand('selectAll')) return 'copy-only';
    } catch {
      return 'copy-only';
    }
    // Editores controlados (incluindo o WhatsApp) reconciliam a seleção no evento
    // selectionchange nativo. Inserir no mesmo turno pode usar a seleção anterior.
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
    if (
      signal?.aborted ||
      !this.matches(snapshot) ||
      this.document.activeElement !== editor ||
      selection.rangeCount !== 1 ||
      !editor.contains(selection.getRangeAt(0).startContainer) ||
      !editor.contains(selection.getRangeAt(0).endContainer) ||
      selection.toString() !== editor.innerText
    )
      return 'stale';
    if (text === snapshot.text) return 'applied';
    const contextRevision = this.contextRevision;
    let accepted = false;
    try {
      // Única API de escrita: mantém a transação nativa de edição/desfazer.
      accepted = this.document.execCommand('insertText', false, text);
    } catch {
      /* Verificar o campo antes de decidir se uma recuperação é necessária. */
    }
    this.flush();
    if (this.target?.editor !== editor || contextRevision !== this.contextRevision)
      return 'failed-review';
    const actual = readDraft(editor).text;
    if (!accepted || actual !== text) {
      if (actual === snapshot.text) return 'failed-preserved';
      // Recuperação síncrona da nossa própria transação, sem segunda inserção nem innerHTML.
      try {
        this.document.execCommand('undo');
      } catch {
        /* Relatar falha sem prometer restauração. */
      }
      this.invalidate();
      return readDraft(editor).text === snapshot.text ? 'failed-preserved' : 'failed-review';
    }
    this.invalidate();
    // Deixar o editor controlado pela página reconciliar o evento nativo de input.
    // Nunca fazer rollback assíncrono: poderia desfazer uma edição posterior do usuário.
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50);
    });
    this.flush();
    if (this.target?.editor !== editor || contextRevision !== this.contextRevision)
      return 'failed-review';
    const settled = readDraft(editor).text;
    return settled === text
      ? 'applied'
      : settled === snapshot.text
        ? 'failed-preserved'
        : 'failed-review';
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
    const header = this.target?.header;
    const title = this.target?.title;
    const composer = this.target?.composer;
    const editor = this.target?.editor;
    let relevant = false;
    let contextChanged = false;
    for (const record of records) {
      // O host é filho do body e seu Shadow DOM não é observado.
      if (
        record.type === 'childList' &&
        [...record.addedNodes, ...record.removedNodes].every(
          (node) => node instanceof HTMLElement && node.hasAttribute('data-local-writing-host'),
        )
      )
        continue;
      if (record.type === 'childList' && record.target === composer) {
        const editorAffected = [...record.addedNodes, ...record.removedNodes].some(
          (node) =>
            node === editor || (node instanceof Element && !!editor && node.contains(editor)),
        );
        if (!editorAffected) {
          this.schedule();
          continue;
        }
      }
      if (header?.contains(record.target)) {
        // O status do grupo muda sozinho. Só o título ou sua substituição sinaliza troca.
        if (
          title &&
          !title.contains(record.target) &&
          header.querySelector(selectors.title) === title
        )
          continue;
        contextChanged = true;
      }
      relevant = true;
    }
    if (!relevant) return;
    if (contextChanged) this.contextRevision++;
    this.invalidate();
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
      next?.header === this.target?.header &&
      next?.title === this.target?.title
    )
      return;
    this.unbindEditor();
    this.revision++;
    this.target = next ? { ...next, editorId: crypto.randomUUID() } : null;
    this.target?.editor.addEventListener('beforeinput', this.invalidate);
    this.target?.editor.addEventListener('compositionstart', this.startComposition);
    this.target?.editor.addEventListener('compositionend', this.endComposition);
    this.target?.editor.addEventListener('input', this.invalidate);
    this.target?.editor.addEventListener('compositionstart', this.invalidate);
    this.observe();
    this.notify();
  }

  private unbindEditor(): void {
    this.target?.editor.removeEventListener('beforeinput', this.invalidate);
    this.target?.editor.removeEventListener('input', this.invalidate);
    this.target?.editor.removeEventListener('compositionstart', this.invalidate);
    this.target?.editor.removeEventListener('compositionstart', this.startComposition);
    this.target?.editor.removeEventListener('compositionend', this.endComposition);
    this.composing = false;
  }

  private readonly startComposition = (): void => {
    this.composing = true;
  };
  private readonly endComposition = (): void => {
    this.composing = false;
  };

  private observe(): void {
    const observer = this.observer;
    if (!observer) return;
    observer.disconnect();
    observer.observe(this.document.body, { childList: true });
    if (!this.target) return;
    const { conversation, composer, editor, header } = this.target;
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
    // Controles do footer mudam durante o uso normal do WhatsApp; apenas o campo
    // editável e seus descendentes representam alteração do rascunho.
    observer.observe(editor, {
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
    observer.observe(composer, { childList: true });
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
