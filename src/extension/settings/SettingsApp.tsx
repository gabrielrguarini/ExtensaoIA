import { useEffect, useRef, useState } from 'react';
import { DEFAULT_PREFERENCES } from '../../shared/preferences';
import type { PreferencePatch } from '../../shared/preferences';
import { preferenceStore } from '../content/preferences-client';
import { PreferenceFields } from './PreferenceFields';
import { MODEL_CHOICES, PROFILE_LABELS } from '../ai/model-catalog';
import { probeHardware } from '../content/model-hardware';
import { manageModel } from './model-client';
import type { ModelStatus } from '../../shared/model-management';

export function SettingsApp() {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [pending, setPending] = useState(true);
  const [message, setMessage] = useState('Lendo preferências…');
  const [error, setError] = useState('');
  const [windowId, setWindowId] = useState<number>();
  const [variant, setVariant] = useState<'q4f16_1' | 'q4f32_1'>('q4f16_1');
  const [status, setStatus] = useState<ModelStatus>();
  const [checking, setChecking] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const epoch = useRef(0);
  const preferenceRevision = useRef(0);
  const confirmation = useRef<HTMLButtonElement>(null);
  const removeButton = useRef<HTMLButtonElement>(null);
  const choice = MODEL_CHOICES[preferences.profile][variant];
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
          setMessage('Preferências salvas somente neste navegador.');
        }
      },
      () => {
        if (active) {
          setPending(false);
          setError('Preferências indisponíveis. Reabra esta interface.');
        }
      },
    );
    void chrome.windows.getCurrent().then((value) => {
      if (active) setWindowId(value.id);
    });
    void probeHardware().then((value) => {
      if (active && value.state === 'available')
        setVariant(value.shaderF16 ? 'q4f16_1' : 'q4f32_1');
    });
    return () => {
      active = false;
      epoch.current++;
      unsubscribe?.();
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
  }, [preferences.theme]);
  useEffect(() => {
    epoch.current++;
    setStatus(undefined);
    setChecking(false);
    setConfirmRemove(false);
  }, [preferences.profile, variant]);
  useEffect(() => {
    if (confirmRemove) confirmation.current?.focus();
  }, [confirmRemove]);
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
  async function model(type: 'status' | 'unload' | 'remove') {
    const current = ++epoch.current;
    setChecking(true);
    setError('');
    try {
      const result = await manageModel(
        type === 'unload'
          ? { target: 'model-cache', type }
          : { target: 'model-cache', type, profile: preferences.profile, variant },
      );
      if (current !== epoch.current) return;
      if ('cached' in result) {
        setStatus(result);
        setMessage('Estado verificado agora. Atualize após usar a IA no editor.');
      } else {
        setStatus(undefined);
        setMessage(
          type === 'unload'
            ? 'Memória da GPU liberada. Arquivos do modelo continuam no navegador. Pedidos ativos foram cancelados.'
            : 'Artefatos da variante selecionada apagados. Preferências preservadas. O próximo uso exigirá confirmação de download.',
        );
      }
    } catch (cause) {
      if (current === epoch.current)
        setError(cause instanceof Error ? cause.message : 'Operação indisponível.');
    } finally {
      if (current === epoch.current) {
        setChecking(false);
        setConfirmRemove(false);
        if (type === 'remove') removeButton.current?.focus();
      }
    }
  }
  return (
    <main>
      <h1>IA local · Configurações</h1>
      <p>A prévia, a cópia e a substituição ficam junto ao campo de escrita do WhatsApp.</p>
      {popup && (
        <button
          disabled={windowId === undefined}
          onClick={(event) => {
            if (!event.isTrusted || windowId === undefined) return;
            // Chamada direta no gesto: nenhuma mensagem ou await antes de open.
            void chrome.sidePanel.open({ windowId }).then(
              () => setMessage('Painel lateral aberto.'),
              () => setError('Clique novamente para abrir o painel lateral.'),
            );
          }}
        >
          Abrir painel lateral
        </button>
      )}
      <PreferenceFields
        value={preferences}
        disabled={pending}
        onChange={(patch) => {
          void save(patch);
        }}
      />
      <section aria-labelledby="privacy-title">
        <h2 id="privacy-title">Privacidade local obrigatória</h2>
        <p>
          A inferência roda nesta máquina. Textos, prompts, respostas, contatos e histórico não são
          salvos nem enviados a serviços de IA. Não há análise de uso.
        </p>
        <p>
          Somente preferências ficam no armazenamento local da extensão. O download explícito dos
          pesos usa os repositórios do modelo; os arquivos ficam no cache do navegador. Nenhuma
          mensagem é enviada automaticamente.
        </p>
      </section>
      <section aria-labelledby="model-title">
        <h2 id="model-title">Modelo · {PROFILE_LABELS[preferences.profile]}</h2>
        <label>
          Variante do cache
          <select
            aria-label="Variante do cache"
            value={variant}
            disabled={checking}
            onChange={(e) => {
              if (e.nativeEvent.isTrusted) setVariant(e.currentTarget.value as typeof variant);
            }}
          >
            <option value="q4f16_1">q4f16_1 (shader-f16)</option>
            <option value="q4f32_1">q4f32_1 (sem shader-f16)</option>
          </select>
        </label>
        <p>{choice.id}</p>
        <p>
          Download: {(choice.downloadBytes / 1e9).toFixed(2)} GB. GPU estimada:{' '}
          {Math.ceil(choice.gpuMemoryEstimateMB)} MB. Contexto: {choice.contextTokens} tokens. VRAM
          livre: indisponível.
        </p>
        <p>
          Licença:{' '}
          <a
            href={
              preferences.profile === 'economico'
                ? 'licenses/LLAMA-3.2-LICENSE'
                : 'licenses/QWEN3-LICENSE'
            }
            target="_blank"
            rel="noopener noreferrer"
          >
            {choice.license}
          </a>{' '}
          ·{' '}
          <a href="NOTICE.txt" target="_blank" rel="noopener noreferrer">
            Avisos e atribuições
          </a>
        </p>
        <p aria-live="polite">
          Cache:{' '}
          {checking
            ? 'verificando…'
            : status
              ? status.cached
                ? 'completo e verificado'
                : 'ausente, incompleto ou inconsistente'
              : 'a verificar'}
          . Memória:{' '}
          {status
            ? status.runtime === 'released'
              ? 'GPU liberada'
              : status.runtime === 'loaded'
                ? `modelo carregado (${status.loadedProfile ? PROFILE_LABELS[status.loadedProfile] : '—'})`
                : status.runtime === 'loading'
                  ? 'carregando modelo'
                  : 'Worker pronto; modelo não carregado'
            : 'a verificar'}
          .
        </p>
        <button
          disabled={checking || pending}
          onClick={(e) => {
            if (e.isTrusted) void model('status');
          }}
        >
          Atualizar estado do modelo
        </button>
        <p>
          Liberar memória encerra o Worker e cancela pedidos ativos, mantendo os arquivos para o
          próximo uso. A memória também é liberada após cinco minutos sem uso.
        </p>
        <button
          disabled={checking}
          onClick={(e) => {
            if (e.isTrusted) void model('unload');
          }}
        >
          Liberar memória da GPU
        </button>
        <p>
          Apagar o cache remove apenas a variante e revisão selecionadas. O próximo uso exigirá novo
          download confirmado.
        </p>
        <button
          ref={removeButton}
          disabled={checking || pending}
          onClick={(e) => {
            if (e.isTrusted) setConfirmRemove(true);
          }}
        >
          Apagar arquivos do modelo
        </button>
        {confirmRemove && (
          <div role="group" aria-label="Confirmar remoção do cache">
            <p>
              Apagar {choice.id} ({variant})?
            </p>
            <button
              ref={confirmation}
              disabled={checking}
              onClick={(e) => {
                if (e.isTrusted) void model('remove');
              }}
            >
              Confirmar remoção
            </button>
            <button
              disabled={checking}
              onClick={(e) => {
                if (e.isTrusted) {
                  setConfirmRemove(false);
                  removeButton.current?.focus();
                }
              }}
            >
              Cancelar remoção
            </button>
          </div>
        )}
      </section>
      <p role="status">{message}</p>
      {error && <p role="alert">{error}</p>}
      <a href="diagnostic.html" target="_blank" rel="noopener noreferrer">
        Diagnóstico da comunicação simulada
      </a>
    </main>
  );
}
