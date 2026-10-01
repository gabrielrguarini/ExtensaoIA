import { fields, record } from './protocol';
import { isGemmaVariant } from './local-model';
import type { GemmaVariant } from './local-model';
import type { RuntimeState } from './model-management';
export type GemmaCommand =
  | { target: 'gemma-cache'; type: 'status' | 'remove'; variant: GemmaVariant }
  | { target: 'gemma-cache'; type: 'unload' };
export interface GemmaStatus {
  ok: true;
  cached: boolean;
  runtime: RuntimeState;
}
export function isGemmaCommand(value: unknown): value is GemmaCommand {
  return (
    record(value) &&
    value.target === 'gemma-cache' &&
    ((fields(value, ['target', 'type']) && value.type === 'unload') ||
      (fields(value, ['target', 'type', 'variant']) &&
        (value.type === 'status' || value.type === 'remove') &&
        isGemmaVariant(value.variant)))
  );
}
