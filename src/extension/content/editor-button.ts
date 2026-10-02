import { WhatsAppAdapter } from '../../integration/whatsapp/adapter';
import type { EditorTarget } from '../../integration/whatsapp/adapter';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { PreviewPanel } from './PreviewPanel';
import { PreviewSession } from './preview-session';
import styles from './editor-button.css?inline';
import { watchTheme } from '../settings/theme';

const mounted = new WeakMap<Document, () => void>();

/** Uma montagem por documento; o chamador encerra no pagehide. */
export function mountEditorButton(document: Document): () => void {
  const existing = mounted.get(document);
  if (existing) return existing;
  const adapter = new WhatsAppAdapter(document);
  const session = new PreviewSession(adapter);
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
  button.className = 'launcher';
  button.setAttribute('aria-label', 'IA — assistente de escrita local');
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', 'false');
  button.title = 'Assistente de escrita local';
  button.hidden = true;
  const panelContainer = document.createElement('div');
  panelContainer.className = 'panel-container';
  shadow.append(style, button, panelContainer);
  const root = createRoot(panelContainer);
  const unsubscribeTheme = watchTheme(host);
  let target: EditorTarget | null = null;
  let frame: number | undefined;
  let stopped = false;

  function dismiss(): void {
    session.close();
  }
  function cancel(): void {
    dismiss();
    if (target) adapter.focusEditor(target.editorId);
  }
  root.render(createElement(PreviewPanel, { session, onClose: cancel }));
  const unsubscribeSession = session.subscribe(() => {
    button.setAttribute('aria-expanded', String(session.getState().kind !== 'closed'));
  });

  function position(): void {
    frame = undefined;
    if (!target) {
      button.hidden = true;
      return;
    }
    const editor = target.editor.getBoundingClientRect();
    const composer = target.composer.getBoundingClientRect();
    const candidates = [
      editor.right - 48,
      editor.left,
      (editor.left + editor.right) / 2 - 24,
      editor.left + (editor.width - 48) / 4,
      editor.left + (3 * (editor.width - 48)) / 4,
    ].map((left) => Math.min(Math.max(left, 8), innerWidth - 56));
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
    const editorVisible =
      editor.width > 0 &&
      editor.height > 0 &&
      top >= 8 &&
      composer.top < innerHeight &&
      editor.right > 0 &&
      editor.left < innerWidth;
    button.hidden = !editorVisible || safeLeft === undefined;
    button.style.left = `${String(left)}px`;
    button.style.top = `${String(top)}px`;
    panelContainer.style.left = `${String(Math.max(8, Math.min(left - 320, innerWidth - 388)))}px`;
    panelContainer.style.bottom = `${String(innerHeight - top + 8)}px`;
    panelContainer.style.setProperty('--panel-height', `${String(Math.max(120, top - 16))}px`);
    // Um controle transitório pode cobrir a posição do botão enquanto a prévia
    // está aberta. Só fechar quando o editor realmente deixar a área visível.
    if (!editorVisible) dismiss();
  }

  function schedulePosition(): void {
    if (!stopped && frame === undefined) frame = requestAnimationFrame(position);
  }

  const resize = new ResizeObserver(schedulePosition);
  const unsubscribe = adapter.subscribe((next) => {
    session.validate();
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
    if (session.getState().kind === 'closed') session.executeConfigured();
    else cancel();
  };
  const keydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && session.getState().kind !== 'closed') {
      event.preventDefault();
      event.stopPropagation();
      cancel();
    }
  };
  const outside = (event: PointerEvent): void => {
    if (!event.composedPath().includes(host)) dismiss();
  };
  button.addEventListener('click', click);
  document.addEventListener('keydown', keydown, true);
  document.addEventListener('pointerdown', outside, true);
  globalThis.addEventListener('resize', schedulePosition);
  globalThis.addEventListener('scroll', schedulePosition, true);
  adapter.start();

  const dispose = (): void => {
    if (stopped) return;
    stopped = true;
    unsubscribe();
    unsubscribeSession();
    unsubscribeTheme();
    adapter.stop();
    resize.disconnect();
    if (frame !== undefined) cancelAnimationFrame(frame);
    button.removeEventListener('click', click);
    document.removeEventListener('keydown', keydown, true);
    document.removeEventListener('pointerdown', outside, true);
    globalThis.removeEventListener('resize', schedulePosition);
    globalThis.removeEventListener('scroll', schedulePosition, true);
    dismiss();
    root.unmount();
    host.remove();
    mounted.delete(document);
  };
  mounted.set(document, dispose);
  return dispose;
}
