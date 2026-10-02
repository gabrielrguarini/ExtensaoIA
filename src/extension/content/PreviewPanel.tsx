import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import type { PreviewSession } from './preview-session';
import { localChoice } from '../ai/local-choice';
import { writingAction } from '../../shared/actions';

export function PreviewPanel({
  session,
  onClose,
}: {
  session: PreviewSession;
  onClose: () => void;
}) {
  const state = useSyncExternalStore(session.subscribe, session.getState);
  const panel = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (state.kind !== 'closed')
      panel.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }, [state.kind]);
  if (state.kind === 'closed' || session.isDirect()) return null;
  const choice =
    state.kind === 'download-confirm' ? localChoice(state.profile, state.variant) : null;
  return (
    <section
      ref={panel}
      className="preview-panel"
      role="dialog"
      aria-labelledby="writing-preview-title"
    >
      <div className="preview-heading">
        <h2 id="writing-preview-title">Sugestão</h2>
        {(state.kind === 'action-loading' || (state.kind === 'preview' && state.action)) && (
          <span>{writingAction(state.action!).label}</span>
        )}
      </div>
      {(state.kind === 'preparing-action' || state.kind === 'menu') && (
        <p role="status">Preparando sua ação…</p>
      )}
      {state.kind === 'download-confirm' && (
        <div>
          <p>
            A IA precisa de um download de até{' '}
            {choice ? (choice.downloadBytes / 1e9).toFixed(2) : '—'} GB para funcionar neste
            computador. Seu rascunho será mantido.
          </p>
          <button
            className="primary"
            onClick={(event) => {
              if (event.isTrusted) session.confirmDownload();
            }}
          >
            Baixar e continuar
          </button>
        </div>
      )}
      {state.kind === 'action-loading' && (
        <>
          <p role="status">
            {state.progress.phase === 'downloading'
              ? 'Baixando IA… ' + state.progress.percent + '%'
              : state.progress.phase === 'loading'
                ? 'Carregando IA… ' + state.progress.percent + '%'
                : state.progress.phase === 'generating'
                  ? 'Escrevendo sugestão…'
                  : 'Preparando sugestão…'}
          </p>
          {!!state.partial && (
            <pre
              className="streaming-preview"
              aria-label="Texto em geração"
              aria-live="off"
              tabIndex={0}
            >
              {state.partial}
            </pre>
          )}
        </>
      )}
      {state.kind === 'notice' && <p role="alert">{state.message}</p>}
      {state.kind === 'preview' && (
        <>
          <pre aria-label="Texto da sugestão" tabIndex={0}>
            {state.text}
          </pre>
          <p className="review-note">Revise o texto antes de usar a sugestão.</p>
          {state.status === 'unchanged' && <p role="status">Sem alterações.</p>}
          {!state.canReplace && (
            <p className="copy-only">
              Use Copiar e cole no rascunho. Confira as menções e a formatação.
            </p>
          )}
          <div className="preview-actions">
            <button
              className="primary"
              disabled={!state.canReplace || !!state.busy}
              onClick={(event) => {
                if (event.isTrusted) void session.replace();
              }}
            >
              {state.busy === 'replace' ? 'Substituindo…' : 'Substituir'}
            </button>
            <button
              disabled={!!state.busy}
              onClick={(event) => {
                if (event.isTrusted) void session.copy();
              }}
            >
              {state.busy === 'copy' ? 'Copiando…' : 'Copiar'}
            </button>
          </div>
          {state.message && (
            <p className="feedback" role="status">
              {state.message}
            </p>
          )}
        </>
      )}
      <button
        className="dismiss"
        onClick={(event) => {
          if (event.isTrusted) onClose();
        }}
      >
        {state.kind === 'preview' || state.kind === 'notice' ? 'Fechar' : 'Cancelar'}
      </button>
    </section>
  );
}
