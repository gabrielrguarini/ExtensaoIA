export type StreamWriteResult = 'applied' | 'retry' | 'stale' | 'unsupported' | 'failed';
export interface StreamEditor {
  current(): boolean;
  read(): string;
  write(
    text: string,
    append: boolean,
    expected: string,
    active: () => boolean,
  ): Promise<StreamWriteResult>;
  restore(expected: string, original: string, active: () => boolean): Promise<boolean>;
}
export type StreamRecovery = 'untouched' | 'restored' | 'edited' | 'stale' | 'failed';

/** Uma geração cumulativa; só o sufixo novo é acrescentado após a primeira escrita. */
export class StreamingDraft {
  private prefix = '';
  private pending = '';
  private lastWritten: string | undefined;
  private edited = false;
  private stopped = false;
  private abandoned = false;
  private writing: Promise<void> | undefined;
  private failure: StreamWriteResult | undefined;
  private recovering: Promise<StreamRecovery> | undefined;

  constructor(
    private readonly editor: StreamEditor,
    private readonly original: string,
    private readonly onFailure: (reason: StreamWriteResult) => void,
  ) {}

  isCurrent(): boolean {
    return this.editor.current();
  }

  push(cumulative: string): void {
    if (this.stopped || this.failure) return;
    // O resultado final também usa trim; reter espaços finais evita retrações.
    const visible = cumulative
      .replace(/\r\n?/gu, '\n')
      .trim()
      .replace(/[\uD800-\uDBFF]$/u, '');
    if (!visible || visible === this.pending) return;
    if (!visible.startsWith(this.pending)) {
      this.fail('failed');
      return;
    }
    this.pending = visible;
    this.pump();
  }

  private pump(): void {
    if (this.writing || this.stopped || this.failure || this.prefix === this.pending) return;
    this.writing = this.drain().finally(() => {
      this.writing = undefined;
      this.pump();
    });
  }

  private async drain(): Promise<void> {
    while (!this.stopped && !this.failure && this.prefix !== this.pending) {
      if (!this.editor.current()) return this.fail('stale');
      const before = this.editor.read();
      if (this.lastWritten !== undefined && before !== this.lastWritten) this.edited = true;
      const next = this.pending;
      const append = this.lastWritten !== undefined;
      const delta = append ? next.slice(this.prefix.length) : next;
      let result: StreamWriteResult;
      try {
        result = await this.editor.write(delta, append, before, () => !this.stopped);
      } catch {
        result = 'failed';
      }
      if (result === 'retry' && !this.stopped) {
        await new Promise<void>((resolve) => setTimeout(resolve, 30));
        continue;
      }
      if (result !== 'applied') {
        if (!this.stopped) this.fail(result);
        return;
      }
      this.prefix = next;
      this.lastWritten = append ? before + delta : delta;
    }
  }

  private fail(reason: StreamWriteResult): void {
    this.failure = reason;
    this.onFailure(reason);
  }

  async finish(text: string): Promise<boolean> {
    this.push(text);
    while (this.writing) await this.writing;
    return !this.stopped && !this.failure && this.editor.current();
  }

  /** Nunca recuperar em outra conversa ou por cima de uma edição humana. */
  cancel(): Promise<StreamRecovery> {
    this.stopped = true;
    this.recovering ??= this.recover().catch(() => 'failed');
    return this.recovering;
  }

  private async recover(): Promise<StreamRecovery> {
    await this.writing;
    if (this.abandoned) return 'untouched';
    if (!this.editor.current()) return 'stale';
    if (this.lastWritten === undefined) return this.failure === 'failed' ? 'failed' : 'untouched';
    if (this.edited || this.editor.read() !== this.lastWritten) return 'edited';
    return (await this.editor.restore(this.lastWritten, this.original, () => !this.abandoned))
      ? 'restored'
      : 'failed';
  }

  async restoreOriginal(): Promise<boolean> {
    await this.cancel();
    if (this.abandoned || !this.editor.current()) return false;
    return this.editor.restore(this.editor.read(), this.original, () => !this.abandoned);
  }

  /** Envio manual, sucesso ou abandono: não escrever durante o descarte. */
  release(): void {
    this.stopped = true;
    this.abandoned = true;
  }
}
