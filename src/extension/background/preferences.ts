import { PREFERENCES_KEY, parsePreferences } from '../../shared/preferences';
import type { WritingPreferences } from '../../shared/preferences';

export async function readPreferences(): Promise<WritingPreferences> {
  const stored = await chrome.storage.local.get(PREFERENCES_KEY);
  return parsePreferences(stored[PREFERENCES_KEY]);
}

export async function saveSemanticReview(semanticReview: boolean): Promise<WritingPreferences> {
  const preferences: WritingPreferences = { version: 1, semanticReview };
  await chrome.storage.local.set({ [PREFERENCES_KEY]: preferences });
  return preferences;
}
