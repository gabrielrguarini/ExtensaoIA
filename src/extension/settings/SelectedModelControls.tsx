import { useEffect, useRef, useState } from 'react';
import type { WritingPreferences } from '../../shared/preferences';
import { MODEL_CHOICES } from '../ai/model-catalog';
import { gemmaBytes, prepareGemma } from '../ai/gemma-cache';
import { cacheModelArtifacts } from '../ai/model-cache';
import { probeHardware } from '../content/model-hardware';
import { manageModel } from './model-client';
import { manageGemma } from './gemma-client';
import type { GemmaVariant } from '../../shared/local-model';

export function SelectedModelControls({
  preferences,
  visiblePanel,
}: {
  preferences: WritingPreferences;
  visiblePanel: boolean;
}) {
  const { localModel, profile } = preferences;
  const [f16, setF16] = useState<boolean>();
  const [supported, setSupported] = useState(true);
  const [cached, setCached] = useState<boolean>();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [percent, setPercent] = useState<number>();
  const download = useRef<AbortController | undefined>(undefined);
  const revision = useRef(0);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const removeButton = useRef<HTMLButtonElement>(null);
  const webVariant = f16 === false ? 'q4f32_1' : 'q4f16_1';
  const gemmaVariant: GemmaVariant = f16 === false ? 'q4' : 'q4f16';
  const name =
    localModel === 'gemma'
      ? 'Gemma 4 · E2B'
      : { economico: 'Llama 3.2 · 3B', equilibrado: 'Qwen3 · 4B', qualidade: 'Qwen3 · 8B' }[
          profile
        ];
  useEffect(() => {
    const current = ++revision.current;
    setF16(undefined);
    setCached(undefined);
    setBusy(false);
    setConfirm(false);
    setMessage('');
    setError('');
    setPercent(undefined);
    void probeHardware()
      .then(async (hardware) => {
        if (current !== revision.current) return;
        setSupported(hardware.state === 'available');
        if (hardware.state !== 'available') return;
        setF16(hardware.shaderF16);
        const result =
          localModel === 'gemma'
            ? await manageGemma({
                target: 'gemma-cache',
                type: 'status',
                variant: hardware.shaderF16 ? 'q4f16' : 'q4',
              })
            : await manageModel({
                target: 'model-cache',
                type: 'status',
                profile,
                variant: hardware.shaderF16 ? 'q4f16_1' : 'q4f32_1',
              });
        if (
          current === revision.current &&
          'cached' in result &&
          typeof result.cached === 'boolean'
        )
          setCached(result.cached);
      })
      .catch(() => {
        if (current === revision.current) setError('Não foi possível verificar o download.');
      });
    return () => {
      revision.current++;
      download.current?.abort();
      download.current = undefined;
    };
  }, [localModel, profile]);
  useEffect(() => {
    if (confirm) confirmButton.current?.focus();
  }, [confirm]);
  async function manage(type: 'unload' | 'remove') {
    const current = revision.current;
    setBusy(true);
    setError('');
    try {
      if (localModel === 'gemma')
        await manageGemma(
          type === 'unload'
            ? { target: 'gemma-cache', type }
            : { target: 'gemma-cache', type, variant: gemmaVariant },
        );
      else
        await manageModel(
          type === 'unload'
            ? { target: 'model-cache', type }
            : { target: 'model-cache', type, profile, variant: webVariant },
        );
      if (current !== revision.current) return;
      if (type === 'remove') setCached(false);
      setMessage(
        type === 'remove'
          ? 'Download removido. Você poderá baixar novamente no próximo uso.'
          : 'Memória liberada. Pedidos em andamento foram cancelados.',
      );
    } catch {
      if (current === revision.current) setError('Não foi possível concluir. Tente novamente.');
    } finally {
      if (current === revision.current) {
        setBusy(false);
        setConfirm(false);
        if (type === 'remove') removeButton.current?.focus();
      }
    }
  }
  async function prepare() {
    if (busy || !visiblePanel || document.visibilityState !== 'visible' || f16 === undefined)
      return;
    const current = revision.current;
    const controller = new AbortController();
    download.current = controller;
    setBusy(true);
    setPercent(0);
    setError('');
    setMessage('');
    const progress = (value: number) => {
      if (current === revision.current && !controller.signal.aborted) setPercent(Math.floor(value));
    };
    try {
      // Cancelar a instância selecionada antes de reparar/gravar seu cache canônico.
      if (localModel === 'gemma') {
        await manageGemma({ target: 'gemma-cache', type: 'unload' });
        controller.signal.throwIfAborted();
        await prepareGemma(gemmaVariant, true, controller.signal, progress);
      } else {
        await manageModel({ target: 'model-cache', type: 'unload' });
        controller.signal.throwIfAborted();
        await cacheModelArtifacts(MODEL_CHOICES[profile][webVariant], controller.signal, progress);
      }
      controller.signal.throwIfAborted();
      if (current === revision.current) {
        setCached(true);
        setMessage('Modelo preparado. Clique em IA no WhatsApp para usar.');
      }
    } catch {
      if (current === revision.current)
        setError(
          controller.signal.aborted
            ? 'Download cancelado.'
            : 'Não foi possível preparar o modelo. Verifique a conexão e tente novamente.',
        );
    } finally {
      if (current === revision.current) {
        download.current = undefined;
        setBusy(false);
        setPercent(undefined);
      }
    }
  }
  const bytes =
    localModel === 'gemma'
      ? gemmaBytes(gemmaVariant)
      : MODEL_CHOICES[profile][webVariant].downloadBytes;
  return (
    <section className="preparation-card" aria-labelledby="model-title">
      <h3 id="model-title">{name}</h3>
      {!supported ? (
        <p>Este modelo não está disponível neste computador. Experimente a IA Nativa.</p>
      ) : (
        <>
          <p>
            {cached === undefined
              ? 'Verificando download…'
              : cached
                ? 'Download pronto. O modelo carrega quando você usa a IA.'
                : 'Prepare o modelo para baixar até ' + (bytes / 1e9).toFixed(2) + ' GB.'}
          </p>
          {cached === false && (
            <>
              {!visiblePanel && <p>Abra o painel lateral para preparar o modelo.</p>}
              <button
                disabled={busy || !visiblePanel || f16 === undefined}
                onClick={(e) => {
                  if (e.isTrusted) void prepare();
                }}
              >
                Baixar modelo
              </button>
            </>
          )}
          {percent !== undefined && (
            <>
              <p role="status">Baixando modelo… {percent}%</p>
              <button
                onClick={(e) => {
                  if (e.isTrusted) download.current?.abort();
                }}
              >
                Cancelar download
              </button>
            </>
          )}
          <details>
            <summary>Armazenamento e memória</summary>
            <p>
              Após cinco minutos sem uso, a memória é liberada automaticamente. Remover o download
              exige baixar o modelo novamente.
            </p>
            <button
              disabled={busy || f16 === undefined}
              onClick={(e) => {
                if (e.isTrusted) void manage('unload');
              }}
            >
              Liberar memória
            </button>
            <button
              ref={removeButton}
              disabled={busy || f16 === undefined || cached !== true}
              onClick={(e) => {
                if (e.isTrusted) setConfirm(true);
              }}
            >
              Remover download
            </button>
            {confirm && (
              <div role="group" aria-label="Confirmar remoção do modelo">
                <p>Remover o download de {name}?</p>
                <button
                  ref={confirmButton}
                  disabled={busy}
                  onClick={(e) => {
                    if (e.isTrusted) void manage('remove');
                  }}
                >
                  Confirmar remoção
                </button>
                <button
                  disabled={busy}
                  onClick={(e) => {
                    if (e.isTrusted) {
                      setConfirm(false);
                      removeButton.current?.focus();
                    }
                  }}
                >
                  Cancelar
                </button>
              </div>
            )}
          </details>
        </>
      )}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
