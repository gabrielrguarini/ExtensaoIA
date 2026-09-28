import type { DraftSnapshot, WhatsAppAdapter } from '../../integration/whatsapp/adapter';
import { MAX_TEXT_LENGTH } from '../../shared/protocol';
import { generatePreview, SIMULATION_PREFIX } from './preview-client';
import type { PreviewGenerator } from './preview-client';

export type PreviewState =
  | { kind: 'closed' | 'menu' | 'loading' }
  | { kind: 'notice'; message: string }
  | {
      kind: 'preview';
      text: string;
      canReplace: boolean;
      busy: 'copy' | 'replace' | null;
      message: string;
    };

export class PreviewSession {
  private state: PreviewState = { kind: 'closed' };
  private snapshot: DraftSnapshot | null = null;
  private cancelGeneration: (() => void) | undefined;
  private replacement: AbortController | undefined;
  private sequence = 0;
  private readonly listeners = new Set<() => void>();
  constructor(
    private readonly adapter: WhatsAppAdapter,
    private readonly generate: PreviewGenerator = generatePreview,
    private readonly writeClipboard: (text: string) => Promise<void> = (text) =>
      navigator.clipboard.writeText(text),
  ) {}

  getState = (): PreviewState => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private set(state: PreviewState): void {
    this.state = state;
    for (const listener of this.listeners) listener();
  }
  close(): void {
    this.sequence++;
    this.replacement?.abort();
    this.replacement = undefined;
    this.cancelGeneration?.();
    this.cancelGeneration = undefined;
    this.snapshot = null;
    this.set({ kind: 'closed' });
  }
  open(): void {
    this.close();
    this.set({ kind: 'menu' });
  }
  validate(): void {
    if (this.state.kind === 'preview' && this.state.busy === 'replace') return;
    if (this.snapshot && !this.adapter.isCurrent(this.snapshot)) {
      this.close();
      this.set({
        kind: 'notice',
        message: 'O rascunho ou a conversa mudou. Feche e crie uma nova prévia.',
      });
    }
  }
  start(): void {
    if (this.state.kind !== 'menu') return;
    const snapshot = this.adapter.capture();
    if (!snapshot || !snapshot.text.replace(/[\s\u200b\u200e\u200f]/g, '')) {
      this.set({ kind: 'notice', message: 'Escreva uma mensagem antes de criar a prévia.' });
      return;
    }
    if (snapshot.text.length + SIMULATION_PREFIX.length > MAX_TEXT_LENGTH) {
      this.set({
        kind: 'notice',
        message: 'Mensagem muito longa para esta simulação. Reduza o rascunho.',
      });
      return;
    }
    this.snapshot = snapshot;
    const sequence = ++this.sequence;
    this.set({ kind: 'loading' });
    try {
      this.cancelGeneration = this.generate(snapshot, (outcome) => {
        if (sequence !== this.sequence) return;
        this.validate();
        if (sequence !== this.sequence) return;
        if (!outcome.ok || !outcome.text.trim()) {
          this.snapshot = null;
          this.set({
            kind: 'notice',
            message: outcome.ok ? 'A simulação retornou uma prévia vazia.' : outcome.message,
          });
          return;
        }
        this.set({
          kind: 'preview',
          text: outcome.text,
          canReplace: this.adapter.canReplace(snapshot, outcome.text),
          busy: null,
          message: '',
        });
      });
    } catch {
      this.snapshot = null;
      this.set({
        kind: 'notice',
        message: 'Não foi possível conectar à extensão. Recarregue a aba.',
      });
    }
  }

  async copy(): Promise<void> {
    const state = this.state;
    const snapshot = this.snapshot;
    if (state.kind !== 'preview' || state.busy || !snapshot) return;
    if (!this.adapter.matches(snapshot)) {
      this.validate();
      return;
    }
    const sequence = this.sequence;
    this.set({ ...state, busy: 'copy', message: '' });
    try {
      await this.writeClipboard(state.text);
      if (sequence === this.sequence)
        this.set({ ...state, busy: null, message: 'Sugestão copiada.' });
    } catch {
      if (sequence === this.sequence)
        this.set({
          ...state,
          busy: null,
          message:
            'Não foi possível copiar. Verifique a permissão da área de transferência e tente novamente.',
        });
    }
  }

  async replace(): Promise<boolean> {
    const state = this.state;
    const snapshot = this.snapshot;
    if (state.kind !== 'preview' || state.busy || !state.canReplace || !snapshot) return false;
    const sequence = this.sequence;
    this.set({ ...state, busy: 'replace', message: '' });
    this.replacement = new AbortController();
    let result;
    try {
      result = await this.adapter.replace(snapshot, state.text, this.replacement.signal);
    } catch {
      result = 'failed-review' as const;
    }
    if (sequence !== this.sequence) return false;
    if (result === 'applied') {
      this.close();
      return true;
    }
    if (result === 'copy-only') {
      this.set({
        ...state,
        canReplace: false,
        busy: null,
        message: 'Este editor permite apenas copiar a sugestão.',
      });
      return false;
    }
    this.snapshot = null;
    this.set({
      kind: 'notice',
      message:
        result === 'stale'
          ? 'O rascunho ou a conversa mudou. Crie uma nova prévia.'
          : result === 'failed-preserved'
            ? 'A substituição não foi aceita. O rascunho original foi preservado.'
            : 'Não foi possível confirmar a substituição. Confira o rascunho e use Ctrl+Z para desfazer a última edição, se necessário.',
    });
    return false;
  }
}
