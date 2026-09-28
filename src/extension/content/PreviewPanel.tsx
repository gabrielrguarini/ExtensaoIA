import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import type { PreviewSession } from './preview-session';

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
  if (state.kind === 'closed') return null;
  return (
    <section
      ref={panel}
      className="preview-panel"
      role="dialog"
      aria-labelledby="writing-preview-title"
    >
      <div className="preview-heading">
        <h2 id="writing-preview-title">
          {state.kind === 'menu' ? 'Assistente de escrita' : 'Prévia da sugestão'}
        </h2>
        <span className="simulation">Simulação · sem IA</span>
      </div>
      {state.kind === 'menu' && (
        <>
          <p>
            Experimente visualizar e aplicar uma sugestão. Este teste apenas acrescenta
            “[Simulação]” ao seu texto; não faz correções.
          </p>
          <button
            type="button"
            className="primary"
            onClick={(event) => {
              if (event.isTrusted) session.start();
            }}
          >
            Criar prévia simulada
          </button>
        </>
      )}
      {state.kind === 'loading' && <p role="status">Preparando prévia simulada…</p>}
      {state.kind === 'notice' && <p role="alert">{state.message}</p>}
      {state.kind === 'preview' && (
        <>
          <p>
            Revise o texto. Substituir confirma a troca do rascunho; nenhuma mensagem será enviada.
          </p>
          <pre aria-label="Texto da sugestão" tabIndex={0}>
            {state.text}
          </pre>
          {!state.canReplace && (
            <p className="copy-only">
              Somente cópia: textos com várias linhas, estruturas especiais ou editores sem suporte
              não permitem substituição segura. Confira menções e formatação ao colar.
            </p>
          )}
          <div className="preview-actions">
            <button
              type="button"
              className="primary"
              disabled={!state.canReplace || !!state.busy}
              onClick={(event) => {
                if (event.isTrusted) void session.replace();
              }}
            >
              {state.busy === 'replace' ? 'Substituindo…' : 'Substituir'}
            </button>
            <button
              type="button"
              disabled={!!state.busy}
              onClick={(event) => {
                if (event.isTrusted) void session.copy();
              }}
            >
              {state.busy === 'copy' ? 'Copiando…' : 'Copiar'}
            </button>
          </div>
          <p className="feedback" role="status">
            {state.message}
          </p>
        </>
      )}
      <button
        type="button"
        onClick={(event) => {
          if (event.isTrusted) onClose();
        }}
      >
        Cancelar
      </button>
    </section>
  );
}
