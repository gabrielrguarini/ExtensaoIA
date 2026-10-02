import { fields, record } from './protocol';
import type { ModelProfile } from '../extension/ai/model-catalog';
import { isWritingAction } from './actions';
import type { WritingAction } from './actions';
import type { LocalModel } from './local-model';

export const PREFERENCES_KEY = 'writingPreferences';
export interface WritingPreferences {
  version: 6;
  engine: 'chrome-preferred' | 'local';
  localModel: LocalModel;
  chromePortuguesePrompt: boolean;
  /** Modelo WebLLM escolhido, inclusive como alternativa ao Chrome. */
  profile: ModelProfile;
  language: 'pt-BR';
  theme: 'system' | 'light' | 'dark';
  defaultAction: WritingAction;
  preserveSlang: boolean;
  addEmojis: boolean;
}
export const DEFAULT_PREFERENCES: WritingPreferences = {
  version: 6,
  engine: 'chrome-preferred',
  localModel: 'webllm',
  chromePortuguesePrompt: false,
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
      case 'engine':
        return item === 'chrome-preferred' || item === 'local';
      case 'localModel':
        return item === 'webllm' || item === 'gemma';
      case 'language':
        return item === 'pt-BR';
      case 'theme':
        return item === 'system' || item === 'light' || item === 'dark';
      case 'defaultAction':
        return isWritingAction(item);
      case 'profile':
        return isModelProfile(item);
      case 'chromePortuguesePrompt':
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
  if (!record(value) || ![1, 2, 3, 4, 5, 6].includes(value.version as number)) return result;
  if (value.version === 4 && value.engine === 'webllm') result.engine = 'local';
  // Lista fechada: migra valores válidos e descarta qualquer conteúdo/ chave desconhecida.
  for (const key of Object.keys(DEFAULT_PREFERENCES)) {
    if (
      key === 'version' ||
      (key === 'localModel' && (value.version as number) < 5) ||
      (key === 'engine' && (value.version as number) < 5) ||
      (key === 'chromePortuguesePrompt' && (value.version as number) < 4) ||
      value.version === 1 ||
      (value.version === 2 && key !== 'profile')
    )
      continue;
    const patch = { [key]: value[key] };
    if (isPreferencePatch(patch)) Object.assign(result, patch);
  }
  return result;
}
