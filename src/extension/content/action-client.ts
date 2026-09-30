import { CLIENT_PORT, isClientEvent, sameBinding, sameKey } from '../../shared/protocol';
import type { Binding, RequestKey } from '../../shared/protocol';
import type { DraftSnapshot } from '../../integration/whatsapp/adapter';
import type { ProofProgress } from './model-proof-client';
import type { PreviewOutcome } from './preview-client';
import type { WritingAction } from '../../shared/actions';
import type { ModelProfile } from '../ai/model-catalog';

export type ActionGenerator = (
  action: WritingAction,
  snapshot: DraftSnapshot,
  progress: (value: ProofProgress) => void,
  fragment: (text: string) => void,
  done: (outcome: PreviewOutcome) => void,
  allowDownload?: boolean,
  expectedProfile?: ModelProfile,
) => () => void;

export const generateAction: ActionGenerator = (
  action,
  snapshot,
  progress,
  fragment,
  done,
  allowDownload = false,
  expectedProfile,
) => {
  const port = chrome.runtime.connect({ name: CLIENT_PORT });
  const key: RequestKey = {
    requestId: crypto.randomUUID(),
    editorId: snapshot.editorId,
    snapshotId: snapshot.snapshotId,
    revision: snapshot.revision,
  };
  let binding: Binding | undefined;
  let closed = false;
  let cancelling = false;
  let cancelFallback: ReturnType<typeof setTimeout> | undefined;
  const timer = setTimeout(
    () => finish({ ok: false, message: 'A IA local excedeu o tempo esperado. Tente novamente.' }),
    65 * 60_000,
  );
  function close(): void {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    if (cancelFallback) clearTimeout(cancelFallback);
    port.onMessage.removeListener(receive);
    port.onDisconnect.removeListener(disconnect);
    port.disconnect();
  }
  function finish(outcome: PreviewOutcome): void {
    if (closed) return;
    close();
    done(outcome);
  }
  function receive(value: unknown): void {
    if (closed || !isClientEvent(value)) return;
    if ('binding' in value) {
      if (!sameKey(value.binding.key, key) || (binding && !sameBinding(binding, value.binding)))
        return;
      binding = value.binding;
    }
    if (value.type === 'rejected' && value.key && !sameKey(value.key, key)) return;
    if (cancelling) {
      if (
        value.type === 'cancelled' ||
        value.type === 'error' ||
        value.type === 'action-rejected' ||
        value.type === 'action-result' ||
        value.type === 'rejected'
      )
        close();
      return;
    }
    if (value.type === 'model-progress') progress(value);
    if (value.type === 'action-fragment' && value.action === action) fragment(value.text);
    if (value.type === 'action-result' && value.action === action)
      finish({ ok: true, text: value.text });
    if (
      value.type === 'rejected' ||
      value.type === 'error' ||
      (value.type === 'action-rejected' && value.action === action)
    ) {
      const message =
        value.code === 'BUSY'
          ? 'IA ocupada. Tente novamente quando o pedido atual terminar.'
          : value.code === 'CONTEXT_LIMIT'
            ? 'Mensagem muito longa para o modelo selecionado. Reduza o rascunho.'
            : value.code === 'TRUNCATED_OUTPUT'
              ? 'A resposta atingiu o limite de geração. Reduza o rascunho e tente novamente.'
              : value.code === 'EMPTY_OUTPUT'
                ? 'A IA local retornou uma resposta vazia. O rascunho permanece intacto.'
                : value.code === 'INVALID_OUTPUT'
                  ? 'A IA local retornou uma resposta inadequada. O rascunho permanece intacto.'
                  : value.code === 'PRESERVATION_RISK'
                    ? 'A sugestão pode ter omitido ou alterado conteúdo do rascunho. Nenhuma alteração foi aplicada.'
                    : value.code === 'SEMANTIC_RISK'
                      ? 'A revisão semântica encontrou possível mudança de significado. O rascunho permanece intacto.'
                      : value.code === 'SEMANTIC_INVALID'
                        ? 'A revisão semântica não pôde confirmar o significado. O rascunho permanece intacto.'
                        : value.code === 'WEBGPU_UNAVAILABLE'
                          ? 'A IA local precisa de WebGPU neste navegador/computador. Seu texto não foi enviado a servidores.'
                          : value.code === 'INSUFFICIENT_RESOURCES'
                            ? 'A GPU não oferece os recursos necessários. O rascunho permanece intacto.'
                            : value.code === 'MODEL_DOWNLOAD'
                              ? 'Não foi possível baixar o modelo. Verifique a conexão; o rascunho permanece intacto.'
                              : 'Não foi possível processar o texto localmente. O rascunho permanece intacto.';
      finish(
        value.code === 'DOWNLOAD_REQUIRED'
          ? {
              ok: false,
              code: 'DOWNLOAD_REQUIRED',
              message: 'O modelo ainda não está no cache local.',
            }
          : value.code === 'INSUFFICIENT_RESOURCES'
            ? { ok: false, code: 'INSUFFICIENT_RESOURCES', message }
            : { ok: false, message },
      );
    }
    if (value.type === 'cancelled') finish({ ok: false, message: 'Ação cancelada.' });
  }
  function disconnect(): void {
    void chrome.runtime.lastError;
    if (cancelling) {
      close();
      return;
    }
    finish({ ok: false, message: 'A conexão foi encerrada. Gere uma nova sugestão.' });
  }
  port.onMessage.addListener(receive);
  port.onDisconnect.addListener(disconnect);
  try {
    port.postMessage({
      type: 'start',
      key,
      action,
      text: snapshot.text,
      allowDownload,
      ...(expectedProfile ? { expectedProfile } : {}),
    });
  } catch {
    disconnect();
  }
  return () => {
    if (closed || cancelling) return;
    cancelling = true;
    clearTimeout(timer);
    try {
      port.postMessage({ type: 'cancel', key });
    } catch {
      close();
      return;
    }
    // Sem confirmação, desconectar força o roteador a encerrar o Worker.
    cancelFallback = setTimeout(close, 2_000);
  };
};
