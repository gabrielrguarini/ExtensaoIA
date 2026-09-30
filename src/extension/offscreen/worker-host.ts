import { isEngineEvent } from '../../shared/protocol';
import type { EngineEvent } from '../../shared/protocol';
import type { Engine } from '../background/router';

/** A vida do Worker depende do pedido/aba, nunca de uma porta do Service Worker. */
export class WorkerHost {
  private worker: Worker | undefined;
  private preparing: Promise<Engine> | undefined;
  private rejectReady: (() => void) | undefined;
  private ready = false;

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
    this.worker?.terminate();
    this.worker = undefined;
    this.ready = false;
    this.rejectReady?.();
    this.rejectReady = undefined;
  }

  private engine(worker: Worker): Engine {
    return {
      send: (command) => {
        if (this.worker !== worker || !this.ready) throw new Error('Motor desconectado.');
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
            resolve(this.engine(worker));
          } else if (this.ready) this.onEvent(event.data);
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
