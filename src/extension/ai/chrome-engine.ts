import type {
  AIEngine,
  GenerateOptions,
  InitializeOptions,
  NativeGenerationMetrics,
} from './ai-engine';
import type {
  AvailabilityQuery,
  EngineAvailability,
  EngineCapabilities,
  EngineIdentity,
} from '../../shared/suggestion';
import { WRITING_ACTIONS } from '../../shared/actions';
import { DEFAULT_WRITING_OPTIONS } from '../../shared/writing-options';
import {
  chromeAPIs,
  createNative,
  nativeAvailability,
  nativeConfig,
  nativeStream,
  NATIVE_INSTRUCTIONS,
} from './chrome-api';
import type { ChromeAPIs, NativeConfig, NativeSession } from './chrome-api';
import type { ErrorCode } from '../../shared/protocol';

export class ChromeEngineError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code);
  }
}
export function nativeError(error: unknown): ChromeEngineError {
  if (error instanceof ChromeEngineError) return error;
  if (error instanceof DOMException && error.name === 'QuotaExceededError')
    return new ChromeEngineError('NATIVE_QUOTA');
  if (error instanceof DOMException && error.name === 'NotSupportedError')
    return new ChromeEngineError('NATIVE_NOT_SUPPORTED');
  return new ChromeEngineError('UNAVAILABLE');
}
interface Slot {
  key: string;
  session: NativeSession;
}
const DEFAULT_QUERY: AvailabilityQuery = { action: 'corrigir', language: 'pt-BR' };

