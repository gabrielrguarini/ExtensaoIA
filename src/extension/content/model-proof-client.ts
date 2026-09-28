import { CLIENT_PORT, isClientEvent, sameBinding, sameKey } from '../../shared/protocol';
import type { Binding, RequestKey } from '../../shared/protocol';
import { MODEL_PROOF_TEXT } from '../../shared/model-proof';

export type ProofOutcome =
  { ok: true; text: string; variant: 'q4f16_1' | 'q4f32_1' } | { ok: false; message: string };
export type ProofProgress = {
  phase: 'preparing' | 'downloading' | 'loading' | 'ready' | 'generating' | 'validating';
  percent: number;
  variant: 'q4f16_1' | 'q4f32_1' | null;
};
export type ProofGenerator = (
  progress: (value: ProofProgress) => void,
  done: (outcome: ProofOutcome) => void,
) => () => void;

export const runModelProof: ProofGenerator = (progress, done) => {
  const port = chrome.runtime.connect({ name: CLIENT_PORT });
  const key: RequestKey = {
    requestId: crypto.randomUUID(),
    editorId: 'model-proof',
    snapshotId: crypto.randomUUID(),
    revision: 0,
  };
  let binding: Binding | undefined;
  let closed = false;
  const timer = setTimeout(
    () => finish({ ok: false, message: 'A preparação do modelo excedeu o tempo esperado.' }),
    65 * 60_000,
  );
  function close(): void {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    port.onMessage.removeListener(receive);
    port.onDisconnect.removeListener(disconnect);
    port.disconnect();
  }
  function finish(value: ProofOutcome): void {
    if (closed) return;
    close();
    done(value);
  }
  function receive(value: unknown): void {
    if (closed || !isClientEvent(value)) return;
    if ('binding' in value) {
      if (!sameKey(value.binding.key, key) || (binding && !sameBinding(binding, value.binding)))
        return;
      binding = value.binding;
    }
    if (value.type === 'rejected' && value.key && !sameKey(value.key, key)) return;
    if (value.type === 'model-progress') progress(value);
    if (value.type === 'proof-result')
      finish({ ok: true, text: value.text, variant: value.variant });
    if (value.type === 'rejected' || value.type === 'error') {
      const message =
        value.code === 'BUSY'
          ? 'IA ocupada. Tente novamente quando o pedido atual terminar.'
          : value.code === 'WEBGPU_UNAVAILABLE'
            ? 'A IA local precisa de WebGPU neste navegador/computador. Nenhum texto foi enviado a servidores.'
            : value.code === 'INSUFFICIENT_RESOURCES'
              ? 'A GPU não oferece os recursos necessários para este modelo. O rascunho permanece intacto.'
              : value.code === 'MODEL_DOWNLOAD'
                ? 'Não foi possível baixar ou carregar os artefatos do modelo. Verifique a conexão e tente novamente.'
                : 'Não foi possível processar o teste localmente. O rascunho permanece intacto.';
      finish({ ok: false, message });
    }
    if (value.type === 'cancelled') finish({ ok: false, message: 'Teste cancelado.' });
  }
  function disconnect(): void {
    void chrome.runtime.lastError;
    finish({ ok: false, message: 'A conexão foi encerrada. Abra o teste novamente.' });
  }
  port.onMessage.addListener(receive);
  port.onDisconnect.addListener(disconnect);
  try {
    port.postMessage({ type: 'start', key, action: 'prova-modelo', text: MODEL_PROOF_TEXT });
  } catch {
    disconnect();
  }
  return () => {
    if (closed) return;
    try {
      port.postMessage({ type: 'cancel', key });
    } catch {
      // A desconexão do port também encerra o pedido ativo.
    }
    close();
  };
};
