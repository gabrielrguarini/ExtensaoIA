import { ENGINE_PORT, isEngineEvent } from '../../shared/protocol';
import { isExtensionPage } from '../../shared/senders';
import type { EngineEvent } from '../../shared/protocol';
import type { Engine } from './router';

/** Não usa keepalive. Uma conexão perdida encerra o pedido; novo pedido exige nova ação. */
export class OffscreenHost {
  private port: chrome.runtime.Port | undefined;
  private ready = false;
  private creating: Promise<Engine> | undefined;
  private waiter: { resolve(engine: Engine): void; reject(): void } | undefined;

  constructor(
    private readonly onEvent: (event: EngineEvent) => void,
    private readonly onLost: () => void,
  ) {}

  accept(port: chrome.runtime.Port): boolean {
    if (port.name !== ENGINE_PORT) return false;
    if (!isExtensionPage(port.sender, chrome.runtime.id, 'offscreen.html') || this.port) {
      port.disconnect();
      return true;
    }
    this.port = port;
    port.onMessage.addListener((value: unknown) => {
      if (this.port !== port || !isEngineEvent(value)) return;
      if (value.type === 'ready') {
        this.ready = true;
        this.waiter?.resolve(this.engine(port));
      } else if (this.ready) this.onEvent(value);
    });
    port.onDisconnect.addListener(() => {
      void chrome.runtime.lastError;
      if (this.port !== port) return;
      this.port = undefined;
      this.ready = false;
      this.waiter?.reject();
      this.onLost();
    });
    return true;
  }

  ensure(): Promise<Engine> {
    if (this.port && this.ready) return Promise.resolve(this.engine(this.port));
    this.creating ??= this.create().finally(() => {
      this.creating = undefined;
    });
    return this.creating;
  }

  private engine(port: chrome.runtime.Port): Engine {
    return {
      send: (command) => {
        if (this.port !== port || !this.ready) throw new Error('Motor desconectado.');
        port.postMessage(command);
      },
      reset: () => {
        if (this.port !== port) return;
        this.port = undefined;
        this.ready = false;
        port.disconnect();
      },
    };
  }

  private async create(): Promise<Engine> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const connected = new Promise<Engine>((resolve, reject) => {
      const fail = () => {
        reject(new Error('Contexto local indisponível.'));
      };
      this.waiter = { resolve, reject: fail };
      timer = setTimeout(fail, 5_000);
    });
    // Registrar o catch imediatamente evita rejeição não tratada durante createDocument.
    const outcome = connected.then(
      (engine) => ({ engine }),
      () => ({ engine: undefined }),
    );
    try {
      const contexts = await chrome.runtime.getContexts({
        contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
        documentUrls: [chrome.runtime.getURL('offscreen.html')],
      });
      if (!contexts.length) {
        await chrome.offscreen.createDocument({
          url: 'offscreen.html',
          reasons: [chrome.offscreen.Reason.WORKERS],
          justification: 'Hospedar o Worker local de processamento; motor simulado na STEP-03.',
        });
      } else {
        // Um documento sobrevivente ao Service Worker só reconecta por uma nova solicitação.
        await chrome.runtime.sendMessage({ target: 'offscreen', type: 'connect' });
      }
      const result = await outcome;
      if (!result.engine) throw new Error('Motor local indisponível.');
      return result.engine;
    } catch (error) {
      const port = this.port;
      this.port = undefined;
      this.ready = false;
      port?.disconnect();
      throw error;
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      this.waiter?.reject();
      this.waiter = undefined;
    }
  }
}
