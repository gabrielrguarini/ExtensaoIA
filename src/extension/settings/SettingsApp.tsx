import { useEffect, useRef, useState } from 'react';
import { DEFAULT_PREFERENCES } from '../../shared/preferences';
import type { PreferencePatch } from '../../shared/preferences';
import { preferenceStore } from '../content/preferences-client';
import { PreferenceFields } from './PreferenceFields';
import { ChromePreparation } from './ChromePreparation';
import { SelectedModelControls } from './SelectedModelControls';

export function SettingsApp() {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(true);
  const [message, setMessage] = useState('Lendo preferências…');
  const [error, setError] = useState('');
  const [windowId, setWindowId] = useState<number>();
  const preferenceRevision = useRef(0);
  const popup = location.pathname.endsWith('/popup.html');
  useEffect(() => {
    let active = true;
    const revision = preferenceRevision.current;
    const unsubscribe = preferenceStore.subscribe?.((value) => {
      preferenceRevision.current++;
      if (active) setPreferences(value);
    });
    void preferenceStore.read().then(
      (value) => {
        if (active) {
          if (revision === preferenceRevision.current) setPreferences(value);
          setPending(false);
          setLoaded(true);
          setMessage('');
        }
      },
      () => {
        if (active) {
          setError('Não foi possível ler suas preferências. Reabra as configurações.');
        }
      },
    );
    void chrome.windows.getCurrent().then((value) => {
      if (active) setWindowId(value.id);
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
  }, [preferences.theme]);
  async function save(patch: PreferencePatch) {
    if (pending) return;
    const focused = document.activeElement;
    const revision = preferenceRevision.current;
    setPending(true);
    setError('');
    try {
      const saved = await preferenceStore.update!(patch);
      if (revision === preferenceRevision.current) setPreferences(saved);
      setMessage('Preferências salvas.');
    } catch {
      setError('Não foi possível salvar. Tente novamente.');
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
    <main className="settings-shell">
      <header>
        <h1>Configurações</h1>
        <p>Escolha a IA e como o botão IA deve escrever.</p>
      </header>
      <PreferenceFields
        value={preferences}
        disabled={pending}
        onChange={(patch) => {
          void save(patch);
        }}
      >
        {loaded &&
          (preferences.engine === 'chrome-preferred' ? (
            <ChromePreparation visiblePanel={!popup} action={preferences.defaultAction} />
          ) : (
            <SelectedModelControls preferences={preferences} visiblePanel={!popup} />
          ))}
      </PreferenceFields>
      {popup && (
        <button
          className="panel-link"
          disabled={windowId === undefined}
          onClick={(event) => {
            if (!event.isTrusted || windowId === undefined) return;
            void chrome.sidePanel.open({ windowId }).then(
              () => setMessage('Painel aberto.'),
              () => setError('Clique novamente para abrir o painel.'),
            );
          }}
        >
          Abrir painel lateral
        </button>
      )}
      <footer className="privacy-note">
        <p>
          Seus textos são processados neste computador. A IA pode substituir o rascunho; nenhuma
          mensagem é enviada automaticamente.
        </p>
        <a href="NOTICE.txt" target="_blank" rel="noopener noreferrer">
          Licenças e informações legais
        </a>
      </footer>
      {message && (
        <p className="settings-status" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="settings-error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
