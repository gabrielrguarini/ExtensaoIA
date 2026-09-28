import { isClientCommand, isRequestEvent, sameBinding, sameKey } from '../../shared/protocol';
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
  client: Client;
  engine?: Engine;
  cancelling: boolean;
  timer: ReturnType<typeof setTimeout>;
}

/** Conteúdo existe somente na chamada start; não vai para logs, storage ou histórico. */
export class RequestRouter {
  private active: Active | undefined;
  private readonly seen = new WeakMap<Client, Set<string>>();

  constructor(
    private readonly ensureEngine: () => Promise<Engine>,
    private readonly timeoutMs = 15_000,
  ) {}

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
    if (this.active) {
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
      client,
      cancelling: false,
      timer: setTimeout(
        () => {
          if (this.active !== active) return;
          const engine = active.engine;
          this.finish({ type: 'error', binding, code: 'TIMEOUT' });
          engine?.reset();
        },
        value.action === 'prova-modelo' ? 60 * 60_000 : this.timeoutMs,
      ),
    };
    this.active = active;
    client.send({ type: 'progress', binding, percent: 0 });
    void this.start(active, { ...binding, text: value.text, action: value.action });
  }

  private async start(active: Active, request: BoundRequest): Promise<void> {
    if (this.active !== active) return;
    try {
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
    // Após cancelar, nem mesmo um resultado que estava em trânsito pode ser aplicado.
    if (active.cancelling && value.type !== 'cancelled' && value.type !== 'error') return;
    if (
      value.type === 'result' ||
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
