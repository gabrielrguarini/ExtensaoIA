import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import type { PreviewSession } from './preview-session';
import { MODEL_DATA_BYTES } from '../../shared/model-proof';
import { WRITING_ACTIONS, writingAction } from '../../shared/actions';

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
        {(state.kind === 'loading' ||
          (state.kind === 'preview' && state.source === 'simulation')) && (
          <span className="simulation">Simulação · sem IA</span>
        )}
        {state.kind === 'preview' && state.source === 'action' && state.action && (
          <span>IA local · {writingAction(state.action).label}</span>
        )}
      </div>
      {state.kind === 'menu' && (
        <>
          <p>
            Escolha como revisar seu rascunho. A sugestão só será aplicada após sua confirmação.
          </p>
          <label className="semantic-setting">
            <input
              type="checkbox"
              checked={state.semanticReview}
              disabled={state.preferenceStatus !== 'ready'}
              onChange={(event) => {
                if (event.nativeEvent.isTrusted)
                  session.setSemanticReview(event.currentTarget.checked);
              }}
            />
            Revisão semântica adicional (mais lenta, desligada por padrão)
          </label>
          {state.preferenceStatus === 'loading' && <p role="status">Lendo preferência local...</p>}
          {state.preferenceStatus === 'saving' && <p role="status">Salvando preferência...</p>}
          {state.preferenceStatus === 'error' && (
            <p role="alert">Preferência indisponível. Feche e abra o menu para tentar novamente.</p>
          )}
          <div className="action-grid" role="group" aria-label="Ações de escrita com IA local">
            {WRITING_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                aria-label={`${action.label} com IA local`}
                disabled={state.preferenceStatus !== 'ready'}
                onClick={(event) => {
                  if (event.isTrusted) session.startAction(action.id);
                }}
              >
                <strong>{action.label}</strong>
                <small>{action.summary}</small>
              </button>
            ))}
          </div>
          <div className="model-proof">
            <h3>IA local · Built with Llama</h3>
            <p>
              As ações usam Llama 3.2 3B no seu computador. Se necessário, o navegador baixará
              aproximadamente {(MODEL_DATA_BYTES / 1_000_000_000).toFixed(2)} GB de dados do modelo;
              depois poderá aproveitar o cache. Seu rascunho não é enviado a servidores.
            </p>
            <p>
              Sem shader-f16, a variante q4f32_1 é usada e exige mais memória de GPU (estimativas do
              catálogo: 2.952 MB contra 2.264 MB). Isso não representa o tamanho do download.
            </p>
            <p>
              O modelo usa a{' '}
              <a
                href="https://dev.meta.ai/llama/llama3_2/license"
                target="_blank"
                rel="noopener noreferrer"
              >
                licença comunitária Llama 3.2
              </a>
              .
            </p>
            <p>A prova abaixo usa só uma frase sintética fixa e não lê nem altera seu rascunho.</p>
            <button
              type="button"
              onClick={(event) => {
                if (event.isTrusted) session.startModelProof();
              }}
            >
              Baixar modelo e testar IA local
            </button>
          </div>
          <p>Prévia de teste: acrescenta “[Simulação]” ao seu texto, sem fazer correções.</p>
          <button
            type="button"
            onClick={(event) => {
              if (event.isTrusted) session.start();
            }}
          >
            Criar prévia simulada
          </button>
        </>
      )}
      {state.kind === 'loading' && <p role="status">Preparando prévia simulada…</p>}
      {(state.kind === 'model-loading' || state.kind === 'action-loading') && (
        <p role="status">
          {state.progress.phase === 'preparing'
            ? 'Preparando IA local...'
            : state.progress.phase === 'downloading'
              ? `Baixando modelo... ${state.progress.percent}% da etapa atual`
              : state.progress.phase === 'loading'
                ? `Carregando GPU... ${state.progress.percent}% da etapa atual`
                : state.progress.phase === 'ready'
                  ? 'IA pronta.'
                  : state.progress.phase === 'validating'
                    ? 'Validando resposta...'
                    : state.progress.phase === 'reviewing'
                      ? 'Revisando significado com IA local...'
                      : state.kind === 'action-loading'
                        ? `Gerando sugestão · ${writingAction(state.action).label}...`
                        : 'Gerando resposta sintética...'}
          {state.progress.variant === 'q4f32_1' && (
            <span> Variante sem shader-f16: maior consumo estimado de GPU.</span>
          )}
        </p>
      )}
      {state.kind === 'action-loading' && !!state.partial && (
        <div className="streaming-preview">
          <p>Trecho provisório. Aguarde a validação para copiar ou substituir.</p>
          <pre aria-label="Texto em geração" aria-live="off" tabIndex={0}>
            {state.partial}
          </pre>
        </div>
      )}
      {state.kind === 'model-result' && (
        <div role="status">
          <p>IA pronta. Resposta ao teste sintético via WebGPU ({state.variant}):</p>
          <pre aria-label="Resposta do teste de IA local" tabIndex={0}>
            {state.text}
          </pre>
          <p>Este resultado não é uma sugestão para o seu rascunho.</p>
        </div>
      )}
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
