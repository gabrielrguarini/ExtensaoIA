import { useEffect, useState } from 'react';
import { GEMMA_MODEL } from '../ai/gemma-catalog';
import { gemmaBytes } from '../ai/gemma-cache';
import { probeHardware } from '../content/model-hardware';
import type { GemmaVariant } from '../../shared/local-model';
import type { GemmaStatus } from '../../shared/gemma-management';
import { manageGemma } from './gemma-client';
export function GemmaControls() {
  const [variant, setVariant] = useState<GemmaVariant>('q4f16');
  const [status, setStatus] = useState<GemmaStatus>();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let live = true;
    void probeHardware().then((h) => {
      if (live && h.state === 'available') setVariant(h.shaderF16 ? 'q4f16' : 'q4');
    });
    return () => {
      live = false;
    };
  }, []);
  async function manage(type: 'status' | 'unload' | 'remove') {
    setBusy(true);
    setMessage('');
    try {
      const result = await manageGemma(
        type === 'unload'
          ? { target: 'gemma-cache', type }
          : { target: 'gemma-cache', type, variant },
      );
      if ('cached' in result) setStatus(result);
      else {
        setStatus(undefined);
        setConfirm(false);
        setMessage(
          type === 'remove'
            ? 'Arquivos selecionados do Gemma removidos. Preferências preservadas.'
            : 'Worker do Gemma liberado. Cache preservado.',
        );
      }
    } catch {
      setMessage('Não foi possível concluir. Atualize o estado e tente novamente.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-labelledby="gemma-title">
      <h2 id="gemma-title">Gemma 4 E2B · Transformers.js</h2>
      <p>
        Modelo local selecionável. Solicite uma ação no editor e confirme Baixar e continuar quando
        necessário.
      </p>
      <label>
        Variante do Gemma{' '}
        <select
          aria-label="Variante do Gemma"
          value={variant}
          disabled={busy}
          onChange={(e) => {
            if (e.nativeEvent.isTrusted) {
              setVariant(e.currentTarget.value as GemmaVariant);
              setStatus(undefined);
              setConfirm(false);
            }
          }}
        >
          <option value="q4f16">q4f16 (shader-f16)</option>
          <option value="q4">q4 (sem shader-f16)</option>
        </select>
      </label>
      <p>
        {(gemmaBytes(variant) / 1e9).toFixed(2)} GB de dados. WebGPU obrigatório; VRAM livre não
        disponível. Contexto do produto: {GEMMA_MODEL.contextTokens} tokens.
      </p>
      <p>
        Licença:{' '}
        <a href="licenses/GEMMA-4-LICENSE" target="_blank" rel="noopener noreferrer">
          Apache 2.0
        </a>
        . Revisão: {GEMMA_MODEL.revision}.
      </p>
      <p>
        Cache:{' '}
        {status
          ? status.cached
            ? 'arquivos presentes; integridade conferida ao carregar'
            : 'ausente ou incompleto'
          : 'a verificar'}
        . Memória:{' '}
        {status
          ? {
              released: 'liberada',
              'worker-ready': 'aguardando carregamento',
              loading: 'carregando',
              loaded: 'modelo carregado',
            }[status.runtime]
          : 'a verificar'}
        .
      </p>
      <button
        disabled={busy}
        onClick={(e) => {
          if (e.isTrusted) void manage('status');
        }}
      >
        Atualizar estado do Gemma
      </button>
      <button
        disabled={busy}
        onClick={(e) => {
          if (e.isTrusted) void manage('unload');
        }}
      >
        Liberar Gemma
      </button>
      <button
        disabled={busy}
        onClick={(e) => {
          if (e.isTrusted) setConfirm(true);
        }}
      >
        Apagar arquivos do Gemma
      </button>
      {confirm && (
        <div>
          <p>
            Remover esta variante e os dados compartilhados do Gemma? O próximo uso exigirá
            preparação explícita.
          </p>
          <button
            disabled={busy}
            onClick={(e) => {
              if (e.isTrusted) void manage('remove');
            }}
          >
            Confirmar remoção do Gemma
          </button>
          <button
            disabled={busy}
            onClick={(e) => {
              if (e.isTrusted) setConfirm(false);
            }}
          >
            Manter Gemma
          </button>
        </div>
      )}
      <p>
        Cache pode ser removido pelo navegador. Liberamos o Worker após cinco minutos sem uso. Estes
        controles não removem WebLLM nem artefatos do Chrome.
      </p>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
