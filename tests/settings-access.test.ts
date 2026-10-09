import { afterEach, describe, expect, it, vi } from 'vitest';
import { SettingsAccessController } from '../src/extension/background/settings-access';
import { isSettingsAccessCommand, parseSettingsAccess } from '../src/shared/settings-access';

afterEach(() => vi.unstubAllGlobals());
function fixture(initial?: unknown) {
  let stored = initial;
  const popup = vi.fn(() => Promise.resolve());
  const panel = vi.fn(() => Promise.resolve());
  const set = vi.fn((value: { settingsAccess: unknown }) => {
    stored = value.settingsAccess;
    return Promise.resolve();
  });
  vi.stubGlobal('chrome', {
    action: { setPopup: popup },
    sidePanel: { setPanelBehavior: panel },
    storage: { local: { get: () => Promise.resolve({ settingsAccess: stored }), set } },
  });
  return { controller: new SettingsAccessController(), popup, panel, set };
}
describe('abertura das configurações isolada das preferências de escrita', () => {
  it('usa painel como padrão e não aceita payloads abertos ou valores inválidos', () => {
    for (const value of [
      undefined,
      null,
      [],
      { version: 2, openInPanel: false },
      { version: 1, openInPanel: 'false' },
    ])
      expect(parseSettingsAccess(value)).toEqual({ version: 1, openInPanel: true });
    expect(parseSettingsAccess({ version: 1, openInPanel: false, text: 'fixture' })).toEqual({
      version: 1,
      openInPanel: false,
    });
    expect(isSettingsAccessCommand({ target: 'settings-access', type: 'get' })).toBe(true);
    expect(
      isSettingsAccessCommand({ target: 'settings-access', type: 'update', openInPanel: false }),
    ).toBe(true);
    for (const value of [
      { target: 'settings-access', type: 'get', text: 'fixture' },
      { target: 'settings-access', type: 'update', openInPanel: 0 },
      { target: 'settings-access', type: 'update', openInPanel: false, engine: 'local' },
    ])
      expect(isSettingsAccessCommand(value)).toBe(false);
  });
  it('configura o ícone no início e restaura a escolha salva sem gravar preferências de escrita', async () => {
    const { controller, popup, panel, set } = fixture();
    await controller.initialize();
    expect(popup).toHaveBeenLastCalledWith({ popup: '' });
    expect(panel).toHaveBeenLastCalledWith({ openPanelOnActionClick: true });
    expect(set).not.toHaveBeenCalled();
    await controller.update(false);
    expect(set).toHaveBeenLastCalledWith({ settingsAccess: { version: 1, openInPanel: false } });
    await new SettingsAccessController().initialize();
    expect(popup).toHaveBeenLastCalledWith({ popup: 'popup.html' });
    expect(panel).toHaveBeenLastCalledWith({ openPanelOnActionClick: false });
    expect(set).toHaveBeenCalledOnce();
  });
  it('serializa mudanças concorrentes e inicialização para que a última escolha vença', async () => {
    const { controller, popup, panel } = fixture();
    await Promise.all([controller.initialize(), controller.update(false), controller.update(true)]);
    expect(await controller.read()).toEqual({ version: 1, openInPanel: true });
    expect(popup).toHaveBeenLastCalledWith({ popup: '' });
    expect(panel).toHaveBeenLastCalledWith({ openPanelOnActionClick: true });
  });
  it('restaura a abertura anterior em falha de persistência e aceita nova tentativa', async () => {
    const { controller, popup, panel, set } = fixture({ version: 1, openInPanel: false });
    set.mockRejectedValueOnce(new Error('storage failure'));
    await expect(controller.update(true)).rejects.toThrow('storage failure');
    expect(await controller.read()).toEqual({ version: 1, openInPanel: false });
    expect(popup).toHaveBeenLastCalledWith({ popup: 'popup.html' });
    expect(panel).toHaveBeenLastCalledWith({ openPanelOnActionClick: false });
    await controller.update(true);
    expect(await controller.read()).toEqual({ version: 1, openInPanel: true });
  });
  it('não salva a escolha se o Chrome recusar a configuração do ícone', async () => {
    const { controller, popup, panel, set } = fixture();
    panel.mockRejectedValueOnce(new Error('browser failure'));
    await expect(controller.update(false)).rejects.toThrow('browser failure');
    expect(set).not.toHaveBeenCalled();
    expect(popup).toHaveBeenLastCalledWith({ popup: '' });
    expect(panel).toHaveBeenLastCalledWith({ openPanelOnActionClick: true });
  });
});
