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
export function mountEditorButton(
  document: Document,
  createSession: (adapter: WhatsAppAdapter) => PreviewSession = (adapter) =>
    new PreviewSession(adapter),
): () => void {
  const existing = mounted.get(document);
  if (existing) return existing;
  const adapter = new WhatsAppAdapter(document);
  const session = createSession(adapter);
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
  button.setAttribute('aria-expanded', 'false');
  const tooltip = document.createElement('div');
  tooltip.className = 'writing-tooltip';
  tooltip.id = 'local-writing-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.setAttribute('aria-live', 'polite');
  tooltip.hidden = true;
  button.setAttribute('aria-describedby', tooltip.id);
  button.hidden = true;
  const panelContainer = document.createElement('div');
  panelContainer.className = 'panel-container';
  shadow.append(style, button, tooltip, panelContainer);
  const root = createRoot(panelContainer);
  const unsubscribeTheme = watchTheme(host);
  let target: EditorTarget | null = null;
  let frame: number | undefined;
  let stopped = false;
  let hovered = false;
  let focused = false;
  let tooltipDismissed = false;

  function feedback(): void {
    const state = session.getState();
    const running = session.isRunning();
    const direct = session.isDirect();
    button.setAttribute('aria-busy', String(running));
    button.setAttribute('aria-label', running ? 'Cancelar IA' : 'IA — assistente de escrita local');
    button.classList.toggle('is-loading', running);
    const expanded = !direct && state.kind !== 'closed';
    button.setAttribute('aria-expanded', String(expanded));
    if (direct) button.removeAttribute('aria-haspopup');
    else button.setAttribute('aria-haspopup', 'dialog');
    const label =
      direct && state.kind === 'notice'
        ? state.message
        : running
          ? state.kind === 'action-loading' && state.partial
            ? 'Escrevendo…'
            : 'Carregando IA'
          : 'Aplicar a ação configurada';
    if (tooltip.textContent !== label) tooltip.textContent = label;
    tooltip.hidden =
      button.hidden ||
      tooltipDismissed ||
      !(running || (direct && state.kind === 'notice') || hovered || focused);
    if (!tooltip.hidden) {
      const rect = button.getBoundingClientRect();
      const box = tooltip.getBoundingClientRect();
      const left = Math.max(
        8,
        Math.min(rect.left + rect.width / 2 - box.width / 2, innerWidth - box.width - 8),
      );
      tooltip.style.left = `${String(left)}px`;
      tooltip.style.setProperty(
        '--tooltip-arrow',
        `${String(rect.left + rect.width / 2 - left - 4)}px`,
      );
      const above = rect.top - box.height - 10 >= 8;
      tooltip.dataset.side = above ? 'top' : 'bottom';
      tooltip.style.top = above ? 'auto' : `${String(rect.bottom + 10)}px`;
      tooltip.style.bottom = above ? `${String(innerHeight - rect.top + 10)}px` : 'auto';
    }
  }
  const mouseenter = (): void => {
    hovered = true;
    tooltipDismissed = false;
    feedback();
  };
  const mouseleave = (): void => {
    hovered = false;
    feedback();
  };
  const focus = (): void => {
    focused = true;
    tooltipDismissed = false;
    feedback();
  };
  const blur = (): void => {
    focused = false;
    feedback();
  };

  function dismiss(): void {
    session.close();
  }
  function cancel(): void {
    dismiss();
    if (target) adapter.focusEditor(target.editorId);
  }
  root.render(createElement(PreviewPanel, { session, onClose: cancel }));
  const unsubscribeSession = session.subscribe(feedback);

  function position(): void {
    frame = undefined;
    if (!target) {
      button.hidden = true;
      feedback();
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
    feedback();
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
    tooltipDismissed = false;
    if (session.getState().kind === 'closed' || (session.isDirect() && !session.isRunning()))
      session.executeConfigured();
    else cancel();
  };
  const keydown = (event: KeyboardEvent): void => {
    if (
      session.isDirect() &&
      session.isRunning() &&
      target &&
      event.composedPath().includes(target.editor) &&
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.isComposing
    )
      session.close(false);
    if (event.key === 'Escape' && (session.getState().kind !== 'closed' || !tooltip.hidden)) {
      event.preventDefault();
      event.stopPropagation();
      if (session.getState().kind !== 'closed') cancel();
      tooltipDismissed = true;
      feedback();
    }
  };
  const outside = (event: PointerEvent): void => {
    if (event.composedPath().includes(host)) return;
    if (session.isDirect() && target && event.composedPath().includes(target.editor)) return;
    if (session.isDirect() && target && event.composedPath().includes(target.composer)) {
      session.close(false);
      return;
    }
    dismiss();
  };
  button.addEventListener('click', click);
  button.addEventListener('mouseenter', mouseenter);
  button.addEventListener('mouseleave', mouseleave);
  button.addEventListener('focus', focus);
  button.addEventListener('blur', blur);
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
    button.removeEventListener('mouseenter', mouseenter);
    button.removeEventListener('mouseleave', mouseleave);
    button.removeEventListener('focus', focus);
    button.removeEventListener('blur', blur);
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