/** Documento offscreen. Downloads pertencem exclusivamente ao painel visível. */
export class ChromeEngine implements AIEngine {
  private readonly slots = new Map<NativeConfig['api'], Slot>();
  private query = DEFAULT_QUERY;
  private config = nativeConfig(DEFAULT_QUERY);
  private epoch = 0;
  private busy = false;
  private controller: AbortController | undefined;
  private idle: ReturnType<typeof setTimeout> | undefined;
  constructor(
    private readonly apis: ChromeAPIs = chromeAPIs(),
    private readonly idleMs = 5 * 60_000,
  ) {}
  identity(): EngineIdentity {
    return {
      id: 'chrome',
      model: null,
      runtime: `Chrome ${this.config.api}${this.query.chromePortuguesePrompt ? ' (pt-BR experimental)' : ''}`,
      execution: 'browser-managed',
    };
  }
  capabilities(): EngineCapabilities {
    // Idiomas são apurados por disponibilidade, nunca por uma lista presumida.
    const session = this.slots.get(this.config.api)?.session;
    return {
      actions: WRITING_ACTIONS.filter(
        ({ id }) => this.apis[nativeConfig({ ...this.query, action: id }).api],
      ).map(({ id }) => id),
      languages: this.isReady() ? [this.query.language] : [],
      streaming:
        this.config.api === 'prompt'
          ? typeof (session as LanguageModel | undefined)?.promptStreaming === 'function'
          : this.config.api === 'rewriter' &&
            typeof (session as Rewriter | undefined)?.rewriteStreaming === 'function',
      semanticReview: Boolean(this.apis.prompt),
      local: true,
    };
  }
  async availability(query: AvailabilityQuery): Promise<EngineAvailability> {
    const config = nativeConfig(query);
    if (!this.apis[config.api])
      return { state: 'unavailable', reason: 'api', nativeAvailability: 'unavailable' };
    try {
      const value = await nativeAvailability(config, this.apis);
      return {
        state:
          value === 'available'
            ? 'ready'
            : value === 'unavailable'
              ? 'unavailable'
              : 'requires-initialization',
        nativeAvailability: value,
      };
    } catch {
      return { state: 'unavailable', reason: 'probe' };
    }
  }
  isReady(): boolean {
    return this.slots.get(this.config.api)?.key === JSON.stringify(this.config);
  }
  async initialize(options: InitializeOptions = {}): Promise<void> {
    if (this.busy) throw new ChromeEngineError('BUSY');
    this.busy = true;
    clearTimeout(this.idle);
    const epoch = this.epoch;
    const creation = new AbortController();
    this.controller = creation;
    const cancelCreation = () => creation.abort(options.signal?.reason);
    options.signal?.addEventListener('abort', cancelCreation, { once: true });
    const config = nativeConfig(options.query ?? DEFAULT_QUERY);
    const key = JSON.stringify(config);
    let created: NativeSession | undefined;
    try {
      options.signal?.throwIfAborted();
      options.onProgress?.('preparing', 0);
      // Mesmas opções da criação; nenhuma tentativa de download no contexto sem gesto.
      if ((await nativeAvailability(config, this.apis)) !== 'available')
        throw new ChromeEngineError('NATIVE_NOT_SUPPORTED');
      options.signal?.throwIfAborted();
      if (epoch !== this.epoch) throw new DOMException('Sessão encerrada.', 'AbortError');
      const current = this.slots.get(config.api);
      if (current?.key !== key) {
        current?.session.destroy();
        this.slots.delete(config.api);
        options.onProgress?.('loading', 0);
        created = await createNative(config, { signal: creation.signal }, this.apis);
        options.signal?.throwIfAborted();
        if (epoch !== this.epoch) throw new DOMException('Sessão encerrada.', 'AbortError');
        const usable =
          config.api === 'proofreader'
            ? typeof (created as Proofreader).proofread === 'function'
            : config.api === 'rewriter'
              ? typeof (created as Rewriter).rewriteStreaming === 'function' ||
                typeof (created as Rewriter).rewrite === 'function'
              : typeof (created as LanguageModel).clone === 'function';
        if (!usable) throw new ChromeEngineError('NATIVE_NOT_SUPPORTED');
        this.slots.set(config.api, { key, session: created });
        created = undefined;
      }
      this.config = config;
      this.query = options.query ?? DEFAULT_QUERY;
      options.onProgress?.('ready', 100);
    } catch (error) {
      created?.destroy();
      throw nativeError(error);
    } finally {
      options.signal?.removeEventListener('abort', cancelCreation);
      this.controller = undefined;
      this.busy = false;
      this.armIdle();
    }
  }
  async *generate(text: string, options: GenerateOptions = {}): AsyncIterable<string> {
    if (this.busy) throw new ChromeEngineError('BUSY');
    const slot = this.slots.get(this.config.api);
    if (!slot || !this.isReady()) throw new ChromeEngineError('UNAVAILABLE');
    const task = options.task ?? this.query.action;
    if (task !== this.query.action || options.inputFormat === 'legacy-protected')
      throw new ChromeEngineError('NATIVE_NOT_SUPPORTED');
    this.busy = true;
    clearTimeout(this.idle);
    const controller = new AbortController();
    this.controller = controller;
    const cancel = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener('abort', cancel, { once: true });
    if (options.signal?.aborted) cancel();
    const signal = controller.signal;
    const start = performance.now();
    let first = 0;
    let clone: LanguageModel | undefined;
    const metrics: NativeGenerationMetrics = {
      firstChunkMs: 0,
      totalMs: 0,
      usageUnit: 'browser-quota',
    };
    const writing = options.writingOptions ?? DEFAULT_WRITING_OPTIONS;
    const context = `${NATIVE_INSTRUCTIONS[this.query.action]} ${writing.preserveSlang && task !== 'formal' ? 'Preserve slang and informality.' : 'You may adapt slang naturally.'} ${writing.addEmojis ? 'You may add suitable emojis.' : 'Do not add new emojis.'}`;
    try {
      signal.throwIfAborted();
      if (this.config.api === 'proofreader') {
        const result: ProofreadResult = await (slot.session as Proofreader).proofread(text, {
          signal,
        });
        signal.throwIfAborted();
        if (typeof result.correctedInput !== 'string')
          throw new ChromeEngineError('INVALID_OUTPUT');
        first = performance.now() - start;
        yield result.correctedInput;
      } else {
        let stream: ReadableStream<string> | undefined;
        if (this.config.api === 'rewriter') {
          const session = slot.session as Rewriter;
          if (typeof session.measureInputUsage === 'function') {
            metrics.inputUsage = await session.measureInputUsage(text, { context, signal });
            metrics.inputLimit = session.inputQuota;
            this.checkQuota(metrics);
          }
          if (typeof session.rewriteStreaming === 'function')
            stream = session.rewriteStreaming(text, { context, signal });
          else {
            const result = await session.rewrite(text, { context, signal });
            signal.throwIfAborted();
            first = performance.now() - start;
            yield result;
          }
        } else {
          clone = await (slot.session as LanguageModel).clone({ signal });
          const input: LanguageModelPrompt = [
            { role: 'user', content: `${context}\n\nDraft data:\n${text}` },
          ];
          const promptOptions: LanguageModelPromptOptions = { signal };
          if (task === 'semantic-review')
            promptOptions.responseConstraint = {
              type: 'object',
              properties: {
                valid: { type: 'boolean' },
                meaningPreserved: { type: 'boolean' },
                issues: { type: 'array', items: { type: 'string' }, maxItems: 12 },
              },
              required: ['valid', 'meaningPreserved', 'issues'],
              additionalProperties: false,
            };
          if (typeof clone.measureContextUsage === 'function') {
            metrics.inputUsage = await clone.measureContextUsage(input, promptOptions);
            metrics.inputLimit = clone.contextWindow - clone.contextUsage;
          } else if (typeof clone.measureInputUsage === 'function') {
            metrics.inputUsage = await clone.measureInputUsage(input, promptOptions);
            metrics.inputLimit = clone.inputQuota - clone.inputUsage;
          }
          this.checkQuota(metrics);
          if (typeof clone.promptStreaming === 'function')
            stream = clone.promptStreaming(input, promptOptions);
          else {
            const result = await clone.prompt(input, promptOptions);
            signal.throwIfAborted();
            first = performance.now() - start;
            yield result;
          }
        }
        if (stream)
          for await (const fragment of nativeStream(stream, signal)) {
            if (!first) first = performance.now() - start;
            yield fragment;
          }
      }
      signal.throwIfAborted();
      metrics.firstChunkMs = first;
      metrics.totalMs = performance.now() - start;
      options.onNativeMetrics?.(metrics);
    } catch (error) {
      throw nativeError(error);
    } finally {
      clone?.destroy();
      options.signal?.removeEventListener('abort', cancel);
      this.controller = undefined;
      this.busy = false;
      this.armIdle();
    }
  }
  private checkQuota(metrics: NativeGenerationMetrics) {
    if (
      metrics.inputUsage !== undefined &&
      metrics.inputLimit !== undefined &&
      metrics.inputUsage > metrics.inputLimit
    )
      throw new ChromeEngineError('NATIVE_QUOTA');
  }
  private armIdle() {
    clearTimeout(this.idle);
    if (this.slots.size)
      this.idle = setTimeout(() => {
        void this.unload();
      }, this.idleMs);
  }
  unload(): Promise<void> {
    this.epoch++;
    clearTimeout(this.idle);
    this.controller?.abort();
    for (const { session } of this.slots.values()) session.destroy();
    this.slots.clear();
    return Promise.resolve();
  }
}
