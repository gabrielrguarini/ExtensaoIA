import { WhatsAppAdapter } from '../../integration/whatsapp/adapter';
import type { DraftSnapshot, EditorTarget } from '../../integration/whatsapp/adapter';
import styles from './editor-button.css?inline';

const mounted = new WeakMap<Document, () => void>();

/** Uma montagem por documento; o chamador encerra no pagehide. */
export function mountEditorButton(document: Document): () => void {
  const existing = mounted.get(document);
  if (existing) return existing;
  const adapter = new WhatsAppAdapter(document);
  const host = document.createElement('div');
  host.setAttribute('data-local-writing-host', '');
  host.style.cssText =
    'all:initial;position:fixed;inset:0 auto auto 0;width:0;height:0;z-index:2147483000;pointer-events:none';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = styles;
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'IA';
  button.setAttribute('aria-label', 'IA — assistente de escrita local');
  button.setAttribute('aria-describedby', 'local-writing-status');
  button.title = 'Assistente de escrita local';
  button.hidden = true;
  const status = document.createElement('p');
  status.id = 'local-writing-status';
  status.setAttribute('role', 'status');
  status.hidden = true;
  shadow.append(style, button, status);
  let target: EditorTarget | null = null;
  let snapshot: DraftSnapshot | null = null;
  let frame: number | undefined;
  let stopped = false;

  function dismiss(): void {
    status.hidden = true;
    status.textContent = '';
    snapshot = null;
  }

  function position(): void {
    frame = undefined;
    if (!target) {
      button.hidden = true;
      return;
    }
    const editor = target.editor.getBoundingClientRect();
    const composer = target.composer.getBoundingClientRect();
    const candidates = [editor.right - 48, editor.left, (editor.left + editor.right) / 2 - 24].map(
      (left) => Math.min(Math.max(left, 8), innerWidth - 56),
    );
    const top = composer.top - 40;
    // Se um controle nativo ocupa a posição, tentar outra; nunca capturar seus cliques.
    const safeLeft = candidates.find((left) =>
      [left + 2, left + 24, left + 46].every((x) =>
        [top + 2, top + 16, top + 30].every(
          (y) =>
            !document
              .elementsFromPoint(x, y)
              .some(
                (element) =>
                  element !== host &&
                  element.closest(
                    'button, a, input, textarea, select, [role="button"], [role="dialog"], [contenteditable="true"], [contenteditable="plaintext-only"]',
                  ),
              ),
        ),
      ),
    );
    const left = safeLeft ?? 8;
    const visible =
      safeLeft !== undefined &&
      editor.width > 0 &&
      editor.height > 0 &&
      top >= 8 &&
      composer.top < innerHeight &&
      editor.right > 0 &&
      editor.left < innerWidth;
    button.hidden = !visible;
    button.style.left = `${String(left)}px`;
    button.style.top = `${String(top)}px`;
    status.style.left = `${String(Math.max(8, left - 240))}px`;
    status.style.bottom = `${String(innerHeight - top + 8)}px`;
    if (!visible) dismiss();
  }

  function schedulePosition(): void {
    if (!stopped && frame === undefined) frame = requestAnimationFrame(position);
  }

  const resize = new ResizeObserver(schedulePosition);
  const unsubscribe = adapter.subscribe((next) => {
    if (snapshot && !adapter.isCurrent(snapshot)) dismiss();
    if (target !== next) {
      dismiss();
      resize.disconnect();
      target = next;
      if (target) {
        resize.observe(target.editor);
        resize.observe(target.composer);
      }
    }
    if (target && !host.isConnected) document.body.append(host);
    if (!target) host.remove();
    schedulePosition();
  });
  const click = (event: MouseEvent): void => {
    if (!event.isTrusted) return;
    snapshot = adapter.capture();
    if (!snapshot) {
      dismiss();
      return;
    }
    // Esta etapa confirma somente a integração. Nenhum rascunho vai ao motor simulado.
    status.textContent =
      'Campo de mensagem reconhecido. As ações de escrita ainda não estão disponíveis nesta versão.';
    status.hidden = false;
  };
  const keydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') dismiss();
  };
  const outside = (event: PointerEvent): void => {
    if (!event.composedPath().includes(host)) dismiss();
  };
  button.addEventListener('click', click);
  document.addEventListener('keydown', keydown);
  document.addEventListener('pointerdown', outside, true);
  globalThis.addEventListener('resize', schedulePosition);
  globalThis.addEventListener('scroll', schedulePosition, true);
  adapter.start();

  const dispose = (): void => {
    if (stopped) return;
    stopped = true;
    unsubscribe();
    adapter.stop();
    resize.disconnect();
    if (frame !== undefined) cancelAnimationFrame(frame);
    button.removeEventListener('click', click);
    document.removeEventListener('keydown', keydown);
    document.removeEventListener('pointerdown', outside, true);
    globalThis.removeEventListener('resize', schedulePosition);
    globalThis.removeEventListener('scroll', schedulePosition, true);
    dismiss();
    host.remove();
    mounted.delete(document);
  };
  mounted.set(document, dispose);
  return dispose;
}
