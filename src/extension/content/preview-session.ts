import type { EngineIdentity, SuggestionResult } from '../../shared/suggestion';
import type { DraftSnapshot, WhatsAppAdapter } from '../../integration/whatsapp/adapter';
import type { StreamingDraft } from '../../integration/whatsapp/streaming-draft';
import { MAX_TEXT_LENGTH } from '../../shared/protocol';
import { generatePreview, SIMULATION_PREFIX } from './preview-client';
import type { PreviewGenerator } from './preview-client';
import { runModelProof } from './model-proof-client';
import type { ProofGenerator, ProofProgress } from './model-proof-client';
import { generateAction } from './action-client';
import type { ActionGenerator } from './action-client';
import { writingAction } from '../../shared/actions';
import type { WritingAction } from '../../shared/actions';
import { preferenceStore } from './preferences-client';
import type { PreferenceStore } from './preferences-client';
import { DEFAULT_PREFERENCES } from '../../shared/preferences';
import type { PreferencePatch, WritingPreferences } from '../../shared/preferences';
import type { ModelProfile } from '../ai/model-catalog';
import { smallerProfile } from '../ai/model-catalog';
import { probeHardware } from './model-hardware';
import type { HardwareStatus } from './model-hardware';
import { removeSelectedCache } from './cache-client';
import { manageGemma } from '../settings/gemma-client';
import type { LocalVariant, LocalModel } from '../../shared/local-model';

export type PreviewState =
  | { kind: 'closed' | 'loading' | 'preparing-action' | 'applying' }
  | {
      kind: 'menu';
      profile: ModelProfile;
      preferences: WritingPreferences;
      hardware: HardwareStatus;
      preferenceStatus: 'loading' | 'ready' | 'saving' | 'error';
    }
  | {
      kind: 'download-confirm';
      task: WritingAction | 'proof';
      profile: ModelProfile;
      variant: LocalVariant;
    }
  | { kind: 'notice'; message: string }
  | { kind: 'recovery'; message: string; busy: boolean }
  | { kind: 'action-loading'; action: WritingAction; progress: ProofProgress; partial: string }
  | { kind: 'model-loading'; progress: ProofProgress }
  | { kind: 'model-result'; text: string; variant: LocalVariant }
  | {
      kind: 'preview';
      source: 'simulation' | 'action';
      action: WritingAction | null;
      text: string;
      canReplace: boolean;
      busy: 'copy' | 'replace' | null;
      engine?: EngineIdentity | undefined;
      status?: SuggestionResult['status'] | undefined;
      message: string;
    };

export class PreviewSession {
  private state: PreviewState = { kind: 'closed' };
  private snapshot: DraftSnapshot | null = null;
  private cancelGeneration: (() => void) | undefined;
  private replacement: AbortController | undefined;
  private stream: StreamingDraft | undefined;
  private recovery: StreamingDraft | undefined;
  private restoring: StreamingDraft | undefined;
  private recoveryTask: Promise<void> | undefined;
  private sequence = 0;
  private preferenceRevision = 0;
  private unsubscribePreferences: (() => void) | undefined;
  private profile: ModelProfile = 'economico';
  private engine: WritingPreferences['engine'] = DEFAULT_PREFERENCES.engine;
  private localModel: LocalModel = DEFAULT_PREFERENCES.localModel;
  private latestPreferences: WritingPreferences | undefined;
  private interaction: WritingPreferences['interaction'] = DEFAULT_PREFERENCES.interaction;
  private noticeTimer: ReturnType<typeof setTimeout> | undefined;
  private hardware: HardwareStatus = { state: 'checking' };
  private readonly listeners = new Set<() => void>();
  constructor(
    private readonly adapter: WhatsAppAdapter,
    private readonly generate: PreviewGenerator = generatePreview,
    private readonly writeClipboard: (text: string) => Promise<void> = (text) =>
      navigator.clipboard.writeText(text),
    private readonly prove: ProofGenerator = runModelProof,
    private readonly write: ActionGenerator = generateAction,
    private readonly preferences: PreferenceStore = preferenceStore,
  ) {}

