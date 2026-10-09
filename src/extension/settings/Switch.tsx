// Adaptado do Switch shadcn/ui (base-nova); estilos locais equivalentes ao registry.
// https://ui.shadcn.com/r/styles/base-nova/switch.json — MIT, licenses/SHADCN-UI-LICENSE.
import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { useRef } from 'react';
import type { ComponentProps, SyntheticEvent } from 'react';

export function Switch({
  className,
  onCheckedChange,
  onClickCapture,
  onKeyDownCapture,
  onKeyUpCapture,
  ...props
}: ComponentProps<typeof SwitchPrimitive.Root>) {
  const gesture = useRef<Event | undefined>(undefined);
  function capture(event: SyntheticEvent) {
    if (!trustedSwitchEvent(event)) return;
    const native = event.nativeEvent;
    gesture.current = native;
    setTimeout(() => {
      if (gesture.current === native) gesture.current = undefined;
    });
  }
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={['settings-switch', className].filter(Boolean).join(' ')}
      {...props}
      onClickCapture={(event) => {
        capture(event);
        onClickCapture?.(event);
      }}
      onKeyDownCapture={(event) => {
        if (event.key === ' ' || event.key === 'Enter') capture(event);
        onKeyDownCapture?.(event);
      }}
      onKeyUpCapture={(event) => {
        if (event.key === ' ' || event.key === 'Enter') capture(event);
        onKeyUpCapture?.(event);
      }}
      onCheckedChange={(checked, details) => {
        // Base UI aciona um input oculto por clique construído. Manter a confiança
        // do gesto original somente durante a tarefa dessa ativação, uma vez.
        const event = gesture.current ?? details.event;
        gesture.current = undefined;
        if (trustedSwitchEvent(event)) onCheckedChange?.(checked, { ...details, event });
        else details.cancel();
      }}
    >
      <SwitchPrimitive.Thumb data-slot="switch-thumb" className="settings-switch-thumb" />
    </SwitchPrimitive.Root>
  );
}

export function trustedSwitchEvent(event: Event | SyntheticEvent): boolean {
  return ('nativeEvent' in event ? event.nativeEvent : event).isTrusted;
}
