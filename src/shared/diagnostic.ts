import { fields, record } from './protocol';

export const FIXTURE_TEXT = 'STEP-03: mensagem sintética, sem acesso a conversas.';
export type DiagnosticCommand =
  | { target: 'diagnostic'; type: 'list' }
  | { target: 'diagnostic'; type: 'run' | 'cancel' | 'status'; tabId: number };
export function isDiagnosticCommand(value: unknown): value is DiagnosticCommand {
  return (
    record(value) &&
    value.target === 'diagnostic' &&
    ((value.type === 'list' && fields(value, ['target', 'type'])) ||
      (typeof value.type === 'string' &&
        ['run', 'cancel', 'status'].includes(value.type) &&
        fields(value, ['target', 'type', 'tabId']) &&
        Number.isSafeInteger(value.tabId) &&
        (value.tabId as number) >= 0))
  );
}
export type Probe = { target: 'probe'; type: 'run' | 'cancel' | 'status' };
export function isProbe(value: unknown): value is Probe {
  return (
    record(value) &&
    fields(value, ['target', 'type']) &&
    value.target === 'probe' &&
    typeof value.type === 'string' &&
    ['run', 'cancel', 'status'].includes(value.type)
  );
}
