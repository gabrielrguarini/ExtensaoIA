import { WRITING_ACTIONS, isWritingAction } from './actions';
import type { WritingAction } from './actions';
import { fields, record } from './protocol';

export interface NativeActionStatus {
  action: WritingAction | 'semantic-review';
  availability: Availability | null;
}
export interface ChromeStatus {
  ok: true;
  language: 'pt-BR';
  chromePortuguesePrompt: boolean;
  actions: NativeActionStatus[];
  sessionReady: boolean;
}
export type ChromeCommand = { target: 'chrome-ai'; type: 'status' | 'unload' };
export function isChromeCommand(value: unknown): value is ChromeCommand {
  return (
    record(value) &&
    fields(value, ['target', 'type']) &&
    value.target === 'chrome-ai' &&
    (value.type === 'status' || value.type === 'unload')
  );
}
export function isChromeStatus(value: unknown): value is ChromeStatus {
  return (
    record(value) &&
    fields(value, ['ok', 'language', 'chromePortuguesePrompt', 'actions', 'sessionReady']) &&
    value.ok === true &&
    value.language === 'pt-BR' &&
    typeof value.chromePortuguesePrompt === 'boolean' &&
    typeof value.sessionReady === 'boolean' &&
    Array.isArray(value.actions) &&
    value.actions.length === WRITING_ACTIONS.length + 1 &&
    new Set(value.actions.map((item: unknown) => (record(item) ? item.action : null))).size ===
      value.actions.length &&
    value.actions.every(
      (item: unknown) =>
        record(item) &&
        fields(item, ['action', 'availability']) &&
        (isWritingAction(item.action) || item.action === 'semantic-review') &&
        (item.availability === null ||
          (typeof item.availability === 'string' &&
            ['unavailable', 'downloadable', 'downloading', 'available'].includes(
              String(item.availability),
            ))),
    )
  );
}
