import { fields, record } from './protocol';
import type { ModelProfile } from '../extension/ai/model-catalog';

export const PREFERENCES_KEY = 'writingPreferences';
export interface WritingPreferences {
  version: 2;
  semanticReview: boolean;
  profile: ModelProfile;
}
export const DEFAULT_PREFERENCES: WritingPreferences = {
  version: 2,
  semanticReview: false,
  profile: 'economico',
};

export type PreferenceCommand =
  | { target: 'preferences'; type: 'get' }
  | { target: 'preferences'; type: 'set'; semanticReview: boolean }
  | { target: 'preferences'; type: 'profile'; profile: ModelProfile };

export function isModelProfile(value: unknown): value is ModelProfile {
  return value === 'economico' || value === 'equilibrado' || value === 'qualidade';
}

export function isPreferenceCommand(value: unknown): value is PreferenceCommand {
  return (
    record(value) &&
    value.target === 'preferences' &&
    ((fields(value, ['target', 'type']) && value.type === 'get') ||
      (fields(value, ['target', 'type', 'semanticReview']) &&
        value.type === 'set' &&
        typeof value.semanticReview === 'boolean') ||
      (fields(value, ['target', 'type', 'profile']) &&
        value.type === 'profile' &&
        isModelProfile(value.profile)))
  );
}

export function parsePreferences(value: unknown): WritingPreferences {
  if (value === undefined) return { ...DEFAULT_PREFERENCES };
  if (!record(value) || typeof value.semanticReview !== 'boolean')
    throw new Error('Preferências inválidas.');
  // Migração dos dados da STEP-11 sem perder a revisão semântica.
  if (value.version === 1 && fields(value, ['version', 'semanticReview']))
    return { version: 2, semanticReview: value.semanticReview, profile: 'economico' };
  if (
    value.version !== 2 ||
    !fields(value, ['version', 'semanticReview', 'profile']) ||
    !isModelProfile(value.profile)
  )
    throw new Error('Preferências inválidas.');
  return { version: 2, semanticReview: value.semanticReview, profile: value.profile };
}
