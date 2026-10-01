# STEP-15-B — APIs nativas do Chrome

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md) · [STEP-15 principal](STEP-15.md)

## Instrução de execução

Executar somente esta subetapa. Ler o plano, progresso e este arquivo. Entregar todo o escopo acumulado, validar no ambiente exigido, revisar o diff e registrar commit próprio conforme [AGENTS.md](../../AGENTS.md). Não iniciar a próxima subetapa. Validação obrigatória pendente mantém Aguardando validação; não transformar interrupção em incompatibilidade presumida.

## Objetivo e pré-requisitos

STEP-15-A concluída. Usar Chrome preferencial quando idioma pt-BR e ação forem realmente suportados, com modelo local escolhido como alternativa antes da geração.

## Tarefas

- Adicionar @types/dom-chromium-ai **0.0.17** exatamente como devDependency e no lockfile; incluir dom-chromium-ai nas listas explícitas de compilerOptions.types da aplicação e testes. Usar seus contratos sem any ou globais duplicadas. Compatibilidade experimental deve ser pequena, documentada e validada.
- Implementar Prompt/Rewriter/Proofreader por detecção e inicialização real. Consultar disponibilidade com as mesmas opções de idioma/tom/formato da criação. A declaração TypeScript não comprova suporte; português indisponível exclui esse caminho.
- Versionar preferências separando motor e modelo, padrão Chrome preferencial, preservando perfil local atual. Escolher antes do pedido; não trocar motor nem repetir geração após falha. Download exige ação explícita.
- Preparar downloads no painel visível sob gesto do usuário. Confirmar disponibilidade e inferir no documento offscreen; runtimes próprios permanecem no Worker. Não transferir artificialmente gesto ao offscreen.
- Corrigir usa Proofreader (adaptar correctedInput); tom/comprimento compatíveis usam Rewriter; Engraçado e demais ações não especializadas usam Prompt. Writer/Summarizer fora do escopo.
- Prompt mantém base sem rascunhos, clone por pedido e destroy ao terminar. Rewriter reutiliza instância sem histórico enquanto configuração de criação (idiomas, tom, formato, comprimento) for igual; recriar ao mudar. Proofreader não pressupõe clone/streaming.
- AbortSignal, destroy e liberação após cinco minutos sem atividade. measureInputUsage/limites quando existentes; tratar QuotaExceededError/NotSupportedError, sem chamar quota de tokens sem confirmação.
- Normalizar streaming sem duplicações; APIs sem streaming mostram progresso e resultado completo. Aceitar CPU administrada pelo Chrome. Separar artefatos Chrome dos caches próprios.
- Manter processamento local obrigatório: contratos genéricos da proposta podem admitir remoto, mas não incorporar provedores/polyfills remotos.

## Aceite e validação

Compilação com tipos oficiais; ausência de API; português/opções indisponíveis; quota; progresso/download explícito; resultado estruturado; streaming; cancelamento; isolamento/clones; concorrência; configuração; unload/inatividade; alternativa local escolhida previamente. Chrome real em painel/offscreen e offline após preparação; registrar versão, suporte por ação/idioma e limitações reais. Recursos indisponíveis devem ser relatados, sem promessa de suporte por tipos/proposta.

## Referências obrigatórias

- [Pacote fixado](https://registry.npmjs.org/@types%2fdom-chromium-ai/0.0.17) e [declarações](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/dom-chromium-ai/index.d.ts).
- [Writing Assistance APIs no commit dd37ddd](https://github.com/webmachinelearning/writing-assistance-apis/tree/dd37ddd2b85972def88bc5bd0779c0968ec549bf): contratos/comportamento de Rewriter; Writer e Summarizer excluídos.
- [Prompt API](https://developer.chrome.com/docs/ai/prompt-api), [Rewriter](https://developer.chrome.com/docs/ai/rewriter-api), [Proofreader](https://developer.chrome.com/docs/ai/proofreader-api). Confirmar disponibilidade atual e alvo real.

## Evidências e commit

Registrar procedimentos, ambiente, resultados e pendências no progresso e relatório da subetapa. Usar dados sintéticos, npm.cmd run check e commit Conventional Commits com identidade humana configurada. Não publicar nem enviar mensagens automaticamente.

Próxima subetapa: [STEP-15-C](STEP-15-C.md), somente após solicitação.
