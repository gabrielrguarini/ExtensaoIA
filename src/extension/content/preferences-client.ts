import { parsePreferences } from '../../shared/preferences';
import type { PreferenceCommand, WritingPreferences } from '../../shared/preferences';

export interface PreferenceStore {
  read(): Promise<WritingPreferences>;
  setSemanticReview(value: boolean): Promise<WritingPreferences>;
}

function request(command: PreferenceCommand): Promise<WritingPreferences> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(command, (response: unknown) => {
      if (chrome.runtime.lastError) {
        reject(new Error('Preferências indisponíveis.'));
        return;
      }
      if (response === undefined) {
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
};
