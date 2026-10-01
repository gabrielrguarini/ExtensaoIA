import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { isClientEvent, record } from '../../shared/protocol';
import type { DiagnosticCommand } from '../../shared/diagnostic';
import '../../development/styles.css';
import './styles.css';

const labels = {
  INVALID_MESSAGE: 'Pedido inválido',
  BUSY: 'IA ocupada',
  UNKNOWN_REQUEST: 'Pedido desconhecido',
  UNAVAILABLE: 'Motor indisponível',
  DISCONNECTED: 'Conexão encerrada',
  TIMEOUT: 'Tempo limite atingido',
  WEBGPU_UNAVAILABLE: 'WebGPU indisponível',
  INSUFFICIENT_RESOURCES: 'Recursos da GPU insuficientes',
  MODEL_DOWNLOAD: 'Falha no download do modelo',
  DOWNLOAD_REQUIRED: 'Download do modelo precisa de confirmação',
  CONTEXT_LIMIT: 'Mensagem muito longa para o contexto',
  NATIVE_QUOTA: 'Quota do Chrome excedida',
  NATIVE_NOT_SUPPORTED: 'Idioma ou opções não aceitos pelo Chrome',
  EMPTY_OUTPUT: 'Resposta vazia',
  TRUNCATED_OUTPUT: 'Resposta truncada',
  INVALID_OUTPUT: 'Formato inadequado',
  PRESERVATION_RISK: 'Dados ou negações alterados',
  SEMANTIC_RISK: 'Possível mudança de significado',
  SEMANTIC_INVALID: 'Revisão semântica indisponível',
} as const;

function describe(value: unknown): string {
  if (!record(value)) return 'Resposta inválida.';
  if (typeof value.error === 'string') return value.error;
  if (typeof value.notice === 'string') return value.notice;
  if (!Array.isArray(value.events) || !value.events.length || !value.events.every(isClientEvent))
    return 'Resposta inválida.';
  return value.events
    .map((event) => {
      switch (event.type) {
        case 'status':
          return event.state === 'idle' ? 'Motor simulado livre.' : 'IA ocupada.';
        case 'rejected':
          return labels[event.code];
        case 'error':
          return labels[event.code];
        case 'progress':
          return `Progresso: ${event.percent}%`;
        case 'model-progress':
          return `Modelo: ${event.phase} ${event.percent}%`;
        case 'fragment':
          return 'Fragmento recebido pelo content script.';
        case 'cancelled':
          return 'Teste cancelado; nenhum resultado aplicado.';
        case 'result':
          return `Circuito completo — SIMULAÇÃO. Aba ${event.binding.origin.tabId}; documento ${event.binding.origin.documentId}; pedido ${event.binding.key.requestId}.\nEco sintético: ${event.text}`;
        case 'proof-result':
          return `Inferência local concluída na variante ${event.variant}.`;
        case 'action-result':
          return 'Ação de escrita local concluída.';
        case 'action-rejected':
          return labels[event.code];
      }
    })
    .join('\n');
}
async function send(command: DiagnosticCommand): Promise<unknown> {
  return chrome.runtime.sendMessage(command);
}

function Diagnostic() {
  const [tabs, setTabs] = useState<number[]>([]);
  const [selected, setSelected] = useState('');
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState(
    'Clique em atualizar para listar somente as abas do WhatsApp Web.',
  );
  const [notice, setNotice] = useState('');
  const available = typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id);

  async function refresh(): Promise<void> {
    try {
      const value = await send({ target: 'diagnostic', type: 'list' });
      if (!record(value) || !Array.isArray(value.tabs)) throw new Error();
      const ids = value.tabs.flatMap((tab: unknown) =>
        record(tab) && typeof tab.id === 'number' && Number.isSafeInteger(tab.id) ? [tab.id] : [],
      );
      setTabs(ids);
      setSelected(ids[0]?.toString() ?? '');
      setReport(
        ids.length
          ? 'Abas disponíveis. Os testes usam apenas uma frase sintética embutida.'
          : 'Abra o WhatsApp Web no mesmo perfil do Chrome e atualize a lista.',
      );
    } catch {
      setReport('Não foi possível listar as abas. Abra esta página pela extensão instalada.');
    }
  }

  async function run(parallel: boolean): Promise<void> {
    const targets = parallel ? tabs.slice(0, 2) : [Number(selected)];
    setRunning(true);
    setNotice('');
    setReport('Executando o circuito simulado...');
    try {
      const responses = await Promise.all(
        targets.map(async (tabId) => {
          const response = await send({ target: 'diagnostic', type: 'run', tabId });
          return `Aba ${tabId}\n${describe(response)}`;
        }),
      );
      setReport(responses.join('\n\n'));
    } catch {
      setReport(
        'A comunicação foi interrompida. Inicie um novo teste; pedidos anteriores não são retomados.',
      );
    } finally {
      setRunning(false);
    }
  }

  async function command(type: 'status' | 'cancel'): Promise<void> {
    try {
      setNotice(describe(await send({ target: 'diagnostic', type, tabId: Number(selected) })));
    } catch {
      setNotice('Conexão encerrada. Recarregue a aba e inicie um novo teste.');
    }
  }

  return (
    <main className="development-page">
      <p className="eyebrow">STEP-03 · ferramenta de desenvolvimento</p>
      <h1>Diagnóstico de comunicação</h1>
      <p>
        <strong>Motor simulado.</strong> Não há correção por IA. Nenhuma conversa ou rascunho é
        lido, alterado ou enviado.
      </p>
      {!available && (
        <p role="alert">
          Carregue a pasta dist em chrome://extensions e abra este diagnóstico pelo ícone da
          extensão.
        </p>
      )}
      <button
        disabled={!available || running}
        onClick={() => {
          void refresh();
        }}
      >
        Atualizar abas do WhatsApp
      </button>
      <label htmlFor="tab">Aba para testar</label>
      <select
        id="tab"
        value={selected}
        disabled={running || !tabs.length}
        onChange={(event) => {
          setSelected(event.target.value);
        }}
      >
        {!tabs.length && <option value="">Nenhuma aba disponível</option>}
        {tabs.map((id) => (
          <option key={id} value={id}>
            Aba {id}
          </option>
        ))}
      </select>
      <div className="diagnostic-actions">
        <button
          disabled={!selected || running}
          onClick={() => {
            void run(false);
          }}
        >
          Testar circuito simulado
        </button>
        <button
          disabled={tabs.length < 2 || running}
          onClick={() => {
            void run(true);
          }}
        >
          Testar duas abas simultaneamente
        </button>
        <button
          disabled={!selected}
          onClick={() => {
            void command('status');
          }}
        >
          Consultar estado
        </button>
        <button
          disabled={!running}
          onClick={() => {
            void command('cancel');
          }}
        >
          Cancelar teste da aba selecionada
        </button>
      </div>
      <p role="status">{notice}</p>
      <pre aria-live="polite" aria-label="Resultado do diagnóstico">
        {report}
      </pre>
      <p>Duas solicitações simultâneas devem produzir um resultado e um aviso de ocupado.</p>
      <p>
        Após instalar ou atualizar a extensão, recarregue as abas do WhatsApp para ativar o content
        script. O relatório desaparece ao fechar esta página.
      </p>
    </main>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Página de diagnóstico incompleta.');
createRoot(root).render(
  <StrictMode>
    <Diagnostic />
  </StrictMode>,
);
