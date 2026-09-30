import { PREFERENCES_KEY, parsePreferences } from '../../shared/preferences';
import type {
  PreferenceCommand,
  PreferencePatch,
  WritingPreferences,
} from '../../shared/preferences';
import { record } from '../../shared/protocol';

export interface PreferenceStore {
  read(): Promise<WritingPreferences>;
  setSemanticReview(value: boolean): Promise<WritingPreferences>;
  setProfile(value: WritingPreferences['profile']): Promise<WritingPreferences>;
  update?(patch: PreferencePatch): Promise<WritingPreferences>;
  subscribe?(listener: (value: WritingPreferences) => void): () => void;
}

function request(command: PreferenceCommand): Promise<WritingPreferences> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(command, (response: unknown) => {
      if (chrome.runtime.lastError) {
        reject(new Error('Preferências indisponíveis.'));
        return;
      }
      if (!record(response) || response.version !== 3) {
        reject(new Error('Preferências indisponíveis.'));
        return;
      }
      try {
        resolve(parsePreferences(response));
      } catch {
        reject(new Error('Preferências inválidas.'));
      }
    });
  });
}

export const preferenceStore: PreferenceStore = {
  read: () => request({ target: 'preferences', type: 'get' }),
  setSemanticReview: (semanticReview) =>
    request({ target: 'preferences', type: 'set', semanticReview }),
  setProfile: (profile) => request({ target: 'preferences', type: 'profile', profile }),
  update: (patch) => request({ target: 'preferences', type: 'update', patch }),
  subscribe: (listener) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) return () => undefined;
    const changed = (changes: Record<string, chrome.storage.StorageChange>, area: string): void => {
      if (area !== 'local' || !changes[PREFERENCES_KEY]) return;
      try {
        listener(parsePreferences(changes[PREFERENCES_KEY].newValue));
      } catch {
        // Uma preferência inválida será recusada pelo coordenador no próximo pedido.
      }
    };
    chrome.storage.onChanged.addListener(changed);
    return () => chrome.storage.onChanged.removeListener(changed);
  },
};
