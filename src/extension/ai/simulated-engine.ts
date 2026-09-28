import { isEngineCommand, sameBinding } from '../../shared/protocol';
import type { Binding, EngineEvent } from '../../shared/protocol';

export class SimulatedEngine {
  private active: Binding | undefined;
  private timers: ReturnType<typeof setTimeout>[] = [];
  constructor(private readonly emit: (event: EngineEvent) => void) {}

  receive(value: unknown): void {
    if (!isEngineCommand(value)) return;
    if (value.type === 'cancel') {
      if (!this.active || !sameBinding(value.binding, this.active)) return;
      const binding = this.active;
      this.dispose();
      this.emit({ type: 'cancelled', binding });
      return;
    }
    if (value.request.action !== 'simular') return;
    const { key, origin, text } = value.request;
    const binding: Binding = { key, origin };
    if (this.active) {
      this.emit({ type: 'error', binding, code: 'BUSY' });
      return;
    }
    this.active = binding;
    this.emit({ type: 'progress', binding, percent: 25 });
    this.timers.push(
      setTimeout(() => {
        this.emit({
          type: 'fragment',
          binding,
          text: text.slice(0, Math.max(1, Math.floor(text.length / 2))),
        });
        this.emit({ type: 'progress', binding, percent: 75 });
      }, 400),
    );
    this.timers.push(
      setTimeout(() => {
        this.dispose();
        // Eco deliberado: nunca apresentar isto como texto corrigido por IA.
        this.emit({ type: 'result', binding, text, simulated: true });
      }, 1_200),
    );
  }
  dispose(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.active = undefined;
  }
}
