import { isEngineEvent } from '../../shared/protocol';
import type { EngineEvent } from '../../shared/protocol';
import type { Engine } from '../background/router';
import type { RuntimeState } from '../../shared/model-management';
import type { ModelProfile } from '../ai/model-catalog';

/** A vida do Worker depende do pedido/aba, nunca de uma porta do Service Worker. */
export class WorkerHost {
  private worker: Worker | undefined;
  private preparing: Promise<Engine> | undefined;
  private rejectReady: (() => void) | undefined;
  private ready = false;
  private idle: ReturnType<typeof setTimeout> | undefined;
  runtime: RuntimeState = 'released';
  loadedProfile: ModelProfile | null = null;

  private armIdle(): void {
    if (this.idle) clearTimeout(this.idle);
    this.idle = setTimeout(() => this.reset(), 5 * 60_000);
  }

  constructor(
    private readonly createWorker: () => Worker,
    private readonly onEvent: (event: EngineEvent) => void,
    private readonly onLost: () => void,
  ) {}

  ensure(): Promise<Engine> {
    if (this.worker && this.ready) return Promise.resolve(this.engine(this.worker));
    this.preparing ??= this.create().finally(() => {
      this.preparing = undefined;
    });
    return this.preparing;
  }

  reset(): void {
    if (this.idle) clearTimeout(this.idle);
    this.idle = undefined;
    this.worker?.terminate();
    this.worker = undefined;
    this.ready = false;
    this.runtime = 'released';
    this.loadedProfile = null;
    this.rejectReady?.();
    this.rejectReady = undefined;
  }

  private engine(worker: Worker): Engine {
    return {
      send: (command) => {
        if (this.worker !== worker || !this.ready) throw new Error('Motor desconectado.');
        if (command.type === 'start' && this.idle) clearTimeout(this.idle);
        if (command.type === 'start' && command.request.action !== 'simular')
          this.loadedProfile = command.request.profile ?? 'economico';
        worker.postMessage(command);
      },
      reset: () => {
        if (this.worker === worker) this.reset();
      },
    };
  }

  private async create(): Promise<Engine> {
    const worker = this.createWorker();
    this.worker = worker;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await new Promise<Engine>((resolve, reject) => {
        this.rejectReady = () => reject(new Error('Motor local indisponível.'));
        timer = setTimeout(() => this.reset(), 5_000);
        worker.onmessage = (event: MessageEvent<unknown>) => {
          if (this.worker !== worker || !isEngineEvent(event.data)) return;
          if (event.data.type === 'ready') {
            this.ready = true;
            this.runtime = 'worker-ready';
            this.armIdle();
            resolve(this.engine(worker));
          } else if (this.ready) {
            if (event.data.type === 'cancelled' && this.runtime === 'loading') {
              this.runtime = 'worker-ready';
              this.loadedProfile = null;
            }
            if (event.data.type === 'model-progress') {
              if (
                event.data.phase === 'ready' ||
                ['generating', 'validating', 'reviewing'].includes(event.data.phase)
              )
                this.runtime = 'loaded';
              else this.runtime = 'loading';
            }
            if (
              (event.data.type === 'error' || event.data.type === 'action-rejected') &&
              [
                'UNAVAILABLE',
                'MODEL_DOWNLOAD',
                'INSUFFICIENT_RESOURCES',
                'DOWNLOAD_REQUIRED',
                'WEBGPU_UNAVAILABLE',
              ].includes(event.data.code)
            ) {
              this.runtime = 'worker-ready';
              this.loadedProfile = null;
            }
            if (
              [
                'result',
                'action-result',
                'review-result',
                'proof-result',
                'action-rejected',
                'cancelled',
                'error',
              ].includes(event.data.type)
            )
              this.armIdle();
            this.onEvent(event.data);
          }
        };
        const lost = () => {
          if (this.worker !== worker) return;
          this.reset();
          this.onLost();
        };
        worker.onerror = (event) => {
          event.preventDefault();
          lost();
        };
        worker.onmessageerror = lost;
      });
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      this.rejectReady = undefined;
    }
  }
}
