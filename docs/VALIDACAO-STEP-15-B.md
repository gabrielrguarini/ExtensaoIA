# Validação STEP-15-B — APIs nativas e alternativa local

[Plano](PLANO.md) · [Progresso](PROGRESSO.md) · [Etapa](steps/STEP-15-B.md) · [Português e referências](REFERENCIAS-IA-CHROME.md)

## Estado e entrega

**Concluída**, em 01/10/2026, com pacote MV3 **0.15.1**, execução nativa real em pt-BR pelo caminho experimental de Prompt e alternativa WebLLM offline. Português declarado nas opções continua indisponível no Chrome testado; a compatibilidade por prompt exige escolha explícita no painel. A STEP-15 principal permanece **Aguardando validação** das avaliações e subetapas C/D. STEP-15-C e STEP-16 não foram executadas.

Adicionada a devDependency `@types/dom-chromium-ai` **0.0.17**, fixada no lockfile e nas listas de tipos da aplicação/testes. Sem globals duplicadas, `any`, polyfills, provedores remotos ou novas permissões. Runtimes e pesos próprios anteriores permanecem fixados.

## Implementação

- Preferências v4: `engine: chrome-preferred | webllm`, `profile` independente e `chromePortuguesePrompt: false` por padrão. Migração v1/v2/v3 preserva valores válidos e descarta campos desconhecidos. Trocar motor, modelo ou modo experimental cancela pedidos e libera hosts.
- Seleção no offscreen antes da geração: consultar a mesma configuração de criação, exigir `available` e inicialização sem download. Caso contrário, selecionar o modelo local antes de gerar. Depois do início, erros encerram o pedido sem repetição ou troca de motor.
- Preparação em painel lateral visível, clique confiável e ativação local; `create()` antes de await/mensagem. Progresso pelo `CreateMonitor`, cancelamento por AbortSignal, destruição da sessão temporária e confirmação no offscreen. Nenhum gesto transferido ao offscreen.
- Caminho declarado: Corrigir → Proofreader, adaptando `ProofreadResult.correctedInput`; Formal/Amigável/Conciso/Melhorar/Reescrever → Rewriter; Profissional/Natural/Engraçado/revisão → Prompt. Rewriter usa idioma/tom/formato/comprimento de criação e contexto por pedido. Writer e Summarizer fora do escopo.
- **Português por prompt no Chrome (experimental)**: ativação manual, sem `expectedInputs`/`expectedOutputs`, sistema fixo pedindo português do Brasil, nove ações e revisão explícita via Prompt. Não declara inglês como idioma de rascunho português. Disponibilidade/criação usam as mesmas opções. A prévia identifica `Chrome prompt (pt-BR experimental)`.
- Prompt: base somente com instruções fixas, clone por pedido e destroy no finally. Sistemas de escrita e revisão JSON são distintos; mudar configuração destrói/recria a base. Rewriter reutiliza a instância sem histórico enquanto a configuração for igual. Proofreader não pressupõe clone ou streaming.
- AbortSignal/destroy e liberação após cinco minutos de inatividade, com timer suspenso durante operações. Streaming em deltas do Chrome atual, sem deduplicar repetições legítimas; compatibilidade cumulativa explícita testada separadamente. Métodos sem streaming retornam progresso e resultado completo.
- Medir quota quando implementado, com `measureContextUsage/contextWindow` ou `measureInputUsage/inputQuota`, incluindo esquema JSON. Tratar `QuotaExceededError`/`NotSupportedError`. Métricas opcionais de primeira parte/total usam `browser-quota`, sem tokens/s inventados. O produto não presume versão exata do modelo ou GPU/CPU escolhida pelo Chrome.
- `ModelRequestRunner` comum mantém geração única, avisos, revisão explícita, texto original e substituição manual. Cancelamento, desconexão e rascunho desatualizado impedem aplicação. Nenhuma mensagem enviada.
- Artefatos nativos administrados pelo Chrome e separados dos caches próprios. Consultas WebLLM leem índice/URLs sem hashing dos GB de pesos; integridade integral continua obrigatória ao carregar. Presença em cache não certifica integridade.

## Ambiente e disponibilidade real

Windows, Node **22.14.0**, i9-13980HX, 16 GB RAM, RTX 4060 Laptop/8.188 MiB, driver 555.97. Perfis dedicados, sem conta/conversas reais. [Ambiente e hashes das referências](evidencias/step15b/ambiente.json).

