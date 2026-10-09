/** Tooltip compartilhado pelo botão IA e pelas configurações. */
export function createTooltip(document: Document, id: string): HTMLDivElement {
  const tooltip = document.createElement('div');
  tooltip.className = 'writing-tooltip';
  tooltip.id = id;
  tooltip.setAttribute('role', 'tooltip');
  tooltip.setAttribute('aria-live', 'polite');
  tooltip.hidden = true;
  return tooltip;
}

export function positionTooltip(tooltip: HTMLElement, anchor: HTMLElement): void {
  const view = anchor.ownerDocument.defaultView;
  if (!view) return;
  const rect = anchor.getBoundingClientRect();
  const box = tooltip.getBoundingClientRect();
  const left = Math.max(
    8,
    Math.min(rect.left + rect.width / 2 - box.width / 2, view.innerWidth - box.width - 8),
  );
  tooltip.style.left = `${String(left)}px`;
  tooltip.style.setProperty(
    '--tooltip-arrow',
    `${String(rect.left + rect.width / 2 - left - 4)}px`,
  );
  const above = rect.top - box.height - 10 >= 8;
  tooltip.dataset.side = above ? 'top' : 'bottom';
  tooltip.style.top = above ? 'auto' : `${String(rect.bottom + 10)}px`;
  tooltip.style.bottom = above ? `${String(view.innerHeight - rect.top + 10)}px` : 'auto';
}
