# STEP-15-B — APIs nativas do Chrome

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md) · [STEP-15 principal](STEP-15.md)

## Objetivo e pré-requisitos

STEP-15-A concluída. Usar Chrome preferencial quando idioma pt-BR e ação forem realmente suportados, com modelo local escolhido como alternativa antes da geração.

## Tarefas

- Adicionar @types/dom-chromium-ai **0.0.17** exatamente como devDependency e no lockfile; incluir dom-chromium-ai nas listas explícitas de compilerOptions.types da aplicação e testes. Usar seus contratos sem any ou globais duplicadas. Compatibilidade experimental deve ser pequena, documentada e validada.
- Implementar Prompt/Rewriter/Proofreader por detecção e inicialização real. Consultar disponibilidade com as mesmas opções de idioma/tom/formato da criação. A declaração TypeScript não comprova suporte; português indisponível exclui o caminho com aquela configuração declarada.
- Pedir explicitamente português do Brasil no sistema da Prompt API. Investigar separadamente o contorno do localstudio (sem declarações de idioma, idioma solicitado no prompt), conforme [referências e protocolo](../REFERENCIAS-IA-CHROME.md). Só incorporar essa compatibilidade após inferência pt-BR real validada; timeout/indisponibilidade genérica não provam incompatibilidade linguística.
- Versionar preferências separando motor e modelo, padrão Chrome preferencial, preservando perfil local atual. Compatibilidade pt-BR por prompt validada empiricamente entra como opção experimental manual, desligada por padrão, com identificação na prévia. Escolher antes do pedido; não trocar motor nem repetir geração após falha. Download exige ação explícita.
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
- [Português, localstudio e cache](../REFERENCIAS-IA-CHROME.md): código fixado, documentação em pt-BR e experimento de idioma por prompt. [Guia de cache](https://developer.chrome.com/docs/ai/cache-models?hl=pt-br) orienta os modelos próprios, sem misturar artefatos Chrome.

## Evidências

Relatório com procedimentos, ambiente, resultados, pendências e evidências sintéticas da subetapa.

Próxima subetapa: [STEP-15-C](STEP-15-C.md).

## Registro da execução em 01/10/2026

**Concluída** no pacote 0.15.1, com tipagens fixadas, 235 testes e build MV3. Chrome instalado 154.0.8037.92: 12 fixtures distintas em português por prompt e fluxo real no offscreen com nove ações, revisão JSON, streaming/cancelamento, clones isolados e idle de cinco minutos, offline. Preparação por gesto e alternativa WebLLM real verificadas. Rewriter/Proofreader executados como controles ingleses com flags: streaming/reuso/quota e correctedInput estruturado.

Português declarado continua indisponível: padrão mantém alternativa local; a opção **Português por prompt no Chrome (experimental)** permite o caminho sem declarações de idioma. O `GpuBlocked` observado antes no CfT decorre da classificação padrão dessa build, sem comprovar bloqueio real da GPU. Resultados e limitações de qualidade foram preservados; superioridade depende da D. A STEP-15 principal continua Aguardando validação. Ver [relatório e reprodução](../VALIDACAO-STEP-15-B.md). C/D/16 não executadas.
