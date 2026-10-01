# Português, prompts e cache de IA no Chrome

[Plano](PLANO.md) · [STEP-15-B](steps/STEP-15-B.md) · [Validação](VALIDACAO-STEP-15-B.md)

Consulta em 01/10/2026. Estas referências orientam B/C/D e a entrega final; não substituem execução no navegador alvo.

## Português por instrução e idioma declarado

A [Prompt API, inclusive na página em português](https://developer.chrome.com/docs/ai/prompt-api?hl=pt-br#add_expected_input_and_output), documenta `expectedInputs`/`expectedOutputs` com en, ja, es, de e fr; outros idiomas estão em desenvolvimento. `hl=pt-br` muda o idioma da documentação. O modelo pode conseguir produzir português por instrução mesmo quando a lista documentada não o inclui; essa possibilidade deve ser avaliada com rascunhos pt-BR e a configuração real da sessão. Uma instrução não altera, por si, a disponibilidade declarada pelo navegador.

Na extensão, a sessão Prompt inclui a instrução explícita **Write exclusively in Brazilian Portuguese (português do Brasil, pt-BR)**. O padrão consulta/cria com o idioma declarado; se estiver indisponível, usa o modelo local selecionado. A opção manual **Português por prompt no Chrome (experimental)** consulta/cria sem declarações de idioma e usa Prompt nas nove ações e na revisão explícita. Disponibilidade e criação recebem a mesma configuração em ambos os caminhos. Não declarar inglês para mascarar um rascunho português nem anunciar qualidade a partir de disponibilidade genérica.

## O que o localstudio faz

Referência fixada: commit `6512a521947077977d1d14df58f656e13675c227`, também HEAD de main na consulta. Foram lidos os arquivos públicos, sem executar o aplicativo:

| Fonte                                                                                                                                                                          | Comportamento observado                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [chromePromptService.ts](https://github.com/ErickWendel/localstudio/blob/6512a521947077977d1d14df58f656e13675c227/apps/editor/src/services/prompting/chromePromptService.ts)   | `checkAvailability()` chama `availability()` sem opções de idioma. `preparePromptApi()` cria apenas com monitor; `promptText()` chama `create()` sem opções, usa `prompt()` e destrói a sessão no finally. Há compatibilidade com a global antiga `window.ai.languageModel`. |
| [slideTaskPrompt.ts](https://github.com/ErickWendel/localstudio/blob/6512a521947077977d1d14df58f656e13675c227/apps/editor/src/services/prompting/slideTaskPrompt.ts)           | Instruções em inglês solicitam texto visível no idioma pedido pelo usuário, ou no idioma do prompt se nenhum for pedido; interpolam `targetLanguageHint`.                                                                                                                    |
| [browserPromptService.ts](https://github.com/ErickWendel/localstudio/blob/6512a521947077977d1d14df58f656e13675c227/apps/editor/src/services/prompting/browserPromptService.ts) | O hint padrão é o mesmo idioma do prompt do usuário; a interface delega ao provedor selecionado. Chrome e Gemma são alternativas.                                                                                                                                            |
| [slideElementPrompt.ts](https://github.com/ErickWendel/localstudio/blob/6512a521947077977d1d14df58f656e13675c227/apps/editor/src/services/prompting/slideElementPrompt.ts)     | A etapa de layout pede preservação do texto da tarefa e recebe o prompt original e os elementos como contexto.                                                                                                                                                               |

Portanto, o contorno encontrado é **omitir declarações de idioma e orientar o idioma pelo prompt**. Não há, nesse serviço, validação específica de pt-BR, tradução intermediária ou garantia de qualidade em português. `generateText()` encaminha o prompt recebido; não acrescenta automaticamente uma instrução fixa de pt-BR. A disponibilidade genérica e o booleano `ready` não comprovam suporte por ação/idioma. Reaproveitamos a orientação explícita do idioma, mantendo nosso isolamento por clone, cancelamento e avisos.

## Protocolo aplicado na STEP-15-B

Além do caminho declarado, verificar o comportamento sem declarações, como no localstudio, com evidências separadas e ativação manual no produto:

1. Registrar Chrome, hardware, flags, contexto visível/offscreen e disponibilidade com pt-BR, com `pt` (controle de tag) e sem opções. `unavailable` refere-se à combinação consultada; timeout é inconclusivo. No CfT, `GpuBlocked` pode decorrer da própria build, conforme a fonte Chromium abaixo.
2. Se houver disponibilidade genérica elegível, preparar a sessão por clique real e download explícito no painel. Usar **exatamente a configuração consultada** também na criação. Não declarar inglês para mascarar o rascunho português, nem enviar texto para outro provedor.
3. Sem `expectedInputs`/`expectedOutputs`, manter sistema fixo de preservação e instrução explícita para português do Brasil. Clonar por pedido. Usar apenas fixtures: acentos, gírias brasileiras, perguntas, negação, nomes, datas e valores. Medir erros técnicos, idioma efetivo, avisos, preservação e tempo. Testar criação/inferência no offscreen e offline, não apenas na página visível.
4. Caso funcione, identificar como **compatibilidade experimental de pt-BR por prompt**, com versão/configuração/limitações. Validar ações, isolamento, cancelamento e tratamento de quotas antes da seleção manual. Registrar limitações de qualidade, sem substituir a avaliação D por êxito técnico; manter alternativa local antes da geração. Não repetir nem trocar motor após uma geração que falhou.
5. Na STEP-15-D, comparar esse candidato e o caminho declarado com WebLLM/Gemma, usando os mesmos casos e critérios. Se a evidência não sustentar qualidade/latência, mantê-lo como experimento. A STEP-16 deve documentar somente configurações realmente validadas.

**Resultado real:** no Chrome instalado **154.0.8037.92**, a configuração sem declarações estava `downloadable`. Após clique e preparação explícita, **12/12 fixtures distintas** produziram português offline em documento visível. O produto passou no offscreen com nove ações, revisão JSON, streaming, cancelamento, 11 clones destruídos e idle real de cinco minutos. `pt`/`pt-BR` declarados continuaram `unavailable`. A compatibilidade foi incorporada como opção experimental desligada por padrão; ver [evidências e limitações](VALIDACAO-STEP-15-B.md).

O Chrome for Testing 154.0.8037.0 havia mostrado `GpuBlocked`, sem modelos, e controles genéricos interrompidos por prazo. O [código Chromium](https://chromium.googlesource.com/chromium/src/+/HEAD/components/optimization_guide/core/model_execution/performance_class.cc) classifica CfT assim por padrão; não é prova de incompatibilidade da GPU. O Chrome instalado, no mesmo hardware e em perfil isolado, informou classe 6 e funcionou. Preservamos ambas as evidências sem converter o ensaio CfT em conclusão sobre o idioma.

Produzir português não garante preservação ou utilidade. Houve variação de emoji e pouca diferenciação entre alguns tons; um controle inglês do Rewriter acrescentou instruções indevidas. A D deve avaliar esses problemas e comparar modelos antes de recomendar o caminho mais rápido ou preciso.

## Cache dos modelos próprios: referência para C/D

[Armazenar modelos em cache no navegador](https://developer.chrome.com/docs/ai/cache-models?hl=pt-br), atualizado em 12/06/2024, exemplifica um modelo Gemma via MediaPipe e compara Cache API, OPFS, IndexedDB e acesso a arquivo local. Não é um exemplo de `LanguageModel` nem uma lista de idiomas do Gemini Nano.

O guia recomenda Cache API para pesos grandes e medições de armazenamento/restauração no hardware alvo. O exemplo que duplica o mesmo modelo entre mecanismos é demonstrativo e não deve ser copiado para produção. A documentação também trata de URLs versionadas, persistência solicitada ao navegador e downloads com progresso/cancelamento.

Para STEP-15-C, usar um cache canônico por revisão de Gemma, preferir Cache API quando compatível com o runtime e separar índice/recibos pequenos dos pesos. Conferir integridade ao carregar, medir preparo e carregamento com cache na D e não reler/hashing de GB a cada atualização da interface. A persistência pode ser negada ou o cache removido. Os artefatos da IA nativa continuam administrados pelo Chrome, conforme [gestão dos modelos integrados](https://developer.chrome.com/docs/ai/understand-built-in-model-management); a extensão não os copia nem remove pelo gestor WebLLM/Gemma.