  getState = (): PreviewState => this.state;
  isDirect = (): boolean => this.interaction === 'direct';
  isRunning = (): boolean =>
    ['preparing-action', 'action-loading', 'applying'].includes(this.state.kind);
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private set(state: PreviewState): void {
    clearTimeout(this.noticeTimer);
    this.state = state;
    if (this.isDirect() && state.kind === 'notice')
      this.noticeTimer = setTimeout(() => this.close(), 6_000);
    for (const listener of this.listeners) listener();
  }
  close(restore = true): void {
    if (!restore) this.restoring?.release();
    clearTimeout(this.noticeTimer);
    this.sequence++;
    this.unsubscribePreferences?.();
    this.unsubscribePreferences = undefined;
    this.replacement?.abort();
    this.replacement = undefined;
    this.cancelGeneration?.();
    this.cancelGeneration = undefined;
    this.snapshot = null;
    const stream = this.stream;
    this.stream = undefined;
    this.recovery?.release();
    this.recovery = undefined;
    this.set({ kind: 'closed' });
    if (stream) {
      if (!restore) stream.release();
      else {
        const sequence = this.sequence;
        this.restoring = stream;
        this.recoveryTask = stream
          .cancel()
          .then((result) => {
            if (sequence !== this.sequence) return;
            if (result === 'edited' || result === 'failed') {
              this.recovery = stream;
              this.set({
                kind: 'recovery',
                busy: false,
                message:
                  result === 'edited'
                    ? 'A IA foi interrompida. Suas edições foram mantidas.'
                    : 'Não foi possível recuperar o rascunho automaticamente.',
              });
            }
          })
          .finally(() => {
            if (this.restoring === stream) this.restoring = undefined;
            this.recoveryTask = undefined;
          });
      }
    }
  }
  /** Fluxo do produto: um gesto, uma ação salva, sem menu de configurações. */
  executeConfigured(): void {
    if (this.stream || this.recoveryTask) {
      this.close();
      const sequence = this.sequence;
      void this.recoveryTask?.then(() => {
        if (this.sequence === sequence) this.executeConfigured();
      });
      return;
    }
    this.interaction = 'direct';
    this.close();
    const snapshot = this.adapter.capture();
    if (!snapshot || !snapshot.text.replace(/[\s\u200b\u200e\u200f]/g, '')) {
      this.set({ kind: 'notice', message: 'Escreva uma mensagem antes de usar a IA.' });
      return;
    }
    if (snapshot.text.length > MAX_TEXT_LENGTH) {
      this.set({ kind: 'notice', message: 'Mensagem muito longa. Reduza o rascunho.' });
      return;
    }
    this.snapshot = snapshot;
    this.latestPreferences = undefined;
    const sequence = this.sequence;
    this.set({ kind: 'preparing-action' });
    this.unsubscribePreferences = this.preferences.subscribe?.((value) =>
      this.preferencesChanged(value),
    );
    void this.preferences.read().then(
      (saved) => {
        if (sequence !== this.sequence) return;
        const value = this.latestPreferences ?? saved;
        this.latestPreferences = value;
        this.profile = value.profile;
        this.engine = value.engine;
        this.localModel = value.localModel;
        this.interaction = value.interaction;
        this.validate();
        if (sequence !== this.sequence) return;
        this.runAction(value.defaultAction, snapshot, false);
      },
      () => {
        if (sequence !== this.sequence) return;
        this.close();
        this.set({
          kind: 'notice',
          message: 'Não foi possível ler as configurações. Clique em IA para tentar novamente.',
        });
      },
    );
  }