| Navegador/execução                      | Idiomas declarados                                    | Sem declarações de idioma                                                   | Resultado                                                  |
| --------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Chrome for Testing 154.0.8037.0, padrão | pt-BR indisponível nas dez consultas; Prompt presente | Controles genéricos/inglês sem resposta no prazo                            | Alternativa WebLLM real offline                            |
| Mesmo CfT, flags Rewriter/Proofreader   | pt-BR indisponível; três globals presentes            | Controles inconclusivos por prazo                                           | Alternativa WebLLM real offline                            |
| Chrome instalado 154.0.8037.92, padrão  | `pt` e `pt-BR` indisponíveis                          | Prompt inicialmente `downloadable`, depois `available`, no painel/offscreen | Português por prompt e nove ações reais offline            |
| Mesmo Chrome, flags especializadas      | Controle **en**, sem alegar pt-BR                     | Rewriter `available`; Proofreader `downloadable` → preparado                | Streaming/reuso/quota e correção estruturada reais offline |

O CfT mostrou `GpuBlocked`, sem manifesto/modelos. O [código do Chromium](https://chromium.googlesource.com/chromium/src/+/HEAD/components/optimization_guide/core/model_execution/performance_class.cc) atribui essa classe por padrão às builds Chrome for Testing: **isso não prova bloqueio da GPU real**. O Chrome instalado informou classe 6/VRAM 7.957 MiB e foi elegível. Não alteramos driver, políticas ou bloqueios de GPU.

Preparação nativa por clique real no perfil isolado: cerca de **192,95 s**, pesos administrados pelo Chrome de **4.269.932.544 bytes**. Disco com aproximadamente 42,10 GB livres antes e 37,87 GB depois. O tamanho não é requisito fixo nem medição completa da memória residente.

O Chrome regular foi carregado por CDP `Extensions.loadUnpacked`, com `--enable-unsafe-extension-debugging` somente no perfil de teste; modo de desenvolvedor ativado pela interface. `AIRewriterAPI,AIProofreadingAPI` só no controle especializado. O produto não altera flags nem usa essa permissão de depuração.

## Português e fluxo acumulado

[12 fixtures distintas](evidencias/step15b/portugues.json) com acentos, gírias, negação, perguntas, nomes, datas e valores retornaram português real sem rede, com clone/destroy por pedido. Nesse ensaio visível separado, totais entre **0,79 e 1,80 s**. Confirma capacidade empírica; não certifica preservação/utilidade das 12 sugestões nem substitui a campanha D.

O [ensaio final do produto](evidencias/step15b/chrome-nativo-final.json), Chrome 154.0.8037.92 **sem flags das APIs especializadas**, passou:

- Popup/painel por gesto; migração v3→v4, ativação manual experimental, preparação visível e disponibilidade nas dez consultas do offscreen.
- Nove ações em pt-BR com motor nativo escolhido antes de gerar, inferência offline, original preservado, avisos, revisão semântica JSON explícita, substituição manual e Ctrl+Z.
- Streaming e cancelamento após edição durante geração; prévia obsoleta impedida de aplicar.
- **11 clones criados e 11 destruídos**. Uso da base constante por configuração: 83 na escrita e 94 na revisão; três bases destruídas, incluindo trocas escrita/revisão e idle. A instrumentação encaminhou as chamadas reais, sem simular o motor.
- Liberação após **300.432 ms** de inatividade real, comando de unload, somente `writingPreferences` no storage e **zero erros de página**.

Primeira correção no fluxo final: **1,393 s**; demais ações na mesma fixture: **0,858–1,385 s**, medidos pelo harness do fluxo. Tempos de smoke de rascunho curto, sem p95/três rodadas ou avaliação independente de utilidade. Não comparar com carga fria WebLLM nem anunciar o melhor motor.

[Painel nativo](evidencias/step15b/final-painel.png) · [Prévia sintética](evidencias/step15b/final-preview.png). O harness serviu fixture sintética no domínio WhatsApp; não acessou conversa real nem enviou mensagens. A validação acumulada no WhatsApp real permanece nos relatórios anteriores; instalação limpa e fluxo final pertencem à STEP-16.

Ensaios anteriores preservados: [primeiro idle](evidencias/step15b/chrome-offscreen-idle.json) e [controles iniciais](evidencias/step15b/chrome-controles-inicial.json). O segundo detectou JSON adicional numa reescrita após revisão. Separar os sistemas fixos de escrita/revisão removeu esse artefato no ensaio final, com isolamento confirmado pelo uso constante de cada base. Ainda houve variação de emoji sinalizada e pouca diferenciação de tons: limitações para a D, sem descartar a saída final legível.

## Rewriter e Proofreader reais

[Controle especializado em inglês](evidencias/step15b/chrome-especializadas-en.json): APIs preparadas por clique confiável, mesmas opções consultadas/criadas, rede desligada antes de inferir. Proofreader retornou `correctedInput` e correções com índices; Rewriter produziu streaming, recebeu dois pedidos na mesma instância e rejeitou entrada excessiva com **QuotaExceededError**. Instâncias destruídas ao terminar.

As saídas do Rewriter incluíram um acréscimo sobre o destinatário e, no segundo pedido, uma instrução final indevida. Preservamos os resultados completos: êxito técnico não equivale a boa reescrita. Esse controle não comprova pt-BR das APIs especializadas nem altera sua disponibilidade no produto. O modo experimental português usa Prompt.

## Alternativa e verificações

[CfT padrão](evidencias/step15b/padrao.json) e [CfT experimental](evidencias/step15b/experimental.json) passaram com WebLLM/Llama em WebGPU offline, prévia, avisos, aplicação/desfazer e bloqueio de rascunho alterado. Tempos frios incluindo carga: 34,380 s e 30,987 s. A rodada padrão foi repetida após os ajustes finais, em [alternativa final](evidencias/step15b/alternativa-final.json). Ausência/indisponibilidade nativa não quebra o fluxo local.

`npm.cmd run check`: **235 testes em 34 arquivos**, TypeScript strict/tipos oficiais, ESLint, Prettier e build MV3 aprovados. Fixtures de contratos cobrem ausência, idioma/opções recusados, downloads vedados no offscreen, resultados estruturados, streaming/deltas, quotas, clones, reutilização/configuração, concorrência, cancelamento, criação tardia, unload/idle, seleção sem replay, esquema v4 e integridade do cache. Complementam os ensaios reais acima.

[Recibo SHA-256](evidencias/step15b/recibo.json) vincula 15 evidências, 84 fontes/contratos e 36 arquivos do build. Pesos, perfis e dist não entram no commit. Conferidos 350 links locais em 41 documentos, sem destinos ausentes.

## Reprodução e continuidade

Após `npm.cmd run check`, sem compartilhar o perfil com outro Chrome:

1. `STEP15B_REGULAR_CHROME` aponta para Chrome instalado. `npm.cmd run test:step15b:portuguese` executa as 12 fixtures visíveis, podendo preparar o modelo por clique real.
2. Com `STEP15B_PORTUGUESE_PROMPT=1`, `npm.cmd run test:step15b:browser` valida produto/offscreen, todas as ações, offline e idle real. `STEP15B_SKIP_IDLE=1` só para complemento, identificado como não repetido.
3. `npm.cmd run test:step15b:specialized` executa os controles ingleses com flags, perfil dedicado e preparação explícita; não valida pt-BR especializado.
4. Alternativa: remover `STEP15B_REGULAR_CHROME`/`STEP15B_PORTUGUESE_PROMPT`, apontar `STEP15B_CHROME` para CfT e executar `test:step15b:browser`. Requer os artefatos locais preparados nas etapas anteriores. `STEP15B_EXPERIMENTAL=1` habilita globals experimentais somente nesse teste.

Não afirmar utilidade superior, suporte geral a idiomas ou velocidade relativa desses ensaios. A STEP-15-D deve comparar os candidatos com mesmos casos/hardware, três rodadas quentes e avaliações anotadas. Os 108 pares históricos e **191 avaliações Qwen pendentes** permanecem intactos. C/D e STEP-16 aguardam solicitação, sem início automático.

## Referências verificadas

[Writing Assistance APIs dd37ddd2b85972def88bc5bd0779c0968ec549bf](https://github.com/webmachinelearning/writing-assistance-apis/tree/dd37ddd2b85972def88bc5bd0779c0968ec549bf) fundamenta disponibilidade com opções e Rewriter sem histórico. [Pacote 0.0.17](https://registry.npmjs.org/@types%2fdom-chromium-ai/0.0.17) fornece os contratos. [Prompt](https://developer.chrome.com/docs/ai/prompt-api?hl=pt-br), [Rewriter](https://developer.chrome.com/docs/ai/rewriter-api), [Proofreader](https://developer.chrome.com/docs/ai/proofreader-api) e [gestão nativa](https://developer.chrome.com/docs/ai/understand-built-in-model-management) foram conferidos, prevalecendo detecção e inicialização real.

O [estudo de português/cache](REFERENCIAS-IA-CHROME.md) registra as páginas indicadas e quatro serviços localstudio no commit fixado. O contorno omite declarações de idioma e orienta pelo prompt; foi verificado e incorporado como opção experimental. O guia de cache se refere a modelos próprios via MediaPipe; C/D/16 receberam as referências, sem implementação antecipada.
