import { fields, record } from './protocol';

export const PREFERENCES_KEY = 'writingPreferences';
export interface WritingPreferences {
  version: 1;
  semanticReview: boolean;
}
export const DEFAULT_PREFERENCES: WritingPreferences = { version: 1, semanticReview: false };

export type PreferenceCommand =
  | { target: 'preferences'; type: 'get' }
  | { target: 'preferences'; type: 'set'; semanticReview: boolean };

export function isPreferenceCommand(value: unknown): value is PreferenceCommand {
  return (
    record(value) &&
    value.target === 'preferences' &&
    ((fields(value, ['target', 'type']) && value.type === 'get') ||
      (fields(value, ['target', 'type', 'semanticReview']) &&
        value.type === 'set' &&
        typeof value.semanticReview === 'boolean'))
  );
}

export function parsePreferences(value: unknown): WritingPreferences {
  if (value === undefined) return { ...DEFAULT_PREFERENCES };
  if (
    !record(value) ||
    !fields(value, ['version', 'semanticReview']) ||
    value.version !== 1 ||
    typeof value.semanticReview !== 'boolean'
  )
    throw new Error('Preferências inválidas.');
  return { version: 1, semanticReview: value.semanticReview };
}
