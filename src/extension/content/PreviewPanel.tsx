import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import type { PreviewSession } from './preview-session';
import { MODEL_CHOICES, MODEL_PROFILES, PROFILE_LABELS } from '../ai/model-catalog';
import { WRITING_ACTIONS, writingAction } from '../../shared/actions';

export function PreviewPanel({
  session,
  onClose,
}: {
  session: PreviewSession;
  onClose: () => void;
}) {
  const state = useSyncExternalStore(session.subscribe, session.getState);
  const menuChoice =
    state.kind === 'menu'
      ? MODEL_CHOICES[state.profile][
          state.hardware.state === 'available' && !state.hardware.shaderF16 ? 'q4f32_1' : 'q4f16_1'
        ]
      : null;
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
          <label className="profile-setting">
            Perfil de IA local
            <select
              value={state.profile}
              disabled={state.preferenceStatus !== 'ready'}
              onChange={(event) => {
                if (event.nativeEvent.isTrusted)
                  session.setProfile(event.currentTarget.value as typeof state.profile);
              }}
            >
              {MODEL_PROFILES.map((profile) => (
                <option key={profile} value={profile}>
                  {PROFILE_LABELS[profile]}
                </option>
              ))}
            </select>
          </label>
          <p className="hardware-info">
            {state.hardware.state === 'checking'
              ? 'Verificando adaptador WebGPU…'
              : state.hardware.state === 'unavailable'
                ? 'Adaptador WebGPU: indisponível. Limites e VRAM livre: indisponíveis.'
                : `WebGPU: shader-f16 ${state.hardware.shaderF16 ? 'disponível' : 'indisponível'}; buffer de armazenamento máximo ${Math.floor(state.hardware.maxStorageBufferBindingSize / 1_048_576)} MiB; buffer máximo ${Math.floor(state.hardware.maxBufferSize / 1_048_576)} MiB. VRAM livre: indisponível.`}
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
            <h3>
              {PROFILE_LABELS[state.profile]} · {menuChoice?.id}
            </h3>
            <p>
              Contexto: {menuChoice?.contextTokens.toLocaleString('pt-BR')} tokens. Download
              completo conhecido:{' '}
              {menuChoice ? (menuChoice.downloadBytes / 1_000_000_000).toFixed(2) : '—'} GB de
              dados. Requisito de GPU estimado:{' '}
              {menuChoice ? Math.ceil(menuChoice.gpuMemoryEstimateMB).toLocaleString('pt-BR') : '—'}{' '}
              MB. VRAM livre não é informada pelo navegador; o carregamento real confirma a
              disponibilidade.
            </p>
            <p>
              Variante:{' '}
              {state.hardware.state === 'checking' || state.hardware.state === 'unavailable'
                ? 'a verificar no Worker'
                : menuChoice?.variant}
              . Sem shader-f16, a variante f32 exige mais memória de GPU.
            </p>
            <p>
              Licença:{' '}
              <a
                href={
                  state.profile === 'economico'
                    ? 'https://dev.meta.ai/llama/llama3_2/license'
                    : 'https://www.apache.org/licenses/LICENSE-2.0'
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                {menuChoice?.license}
              </a>
              .
            </p>
            <p>A prova abaixo usa só uma frase sintética fixa e não lê nem altera seu rascunho.</p>
            <button
              type="button"
              disabled={state.preferenceStatus !== 'ready'}
              onClick={(event) => {
                if (event.isTrusted) session.startModelProof();
              }}
            >
              Testar IA local
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
      {state.kind === 'download-confirm' && (
        <div className="model-proof" role="status">
          <h3>Download necessário · {PROFILE_LABELS[state.profile]}</h3>
          <p>
            Para usar {MODEL_CHOICES[state.profile][state.variant].id}, baixe{' '}
            {(MODEL_CHOICES[state.profile][state.variant].downloadBytes / 1_000_000_000).toFixed(2)}{' '}
            GB de dados do modelo. Contexto: 4.096 tokens. Requisito de GPU estimado:{' '}
            {Math.ceil(
              MODEL_CHOICES[state.profile][state.variant].gpuMemoryEstimateMB,
            ).toLocaleString('pt-BR')}{' '}
            MB. VRAM livre: indisponível.
          </p>
          {state.variant === 'q4f32_1' && (
            <p>
              A GPU não oferece shader-f16. Esta variante f32 usa mais memória; o carregamento pode
              falhar.
            </p>
          )}
          <button
            type="button"
            onClick={(event) => {
              if (event.isTrusted) session.confirmDownload();
            }}
          >
            Baixar e continuar
          </button>
        </div>
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
