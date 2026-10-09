import {
  DEFAULT_SETTINGS_ACCESS,
  SETTINGS_ACCESS_KEY,
  parseSettingsAccess,
} from '../../shared/settings-access';
import type { SettingsAccess } from '../../shared/settings-access';

export class SettingsAccessController {
  private pending: Promise<unknown> = Promise.resolve();
  async read(): Promise<SettingsAccess> {
    const stored = await chrome.storage.local.get(SETTINGS_ACCESS_KEY);
    return parseSettingsAccess(stored[SETTINGS_ACCESS_KEY]);
  }
  private async configure(openInPanel: boolean): Promise<void> {
    // O popup atual permanece aberto; a escolha vale no próximo clique no ícone.
    if (openInPanel) {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
      await chrome.action.setPopup({ popup: '' });
    } else {
      await chrome.action.setPopup({ popup: 'popup.html' });
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
    }
  }
  private enqueue(operation: () => Promise<SettingsAccess>): Promise<SettingsAccess> {
    const result = this.pending.then(operation);
    this.pending = result.catch(() => undefined);
    return result;
  }
  initialize(): Promise<SettingsAccess> {
    return this.enqueue(async () => {
      const preferences = await this.read();
      await this.configure(preferences.openInPanel);
      return preferences;
    });
  }
  update(openInPanel: boolean): Promise<SettingsAccess> {
    return this.enqueue(async () => {
      const previous = await this.read();
      const next: SettingsAccess = { ...DEFAULT_SETTINGS_ACCESS, openInPanel };
      try {
        await this.configure(openInPanel);
        await chrome.storage.local.set({ [SETTINGS_ACCESS_KEY]: next });
        return next;
      } catch (error) {
        await this.configure(previous.openInPanel).catch(() => undefined);
        throw error;
      }
    });
  }
}
