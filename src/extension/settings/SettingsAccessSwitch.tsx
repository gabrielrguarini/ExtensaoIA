import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_SETTINGS_ACCESS,
  SETTINGS_ACCESS_KEY,
  parseSettingsAccess,
} from '../../shared/settings-access';
import type { SettingsAccess, SettingsAccessCommand } from '../../shared/settings-access';
import { record } from '../../shared/protocol';
import { Switch, trustedSwitchEvent } from './Switch';

function request(command: SettingsAccessCommand): Promise<SettingsAccess> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(command, (response: unknown) => {
      if (
        chrome.runtime.lastError ||
        !record(response) ||
        response.version !== 1 ||
        typeof response.openInPanel !== 'boolean'
      ) {
        reject(new Error('SETTINGS_ACCESS_UNAVAILABLE'));
        return;
      }
      resolve(parseSettingsAccess(response));
    });
  });
}
export function SettingsAccessSwitch() {
  const [value, setValue] = useState(DEFAULT_SETTINGS_ACCESS);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState('');
  const revision = useRef(0);
  useEffect(() => {
    let active = true;
    const current = revision.current;
    const changed = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (active && area === 'local' && changes[SETTINGS_ACCESS_KEY]) {
        revision.current++;
        setValue(parseSettingsAccess(changes[SETTINGS_ACCESS_KEY].newValue));
      }
    };
    chrome.storage.onChanged.addListener(changed);
    void request({ target: 'settings-access', type: 'get' }).then(
      (next) => {
        if (!active) return;
        if (current === revision.current) setValue(next);
        setPending(false);
      },
      () => {
        if (active) setError('Não foi possível ler a abertura padrão. Reabra as configurações.');
      },
    );
    return () => {
      active = false;
      chrome.storage.onChanged.removeListener(changed);
    };
  }, []);
  async function save(openInPanel: boolean) {
    if (pending) return;
    const focused = document.activeElement;
    const current = revision.current;
    setPending(true);
    setError('');
    try {
      const next = await request({ target: 'settings-access', type: 'update', openInPanel });
      if (current === revision.current) setValue(next);
    } catch {
      setError('Não foi possível alterar a abertura padrão. Tente novamente.');
    } finally {
      setPending(false);
      requestAnimationFrame(() => {
        if (
          focused instanceof HTMLElement &&
          focused.isConnected &&
          document.activeElement === document.body
        )
          focused.focus();
      });
    }
  }
  return (
    <>
      <label className="switch-label">
        <span>Abrir configurações no painel lateral</span>
        <Switch
          aria-label="Abrir configurações no painel lateral"
          checked={value.openInPanel}
          disabled={pending}
          onCheckedChange={(checked, details) => {
            if (trustedSwitchEvent(details.event)) void save(checked);
          }}
        />
      </label>
      <p className="field-hint">
        {value.openInPanel
          ? 'O ícone da extensão abre o painel lateral.'
          : 'O ícone da extensão abre o popup.'}{' '}
        A escolha vale no próximo clique.
      </p>
      {error && (
        <p role="alert" className="settings-error">
          {error}
        </p>
      )}
    </>
  );
}
