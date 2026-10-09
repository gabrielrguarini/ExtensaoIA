import { useEffect, useRef, useState } from 'react';
import type { WritingAction } from '../../shared/actions';
import type { AvailabilityQuery } from '../../shared/suggestion';
import { createNative, nativeConfig } from '../ai/chrome-api';
import { selectNativeQuery } from '../ai/native-choice';
import { chromeStatus } from './chrome-client';

export function ChromePreparation({
  visiblePanel,
  action,
}: {
  visiblePanel: boolean;
  action: WritingAction;
}) {
  const [selected, setSelected] = useState<Awaited<ReturnType<typeof selectNativeQuery>>>();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Verificando disponibilidade…');
  const [error, setError] = useState('');
  const revision = useRef(0);
  const controller = useRef<AbortController | undefined>(undefined);
  useEffect(() => {
    const current = ++revision.current;
    setSelected(undefined);
    setReady(false);
    setBusy(false);
    setError('');
    setMessage('Verificando disponibilidade…');
    void Promise.all([selectNativeQuery({ action, language: 'pt-BR' }), chromeStatus()]).then(
      ([local, remote]) => {
        if (current !== revision.current) return;
        setSelected(local);
        const usable =
          local.availability.state === 'ready' &&
          remote.actions.find((item) => item.action === action)?.availability === 'available';
        setReady(usable);
        setMessage(
          usable
            ? 'Pronta para a ação escolhida.'
            : local.availability.state === 'unavailable'
              ? 'Indisponível neste navegador. Usaremos o modelo alternativo.'
              : 'Prepare a IA antes de usar. O download pode levar alguns minutos.',
        );
      },
      () => {
        if (current === revision.current)
          setError('Não foi possível verificar. Reabra as configurações para tentar novamente.');
      },
    );
    return () => {
      revision.current++;
      controller.current?.abort();
      controller.current = undefined;
    };
  }, [action]);
  function prepare(query: AvailabilityQuery) {
    if (
      busy ||
      !visiblePanel ||
      document.visibilityState !== 'visible' ||
      !navigator.userActivation.isActive
    )
      return;
    const current = revision.current;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError('');
    setMessage('Preparando IA…');
    // Create no gesto visível, sem await anterior e com as opções consultadas.
    const pending = createNative(nativeConfig(query), {
      signal: abort.signal,
      monitor: (monitor) =>
        monitor.addEventListener('downloadprogress', (event) => {
          if (current === revision.current && !abort.signal.aborted)
            setMessage(
              'Baixando IA… ' + Math.round(Math.min(1, Math.max(0, event.loaded)) * 100) + '%',
            );
        }),
    });
    void pending
      .then(async (session) => {
        session.destroy();
        if (current !== revision.current || abort.signal.aborted) return;
        const status = await chromeStatus();
        if (current !== revision.current || abort.signal.aborted) return;
        const usable =
          status.actions.find((item) => item.action === action)?.availability === 'available';
        setReady(usable);
        setMessage(
          usable
            ? 'Pronta. Clique em IA no WhatsApp para usar.'
            : 'A IA do navegador ainda está indisponível. Usaremos o modelo alternativo.',
        );
      })
      .catch(() => {
        if (current === revision.current)
          setError(
            abort.signal.aborted
              ? 'Preparação cancelada.'
              : 'Não foi possível preparar. Reabra as configurações para tentar novamente.',
          );
      })
      .finally(() => {
        if (current === revision.current) {
          controller.current = undefined;
          setBusy(false);
        }
      });
  }
  return (
    <section className="preparation-card" aria-labelledby="chrome-ai-title">
      <h3 id="chrome-ai-title">Preparar IA Nativa</h3>
      <p role="status">{message}</p>
      {!ready && selected && selected.availability.state !== 'unavailable' && (
        <>
          {!visiblePanel && <p>Abra o painel lateral para preparar a IA.</p>}
          <button
            className="primary"
            disabled={busy || !visiblePanel}
            onClick={(e) => {
              if (e.isTrusted) prepare(selected.query);
            }}
          >
            Preparar IA
          </button>
        </>
      )}
      {busy && (
        <button
          onClick={(e) => {
            if (e.isTrusted) controller.current?.abort();
          }}
        >
          Cancelar preparação
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
