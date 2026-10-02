import type { EngineIdentity, SuggestionResult } from '../../shared/suggestion';
import { isClientEvent, sameBinding, sameKey } from '../../shared/protocol';
import { connectClient } from './client-port';
import type { Binding, RequestKey } from '../../shared/protocol';
import type { DraftSnapshot } from '../../integration/whatsapp/adapter';

export type PreviewOutcome =
  | { ok: true; text: string; engine?: EngineIdentity; status?: SuggestionResult['status'] }
  | { ok: false; message: string; code?: 'DOWNLOAD_REQUIRED' | 'INSUFFICIENT_RESOURCES' };
export type PreviewGenerator = (
  snapshot: DraftSnapshot,
  done: (outcome: PreviewOutcome) => void,
) => () => void;
export const SIMULATION_PREFIX = '[Simulação] ';

export const generatePreview: PreviewGenerator = (snapshot, done) => {
  const port = connectClient();
  const key: RequestKey = {
    requestId: crypto.randomUUID(),
    editorId: snapshot.editorId,
    snapshotId: snapshot.snapshotId,
    revision: snapshot.revision,
  };
  let binding: Binding | undefined;
  let closed = false;
  const timer = setTimeout(
    () => finish({ ok: false, message: 'A simulação não respondeu. Tente novamente.' }),
    20_000,
  );
  function close(): void {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
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
    if (value.type === 'result') finish({ ok: true, text: value.text });
    if (value.type === 'rejected' || value.type === 'error')
      finish({
        ok: false,
        message:
          value.code === 'BUSY'
            ? 'IA ocupada. Tente novamente quando a simulação terminar.'
            : 'Não foi possível preparar a prévia. O rascunho permanece intacto.',
      });
    if (value.type === 'cancelled') finish({ ok: false, message: 'Simulação cancelada.' });
  }
  function disconnect(): void {
    void chrome.runtime.lastError;
    finish({
      ok: false,
      message: 'A conexão foi encerrada. Reabra a prévia para tentar novamente.',
    });
  }
  port.onMessage.addListener(receive);
  port.onDisconnect.addListener(disconnect);
  try {
    port.postMessage({
      type: 'start',
      key,
      action: 'simular',
      text: SIMULATION_PREFIX + snapshot.text,
    });
  } catch {
    disconnect();
  }
  return () => {
    if (closed) return;
    try {
      port.postMessage({ type: 'cancel', key });
    } catch {
      /* A desconexão também encerra o pedido. */
    }
    close();
  };
};
