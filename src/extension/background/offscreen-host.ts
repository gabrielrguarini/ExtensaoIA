/** Prepara o documento; não mantém uma porta nem o pedido no Service Worker. */
export class OffscreenHost {
  private creating: Promise<void> | undefined;

  ensure(): Promise<void> {
    this.creating ??= this.create().finally(() => {
      this.creating = undefined;
    });
    return this.creating;
  }

  async reset(): Promise<void> {
    const contexts = await this.contexts();
    if (contexts.length) await chrome.runtime.sendMessage({ target: 'offscreen', type: 'reset' });
  }

  private contexts() {
    return chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
      documentUrls: [chrome.runtime.getURL('offscreen.html')],
    });
  }

  private async create(): Promise<void> {
    if (!(await this.contexts()).length) {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: [chrome.offscreen.Reason.WORKERS],
        justification: 'Hospedar o Worker local de inferência WebGPU e a prévia simulada.',
      });
    }
    // Confirma que o listener do documento está registrado antes de conectar a aba.
    const response: unknown = await chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'ready',
    });
    if (
      typeof response !== 'object' ||
      response === null ||
      !('ready' in response) ||
      response.ready !== true
    )
      throw new Error('Contexto local indisponível.');
  }
}
