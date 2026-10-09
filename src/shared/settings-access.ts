import { fields, record } from './protocol';

export const SETTINGS_ACCESS_KEY = 'settingsAccess';
export interface SettingsAccess {
  version: 1;
  openInPanel: boolean;
}
export const DEFAULT_SETTINGS_ACCESS: SettingsAccess = { version: 1, openInPanel: true };
export function parseSettingsAccess(value: unknown): SettingsAccess {
  return record(value) && value.version === 1 && typeof value.openInPanel === 'boolean'
    ? { version: 1, openInPanel: value.openInPanel }
    : { ...DEFAULT_SETTINGS_ACCESS };
}
export type SettingsAccessCommand =
  | { target: 'settings-access'; type: 'get' }
  | { target: 'settings-access'; type: 'update'; openInPanel: boolean };
export function isSettingsAccessCommand(value: unknown): value is SettingsAccessCommand {
  return (
    record(value) &&
    value.target === 'settings-access' &&
    ((fields(value, ['target', 'type']) && value.type === 'get') ||
      (fields(value, ['target', 'type', 'openInPanel']) &&
        value.type === 'update' &&
        typeof value.openInPanel === 'boolean'))
  );
}
