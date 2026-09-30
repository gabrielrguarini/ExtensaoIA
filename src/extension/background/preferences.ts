import { PREFERENCES_KEY, parsePreferences } from '../../shared/preferences';
import type { WritingPreferences } from '../../shared/preferences';

export async function readPreferences(): Promise<WritingPreferences> {
  const stored = await chrome.storage.local.get(PREFERENCES_KEY);
  return parsePreferences(stored[PREFERENCES_KEY]);
}

let pendingWrite: Promise<unknown> = Promise.resolve();

function updatePreferences(
  change: Partial<Omit<WritingPreferences, 'version'>>,
): Promise<WritingPreferences> {
  const operation = pendingWrite.then(async () => {
    const current = await readPreferences();
    const preferences: WritingPreferences = { ...current, ...change };
    await chrome.storage.local.set({ [PREFERENCES_KEY]: preferences });
    return preferences;
  });
  pendingWrite = operation.catch(() => undefined);
  return operation;
}

export async function saveSemanticReview(semanticReview: boolean): Promise<WritingPreferences> {
  return updatePreferences({ semanticReview });
}

export async function saveProfile(
  profile: WritingPreferences['profile'],
): Promise<WritingPreferences> {
  return updatePreferences({ profile });
}
