import { fields, record } from './protocol';
import type { ModelProfile } from '../extension/ai/model-catalog';
import { isWritingAction } from './actions';
import type { WritingAction } from './actions';

export const PREFERENCES_KEY = 'writingPreferences';
export interface WritingPreferences {
  version: 3;
  semanticReview: boolean;
  profile: ModelProfile;
  language: 'pt-BR';
  theme: 'system' | 'light' | 'dark';
  defaultAction: WritingAction;
  preserveSlang: boolean;
  addEmojis: boolean;
}
export const DEFAULT_PREFERENCES: WritingPreferences = {
  version: 3,
  semanticReview: false,
  profile: 'economico',
  language: 'pt-BR',
  theme: 'system',
  defaultAction: 'corrigir',
  preserveSlang: true,
  addEmojis: false,
};

export type PreferencePatch = Partial<Omit<WritingPreferences, 'version'>>;
export function isPreferencePatch(value: unknown): value is PreferencePatch {
  if (!record(value) || !Object.keys(value).length) return false;
  return Object.entries(value).every(([key, item]) => {
    switch (key) {
      case 'language':
        return item === 'pt-BR';
      case 'theme':
        return item === 'system' || item === 'light' || item === 'dark';
      case 'defaultAction':
        return isWritingAction(item);
      case 'profile':
        return isModelProfile(item);
      case 'semanticReview':
      case 'preserveSlang':
      case 'addEmojis':
        return typeof item === 'boolean';
      default:
        return false;
    }
  });
}

export type PreferenceCommand =
  | { target: 'preferences'; type: 'get' }
  | { target: 'preferences'; type: 'set'; semanticReview: boolean }
  | { target: 'preferences'; type: 'profile'; profile: ModelProfile }
  | { target: 'preferences'; type: 'update'; patch: PreferencePatch };

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
        isModelProfile(value.profile)) ||
      (fields(value, ['target', 'type', 'patch']) &&
        value.type === 'update' &&
        isPreferencePatch(value.patch)))
  );
}

export function parsePreferences(value: unknown): WritingPreferences {
  const result = { ...DEFAULT_PREFERENCES };
  if (!record(value) || (value.version !== 1 && value.version !== 2 && value.version !== 3))
    return result;
  // Lista fechada: migra valores válidos e descarta qualquer conteúdo/ chave desconhecida.
  for (const key of Object.keys(DEFAULT_PREFERENCES)) {
    if (
      key === 'version' ||
      (value.version === 1 && key !== 'semanticReview') ||
      (value.version === 2 && !['semanticReview', 'profile'].includes(key))
    )
      continue;
    const patch = { [key]: value[key] };
    if (isPreferencePatch(patch)) Object.assign(result, patch);
  }
  return result;
}
