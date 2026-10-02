import { useEffect, useRef, useState } from 'react';
import { WRITING_ACTIONS } from '../../shared/actions';
import type { AvailabilityQuery } from '../../shared/suggestion';
import type { ChromeStatus, NativeActionStatus } from '../../shared/chrome-management';
import { createNative, nativeAvailability, nativeConfig } from '../ai/chrome-api';
import { chromeStatus, unloadChrome } from './chrome-client';

const ACTIONS = WRITING_ACTIONS.map(({ id, label }) => ({ action: id, label }));
function stateLabel(value: Availability | null | undefined): string {
  switch (value) {
    case 'available':
      return 'Disponível';
    case 'downloadable':
      return 'Exige preparação e download';
    case 'downloading':
      return 'Download em andamento';
    case 'unavailable':
      return 'Indisponível para esta ação e pt-BR';
    case null:
      return 'Consulta sem resposta ou opções não aceitas';
    default:
      return 'A verificar';
  }
}
export function ChromePreparation({
  visiblePanel,
  portuguesePrompt,
}: {
  visiblePanel: boolean;
  portuguesePrompt: boolean;
}) {
  const [visible, setVisible] = useState<NativeActionStatus[]>([]);
  const [offscreen, setOffscreen] = useState<ChromeStatus>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const revision = useRef(0);
  const controller = useRef<AbortController | undefined>(undefined);
  useEffect(() => {
    revision.current++;
    controller.current?.abort();
    controller.current = undefined;
    setVisible([]);
    setOffscreen(undefined);
    setBusy(false);
    setMessage('');
    setError('');
    return () => {
      revision.current++;
      controller.current?.abort();
    };
  }, [portuguesePrompt]);
  function query(action: AvailabilityQuery['action']): AvailabilityQuery {
    return { action, language: 'pt-BR', chromePortuguesePrompt: portuguesePrompt };
  }
  async function refresh() {
    const current = ++revision.current;
    setBusy(true);
    setError('');
    try {
      const [local, remote] = await Promise.all([
        Promise.all(
          ACTIONS.map(async ({ action }) => ({
            action,
            availability: await nativeAvailability(nativeConfig(query(action))).catch(() => null),
          })),
        ),
        chromeStatus(),
      ]);
      if (revision.current !== current) return;
      if (remote.chromePortuguesePrompt !== portuguesePrompt)
        throw new Error('A configuração mudou. Consulte novamente a disponibilidade.');
      setVisible(local);
      setOffscreen(remote);
      setMessage('Disponibilidade consultada no painel e no documento de inferência.');
    } catch (cause) {
      if (revision.current === current)
        setError(cause instanceof Error ? cause.message : 'Consulta indisponível.');
    } finally {
      if (revision.current === current) setBusy(false);
    }
  }
  function prepare(query: AvailabilityQuery) {
    if (
      busy ||
      !visiblePanel ||
      document.visibilityState !== 'visible' ||
      !navigator.userActivation.isActive
    )
      return;
    const current = ++revision.current;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError('');
    setMessage('Preparando IA do Chrome. O download pode levar alguns minutos.');
    // create é executado diretamente neste gesto, antes de mensagens/awaits.
    const pending = createNative(nativeConfig(query), {
      signal: abort.signal,
      monitor: (monitor) =>
        monitor.addEventListener('downloadprogress', (event) => {
          if (revision.current === current && !abort.signal.aborted)
            setMessage(
              `Preparando IA do Chrome: ${Math.round(Math.min(1, Math.max(0, event.loaded)) * 100)}%.`,
            );
        }),
    });
    void pending
      .then(async (session) => {
        session.destroy();
        if (revision.current !== current || abort.signal.aborted) return;
        const result = await chromeStatus();
        if (revision.current !== current || abort.signal.aborted) return;
        setOffscreen(result);
        setVisible((old) =>
          old.map((item) =>
            item.action === query.action ? { ...item, availability: 'available' } : item,
          ),
        );
        const available = result.actions.find(
          ({ action }) => action === query.action,
        )?.availability;
        setMessage(
          available === 'available'
            ? 'Preparação concluída e confirmada no documento de inferência. Faça uma nova ação no editor.'
            : 'Preparado no painel, mas indisponível no documento de inferência. O modelo local será usado.',
        );
      })
      .catch((cause: unknown) => {
        if (revision.current !== current) return;
        setError(
          abort.signal.aborted
            ? 'Preparação cancelada.'
            : cause instanceof DOMException && cause.name === 'NotSupportedError'
              ? 'O Chrome não aceitou pt-BR ou as opções desta ação.'
              : 'Não foi possível preparar a IA do Chrome. Atualize o estado para tentar novamente.',
        );
      })
      .finally(() => {
        if (revision.current === current) {
          setBusy(false);
          controller.current = undefined;
        }
      });
  }
  return (
    <section aria-labelledby="chrome-ai-title">
      <h2 id="chrome-ai-title">IA nativa do Chrome · pt-BR</h2>
      {portuguesePrompt && (
        <p>Português por prompt experimental ativado. Revise o idioma e o conteúdo.</p>
      )}
      <p>
        A disponibilidade depende da versão, idioma, ação e recursos deste navegador. O Chrome
        administra modelo e execução por CPU ou GPU. Os textos são processados localmente.
      </p>
      <p>
        Downloads só começam por Preparar no painel lateral visível. Se Chrome não estiver pronto no
        documento de inferência, usamos o modelo local selecionado antes de gerar.
      </p>
      {!visiblePanel && <p>Abra o painel lateral para preparar a IA nativa.</p>}
      <button
        disabled={busy}
        onClick={(event) => {
          if (event.isTrusted) void refresh();
        }}
      >
        Verificar IA do Chrome
      </button>
      <ul>
        {ACTIONS.map(({ action, label }) => {
          const state = visible.find((item) => item.action === action)?.availability;
          const remote = offscreen?.actions.find((item) => item.action === action)?.availability;
          return (
            <li key={action}>
              <strong>
                {label} · {nativeConfig(query(action)).api}
              </strong>
              <p>
                Painel: {stateLabel(state)}. Inferência: {stateLabel(remote)}.
              </p>
              <button
                disabled={
                  busy ||
                  !visiblePanel ||
                  state === undefined ||
                  state === null ||
                  state === 'unavailable'
                }
                onClick={(event) => {
                  if (event.isTrusted) prepare(query(action));
                }}
              >
                Preparar {label}
              </button>
            </li>
          );
        })}
      </ul>
      {controller.current && (
        <button
          onClick={(event) => {
            if (event.isTrusted) controller.current?.abort();
          }}
        >
          Cancelar preparação
        </button>
      )}
      <p>
        As sessões também são liberadas após cinco minutos sem uso. Liberar sessões mantém os
        artefatos administrados pelo Chrome; remover o cache WebLLM não apaga esses artefatos.
      </p>
      <button
        disabled={busy || !offscreen}
        onClick={(event) => {
          if (!event.isTrusted) return;
          setBusy(true);
          void unloadChrome()
            .then(
              () => {
                setMessage('Sessões nativas liberadas. Artefatos do Chrome preservados.');
                setOffscreen((old) => (old ? { ...old, sessionReady: false } : old));
              },
              () => setError('Não foi possível liberar sessões.'),
            )
            .finally(() => setBusy(false));
        }}
      >
        Liberar sessões do Chrome
      </button>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
