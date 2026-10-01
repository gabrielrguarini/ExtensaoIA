import { isClientCommand, isRequestEvent, sameBinding, sameKey } from '../../shared/protocol';
import type { ModelProfile } from '../ai/model-catalog';
import { DEFAULT_WRITING_OPTIONS } from '../../shared/writing-options';
import type { WritingOptions } from '../../shared/writing-options';
import type {
  Binding,
  BoundRequest,
  ClientEvent,
  EngineCommand,
  Origin,
  RequestKey,
} from '../../shared/protocol';

export interface Client {
  origin: Origin;
  send(event: ClientEvent): void;
}
export interface Engine {
  send: (command: EngineCommand) => void;
  reset: () => void;
}
interface Active {
  binding: Binding;
  action: BoundRequest['action'];
  client: Client;
  engine?: Engine;
  cancelling: boolean;
  timer: ReturnType<typeof setTimeout>;
}

/** Conteúdo existe somente na chamada start; não vai para logs, storage ou histórico. */
export class RequestRouter {
  private active: Active | undefined;
  private maintenance = false;

  setMaintenance(value: boolean): void {
    this.maintenance = value;
    if (value) this.resetForProfileChange();
  }
  private readonly seen = new WeakMap<Client, Set<string>>();

  constructor(
    private readonly ensureEngine: () => Promise<Engine>,
    private readonly timeoutMs = 15_000,
    _semanticReviewEnabled: () => Promise<boolean> = () => Promise.resolve(false),
    private readonly selectedProfile: () => Promise<ModelProfile> = () =>
      Promise.resolve('economico'),
    private readonly writingOptions: () => Promise<WritingOptions> = () =>
      Promise.resolve(DEFAULT_WRITING_OPTIONS),
  ) {
    // Compatibilidade com injeções anteriores; a preferência não dispara geração.
    void _semanticReviewEnabled;
  }

  receive(client: Client, value: unknown): void {
    if (!isClientCommand(value)) {
      this.reject(client, 'INVALID_MESSAGE', null);
      return;
    }
    if (value.type === 'status') {
      client.send({ type: 'status', state: this.active ? 'busy' : 'idle', simulated: true });
      return;
    }
    if (value.type === 'cancel') {
      const active = this.active;
      if (!active || active.client !== client || !sameKey(active.binding.key, value.key)) {
        this.reject(client, 'UNKNOWN_REQUEST', value.key);
        return;
      }
      if (!active.engine) {
        this.finish({ type: 'cancelled', binding: active.binding });
        return;
      }
      active.cancelling = true;
      try {
        active.engine.send({ type: 'cancel', binding: active.binding });
      } catch {
        this.engineLost();
      }
      return;
    }
    if (this.active || this.maintenance) {
      this.reject(client, 'BUSY', value.key);
      return;
    }
    const ids = this.seen.get(client) ?? new Set<string>();
    if (ids.has(value.key.requestId) || ids.size >= 256) {
      this.reject(client, 'INVALID_MESSAGE', value.key);
      return;
    }
    ids.add(value.key.requestId);
    this.seen.set(client, ids);
    const binding: Binding = { key: { ...value.key }, origin: { ...client.origin } };
    const active: Active = {
      binding,
      action: value.action,
      client,
      cancelling: false,
      timer: setTimeout(
        () => {
          if (this.active !== active) return;
          const engine = active.engine;
          this.finish({ type: 'error', binding, code: 'TIMEOUT' });
          engine?.reset();
        },
        value.action === 'simular' ? this.timeoutMs : 60 * 60_000,
      ),
    };
    this.active = active;
    client.send({ type: 'progress', binding, percent: 0 });
    void this.start(
      active,
      {
        ...binding,
        text: value.text,
        action: value.action,
        semanticReview: false,
        profile: 'economico',
        allowDownload: value.allowDownload === true,
        ...(value.suggestion === undefined ? {} : { suggestion: value.suggestion }),
      },
      value.expectedProfile,
    );
  }

  private async start(
    active: Active,
    request: BoundRequest,
    expectedProfile?: ModelProfile,
  ): Promise<void> {
    if (this.active !== active) return;
    try {
      if (request.action !== 'simular') {
        const [profile, options] = await Promise.all([
          this.selectedProfile(),
          this.writingOptions(),
        ]);
        // A preferência mostra o botão; nenhuma segunda geração automática.
        request.semanticReview = false;
        request.profile = profile;
        request.writingOptions = options;
        if (
          this.active === active &&
          expectedProfile !== undefined &&
          expectedProfile !== profile
        ) {
          this.finish({ type: 'cancelled', binding: active.binding });
          return;
        }
      }
      if (this.active !== active) return;
      const engine = await this.ensureEngine();
      if (this.active !== active) return;
      active.engine = engine;
      engine.send({ type: 'start', request });
    } catch {
      if (this.active === active)
        this.finish({ type: 'error', binding: active.binding, code: 'UNAVAILABLE' });
    }
  }

  receiveEngine(value: unknown): void {
    const active = this.active;
    if (!isRequestEvent(value) || !active || !sameBinding(value.binding, active.binding)) return;
    if (
      ((value.type === 'result' || value.type === 'fragment') && active.action !== 'simular') ||
      ((value.type === 'action-fragment' ||
        value.type === 'action-result' ||
        value.type === 'action-rejected') &&
        active.action !== value.action) ||
      (value.type === 'proof-result' && active.action !== 'prova-modelo') ||
      (value.type === 'review-result' && active.action !== 'revisar-sentido')
    )
      return;
    // Após cancelar, nem mesmo um resultado que estava em trânsito pode ser aplicado.
    if (active.cancelling && value.type !== 'cancelled' && value.type !== 'error') return;
    if (
      value.type === 'result' ||
      value.type === 'action-result' ||
      value.type === 'review-result' ||
      value.type === 'action-rejected' ||
      value.type === 'proof-result' ||
      value.type === 'cancelled' ||
      value.type === 'error'
    )
      this.finish(value);
    else active.client.send(value);
  }

  disconnect(client: Client): void {
    const active = this.active;
    this.seen.delete(client);
    if (active?.client !== client) return;
    clearTimeout(active.timer);
    this.active = undefined;
    // Reiniciar o Worker cancela também eventos já enfileirados, sem liberar dois motores.
    active.engine?.reset();
  }

  engineLost(): void {
    if (this.active)
      this.finish({ type: 'error', binding: this.active.binding, code: 'DISCONNECTED' });
  }

  resetForProfileChange(): void {
    const active = this.active;
    if (!active) return;
    const engine = active.engine;
    this.finish({ type: 'cancelled', binding: active.binding });
    engine?.reset();
  }

  private finish(event: ClientEvent): void {
    const active = this.active;
    if (!active) return;
    clearTimeout(active.timer);
    this.active = undefined;
    active.client.send(event);
  }
  private reject(
    client: Client,
    code: 'INVALID_MESSAGE' | 'UNKNOWN_REQUEST' | 'BUSY',
    key: RequestKey | null,
  ): void {
    client.send({ type: 'rejected', code, key });
  }
}
