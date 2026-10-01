import { fields, record } from './protocol';
import { isModelProfile } from './preferences';
import type { ModelProfile } from '../extension/ai/model-catalog';
export type RuntimeState = 'released' | 'worker-ready' | 'loading' | 'loaded';
export type ModelCommand =
  | {
      target: 'model-cache';
      type: 'status' | 'remove';
      profile: ModelProfile;
      variant: 'q4f16_1' | 'q4f32_1';
    }
  | { target: 'model-cache'; type: 'unload' };
export interface ModelStatus {
  ok: true;
  /** Inventário de arquivos; integridade dos pesos é conferida no carregamento. */
  cached: boolean;
  runtime: RuntimeState;
  loadedProfile: ModelProfile | null;
}
export function isModelCommand(value: unknown): value is ModelCommand {
  return (
    record(value) &&
    value.target === 'model-cache' &&
    ((fields(value, ['target', 'type']) && value.type === 'unload') ||
      (fields(value, ['target', 'type', 'profile', 'variant']) &&
        (value.type === 'remove' || value.type === 'status') &&
        isModelProfile(value.profile) &&
        (value.variant === 'q4f16_1' || value.variant === 'q4f32_1')))
  );
}
