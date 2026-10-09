import { useId, useLayoutEffect, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import { createTooltip, positionTooltip } from '../ui/tooltip';
import '../ui/tooltip.css';

export function PreparationButton({
  reason,
  ...props
}: Omit<ComponentProps<'button'>, 'children'> & { reason: string; children: string }) {
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useLayoutEffect(() => {
    const trigger = anchor.current;
    if (!trigger || !props.disabled) return;
    const tooltip = createTooltip(trigger.ownerDocument, id);
    tooltip.textContent = reason;
    tooltip.style.zIndex = '10';
    trigger.ownerDocument.body.append(tooltip);
    const update = () => {
      tooltip.hidden = dismissed || !(hovered || focused);
      if (!tooltip.hidden) positionTooltip(tooltip, trigger);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      tooltip.remove();
    };
  }, [id, reason, props.disabled, hovered, focused, dismissed]);
  return (
    <span
      ref={anchor}
      className="preparation-trigger"
      tabIndex={props.disabled ? 0 : undefined}
      role={props.disabled ? 'group' : undefined}
      aria-label={props.disabled ? props.children : undefined}
      aria-describedby={props.disabled ? id : undefined}
      onMouseEnter={() => {
        setHovered(true);
        setDismissed(false);
      }}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => {
        setFocused(true);
        setDismissed(false);
      }}
      onBlur={() => setFocused(false)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setDismissed(true);
      }}
    >
      <button {...props} aria-describedby={props.disabled ? id : undefined} />
    </span>
  );
}