  // Entrada histórica usada pelos testes das etapas anteriores; não exposta na interface.
  open(): void {
    this.interaction = 'preview';
    this.close();
    const sequence = this.sequence;
    this.set({
      kind: 'menu',
      profile: this.profile,
      preferences: { ...DEFAULT_PREFERENCES, profile: this.profile },
      hardware: this.hardware,
      preferenceStatus: 'loading',
    });
    this.unsubscribePreferences = this.preferences.subscribe?.((value) =>
      this.preferencesChanged(value),
    );
    const preferenceRevision = this.preferenceRevision;
    void probeHardware().then((hardware) => {
      if (this.sequence !== sequence) return;
      this.hardware = hardware;
      if (this.state.kind === 'menu') this.set({ ...this.state, hardware });
    });
    void this.preferences.read().then(
      (value) => {
        if (
          this.sequence === sequence &&
          this.state.kind === 'menu' &&
          this.preferenceRevision === preferenceRevision
        ) {
          this.profile = value.profile;
          this.engine = value.engine;
          this.localModel = value.localModel;

          this.set({
            ...this.state,
            profile: value.profile,
            preferences: value,
            preferenceStatus: 'ready',
          });
        }
      },
      () => {
        if (this.sequence === sequence && this.state.kind === 'menu')
          this.set({ ...this.state, preferenceStatus: 'error' });
      },
    );
  }
  private preferencesChanged(value: WritingPreferences): void {
    this.preferenceRevision++;
    const changedProfile =
      this.profile !== value.profile ||
      this.engine !== value.engine ||
      this.localModel !== value.localModel ||
      (this.latestPreferences !== undefined &&
        (this.latestPreferences.defaultAction !== value.defaultAction ||
          this.latestPreferences.interaction !== value.interaction ||
          this.latestPreferences.preserveSlang !== value.preserveSlang ||
          this.latestPreferences.addEmojis !== value.addEmojis));
    this.profile = value.profile;
    this.engine = value.engine;
    this.localModel = value.localModel;
    this.latestPreferences = value;
    if (this.state.kind === 'menu') {
      this.set({
        ...this.state,
        profile: value.profile,
        preferences: value,
        preferenceStatus: this.state.preferenceStatus === 'saving' ? 'saving' : 'ready',
      });
    } else if (
      changedProfile &&
      ['download-confirm', 'action-loading', 'model-loading', 'applying'].includes(this.state.kind)
    ) {
      this.close();
      this.set({
        kind: 'notice',
        message:
          'As configurações de escrita mudaram. O pedido foi cancelado. Clique em IA para continuar.',
      });
    }
  }
  setProfile(profile: ModelProfile): void {
    if (
      this.state.kind !== 'menu' ||
      this.state.preferenceStatus !== 'ready' ||
      profile === this.profile
    )
      return;
    const sequence = this.sequence;
    const preferenceRevision = this.preferenceRevision;
    const previous = this.profile;
    this.set({ ...this.state, preferenceStatus: 'saving' });
    void this.preferences.setProfile(profile).then(
      (saved) => {
        if (this.sequence !== sequence || this.state.kind !== 'menu') return;
        if (preferenceRevision === this.preferenceRevision) this.profile = saved.profile;
        this.set({
          ...this.state,
          profile: this.profile,
          preferences:
            preferenceRevision === this.preferenceRevision ? saved : this.state.preferences,
          preferenceStatus: 'ready',
        });
      },
      () => {
        if (this.sequence === sequence && this.state.kind === 'menu')
          this.set({ ...this.state, profile: previous, preferenceStatus: 'error' });
      },
    );
  }
  removeCache(): void {
    if (
      this.state.kind !== 'menu' ||
      this.state.preferenceStatus !== 'ready' ||
      this.hardware.state !== 'available'
    )
      return;
    const sequence = this.sequence;
    const profile = this.profile;
    const variant = this.hardware.shaderF16 ? 'q4f16_1' : 'q4f32_1';
    this.set({ ...this.state, preferenceStatus: 'saving' });
    const remove =
      this.localModel === 'gemma'
        ? manageGemma({
            target: 'gemma-cache',
            type: 'remove',
            variant: this.hardware.shaderF16 ? 'q4f16' : 'q4',
          })
        : removeSelectedCache(profile, variant);
    void remove.then(
      () => {
        if (this.sequence === sequence)
          this.set({
            kind: 'notice',
            message:
              'Artefatos da variante selecionada removidos. Preferências preservadas. O próximo uso exigirá confirmação de download.',
          });
      },
      () => {
        if (this.sequence === sequence)
          this.set({
            kind: 'notice',
            message: 'Não foi possível confirmar a remoção. Abra o menu e tente novamente.',
          });
      },
    );
  }
  updatePreferences(patch: PreferencePatch): void {
    if (patch.profile) {
      this.setProfile(patch.profile);
      return;
    }
    if (
      this.state.kind !== 'menu' ||
      this.state.preferenceStatus !== 'ready' ||
      !this.preferences.update
    )
      return;
    const sequence = this.sequence;
    const preferenceRevision = this.preferenceRevision;
    this.set({ ...this.state, preferenceStatus: 'saving' });
    void this.preferences.update(patch).then(
      (saved) => {
        if (sequence === this.sequence && this.state.kind === 'menu') {
          if (preferenceRevision === this.preferenceRevision) {
            this.engine = saved.engine;
            this.localModel = saved.localModel;
          }
          this.set({
            ...this.state,
            preferences:
              preferenceRevision === this.preferenceRevision ? saved : this.state.preferences,
            preferenceStatus: 'ready',
          });
        }
      },
      () => {
        if (sequence === this.sequence && this.state.kind === 'menu')
          this.set({ ...this.state, preferenceStatus: 'error' });
      },
    );
  }
  validate(): void {
    if (this.recovery && !this.recovery.isCurrent()) {
      this.close(false);
      return;
    }
    // A escrita nativa gera nossas próprias mutações; o adaptador valida cada await.
    if (
      this.state.kind === 'applying' ||
      (this.state.kind === 'preview' && this.state.busy === 'replace')
    )
      return;
    const current =
      this.snapshot &&
      (this.isDirect()
        ? this.adapter.isContextCurrent(this.snapshot)
        : this.adapter.isCurrent(this.snapshot));
    if (this.snapshot && !current) {
      this.close();
      this.set({
        kind: 'notice',
        message: 'O rascunho ou a conversa mudou. Clique em IA novamente.',
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
          source: 'simulation',
          action: null,
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

  startAction(action: WritingAction): void {
    if (this.state.kind !== 'menu') return;
    const snapshot = this.adapter.capture();
    if (!snapshot || !snapshot.text.replace(/[\s\u200b\u200e\u200f]/g, '')) {
      this.set({
        kind: 'notice',
        message:
          action === 'corrigir'
            ? 'Escreva uma mensagem antes de corrigir.'
            : `Escreva uma mensagem antes de usar ${writingAction(action).label}.`,
      });
      return;
    }
    if (snapshot.text.length > MAX_TEXT_LENGTH) {
      this.set({ kind: 'notice', message: 'Mensagem muito longa. Reduza o rascunho.' });
      return;
    }
    this.runAction(action, snapshot, false);
  }

  private runAction(action: WritingAction, snapshot: DraftSnapshot, allowDownload: boolean): void {
    this.snapshot = snapshot;
    const sequence = ++this.sequence;
    if (this.isDirect())
      this.stream = this.adapter.beginStream(snapshot, (reason) => {
        if (sequence !== this.sequence) return;
        this.close();
        this.set({
          kind: 'notice',
          message:
            reason === 'unsupported'
              ? 'Este campo contém uma estrutura que não permite substituição direta.'
              : 'A escrita foi interrompida. Confira o rascunho.',
        });
      });
    this.set({
      kind: 'action-loading',
      action,
      progress: { phase: 'preparing', percent: 0, variant: null },
      partial: '',
    });
    try {
      this.cancelGeneration = this.write(
        action,
        snapshot,
        (progress) => {
          if (sequence !== this.sequence || this.state.kind !== 'action-loading') return;
          this.validate();
          if (sequence === this.sequence && this.state.kind === 'action-loading')
            this.set({ ...this.state, progress });
        },
        (partial) => {
          if (sequence !== this.sequence || this.state.kind !== 'action-loading') return;
          this.validate();
          if (sequence === this.sequence && this.state.kind === 'action-loading') {
            this.set({ ...this.state, partial });
            this.stream?.push(partial);
          }
        },
        (outcome) => {
          if (sequence !== this.sequence || this.state.kind !== 'action-loading') return;
          this.cancelGeneration = undefined;
          this.validate();
          if (sequence !== this.sequence) return;
          if (!outcome.ok && outcome.code === 'DOWNLOAD_REQUIRED') {
            if (this.isDirect()) {
              this.close();
              this.set({
                kind: 'notice',
                message: 'Prepare o modelo nas configurações da extensão antes de usar.',
              });
              return;
            }
            this.set({
              kind: 'download-confirm',
              task: action,
              profile: this.profile,
              variant: this.state.progress.variant ?? 'q4f16_1',
            });
            return;
          }
          if (!outcome.ok || !outcome.text.trim()) {
            this.close();
            this.set({
              kind: 'notice',
              message: outcome.ok
                ? 'A IA local retornou uma resposta vazia.'
                : this.resourceMessage(outcome.message, outcome.code),
            });
            return;
          }
          if (this.isDirect()) {
            void this.finishDirect(outcome.text);
            return;
          }
          this.set({
            kind: 'preview',
            source: 'action',
            action,
            text: outcome.text,
            engine: outcome.engine,
            status: outcome.status,
            canReplace: this.adapter.canReplace(snapshot, outcome.text),
            busy: null,
            message: '',
          });
        },
        allowDownload,
        this.profile,
      );
    } catch {
      this.close();
      this.set({ kind: 'notice', message: 'Não foi possível iniciar a IA. Tente novamente.' });
    }
  }

  private resourceMessage(message: string, code?: string): string {
    if (code !== 'INSUFFICIENT_RESOURCES') return message;
    if (this.localModel === 'gemma')
      return `${message} Escolha outro modelo nas configurações da extensão.`;
    const smaller = smallerProfile(this.profile);
    return `${message}${smaller ? ` Você pode escolher um modelo menor nas configurações da extensão.` : ''} A escolha atual foi mantida.`;
  }

  private async finishDirect(text: string): Promise<void> {
    const sequence = this.sequence;
    const stream = this.stream;
    if (!stream) return;
    this.set({ kind: 'applying' });
    const applied = await stream.finish(text);
    if (sequence !== this.sequence) return;
    if (applied) {
      this.stream = undefined;
      stream.release();
    }
    this.close();
  }

  async restoreOriginal(): Promise<void> {
    const recovery = this.recovery;
    if (!recovery || this.state.kind !== 'recovery' || this.state.busy) return;
    const sequence = this.sequence;
    this.set({ ...this.state, busy: true });
    const restored = await recovery.restoreOriginal();
    if (sequence !== this.sequence) return;
    if (restored) this.close(false);
    else
      this.set({
        kind: 'recovery',
        busy: false,
        message: 'Não foi possível restaurar. Confira o campo antes de tentar novamente.',
      });
  }

  confirmDownload(): void {
    if (this.state.kind !== 'download-confirm') return;
    const task = this.state.task;
    if (task === 'proof') this.runModelProof(true);
    else {
      const snapshot = this.snapshot;
      if (!snapshot || !this.adapter.isCurrent(snapshot)) {
        this.snapshot = null;
        this.set({ kind: 'notice', message: 'O rascunho mudou. Clique em IA novamente.' });
        return;
      }
      this.runAction(task, snapshot, true);
    }
  }

  startModelProof(): void {
    if (this.state.kind !== 'menu') return;
    this.runModelProof(false);
  }

  private runModelProof(allowDownload: boolean): void {
    const sequence = ++this.sequence;
    this.set({
      kind: 'model-loading',
      progress: { phase: 'preparing', percent: 0, variant: null },
    });
    try {
      this.cancelGeneration = this.prove(
        (progress) => {
          if (sequence === this.sequence) this.set({ kind: 'model-loading', progress });
        },
        (outcome) => {
          if (sequence !== this.sequence) return;
          this.cancelGeneration = undefined;
          if (outcome.ok)
            this.set({ kind: 'model-result', text: outcome.text, variant: outcome.variant });
          else if (outcome.code === 'DOWNLOAD_REQUIRED')
            this.set({
              kind: 'download-confirm',
              task: 'proof',
              profile: this.profile,
              variant:
                this.state.kind === 'model-loading'
                  ? (this.state.progress.variant ?? 'q4f16_1')
                  : 'q4f16_1',
            });
          else
            this.set({
              kind: 'notice',
              message: this.resourceMessage(outcome.message, outcome.code),
            });
        },
        allowDownload,
        this.profile,
      );
    } catch {
      this.set({ kind: 'notice', message: 'Não foi possível iniciar a IA. Tente novamente.' });
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
          ? 'O rascunho ou a conversa mudou. Clique em IA novamente.'
          : result === 'failed-preserved'
            ? 'A substituição não foi aceita. O rascunho original foi preservado.'
            : 'Não foi possível confirmar a substituição. Confira o rascunho e use Ctrl+Z para desfazer a última edição, se necessário.',
    });
    return false;
  }
}
