# Validação da STEP-15-D — Comparação e otimização

[Progresso](PROGRESSO.md) · [Etapa](steps/STEP-15-D.md) · [Procedimento](benchmark/STEP-15-D.md) · [Resultados históricos preservados](VALIDACAO-STEP-15.md)

## Estado da execução

**Concluída na versão 0.15.3.** Campanha reservada, comparação com ENTITY_*, regressões e check aprovados, com evidências para o commit próprio desta subetapa. Foram executados 2.448 pedidos comparativos e revisadas todas as 2.314 sugestões disponíveis; recusas e dois erros técnicos permanecem no denominador. Os 191 resultados históricos interrompidos dos Qwen permanecem identificados no relatório original; a nova campanha original executou e revisou os 108 pares de cada perfil, cobrindo essa obrigação sem alterar os arquivos antigos. STEP-15 principal aceita pelas novas evidências; STEP-16 permanece pendente.

## Ambiente e método

Chrome instalado **154.0.8037.93**, Windows 10.0.26200, i9-13980HX, 16.779.935.744 bytes de RAM física, RTX 4060 Laptop com **8.188 MiB**, driver 555.97. Todos os candidatos comparativos usam essa mesma máquina e navegador. Não houve ajuste de paginação, GPU ou RAM. Amostras de `nvidia-smi` são uso global, sem atribuição exclusiva ou pico do modelo. Não há isolamento térmico nem controle de todos os processos do sistema; a ordem dos candidatos é fixa, sem randomização. Campanhas históricas são pareadas pelos casos, mas executadas em momentos diferentes, incluindo a pausa documentada. Conclusões ficam limitadas ao ambiente medido, sem inferência causal sobre velocidade de frameworks isolados.

Conjunto conhecido: 108 pares históricos de 12 textos × nove ações, preservados integralmente. Conjunto reservado: **108 rascunhos independentes**, 12 por ação, escrito/anotado antes de inferir e disjunto dos textos históricos. O hash da fonte reservada já aparece na campanha de desenvolvimento iniciada em `2026-10-02T00:06:30.686Z`, igual ao usado na campanha reservada iniciada em `2026-10-02T00:51:54.794Z`. Hash de `cases.json` reservado: `96425a7c51bf08335c495103ded9dff7994b60d7311fc705863494b5dc7873d7`. Os casos reservados não foram usados para modificar prompts. Seus tamanhos vão de 38 a 120 unidades UTF-16; o histórico inclui o caso longo B08. As latências reservadas descrevem rascunhos curtos e não representam o limite máximo de 8.000 unidades da extensão.

Cinco candidatos: Chrome Prompt experimental por instrução pt-BR, Llama 3.2 3B, Gemma 4 E2B textual, Qwen3 4B e Qwen3 8B. WebLLM 0.2.82, Transformers.js 4.2.0 e artefatos/revisões travados nos catálogos das etapas anteriores. A revisão interna dos pesos nativos não é exposta pela API; sua identidade reproduzível nesta evidência é a versão do Chrome, as opções e o estado de disponibilidade registrado. Atualizações de componentes foram desativadas no perfil de campanha. Nesta GPU todos os modelos próprios usam f16/q4f16. A variante q4 sem shader-f16 permanece sem nova recomendação de desempenho, pois não foi medida nesse hardware.

O Chrome informa indisponibilidade de pt-BR declarado; Rewriter/Proofreader não estão expostos neste alvo. O candidato experimental usa Prompt sem declarações de idioma, com pedido explícito de português brasileiro, como validado em B. Isso não transforma disponibilidade genérica em suporte declarado. A preferência experimental do produto continua desligada por padrão; Chrome preferencial usa a alternativa local quando o idioma/ação não forem elegíveis.

Três rodadas quentes por candidato, com aquecimento separado e resultados por caso. Chrome/Llama/Gemma ficam residentes entre blocos da mesma rodada; Qwen reinicia a cada 12 casos em resposta à pressão de recursos histórica. Navegador reinicia entre candidatos/rodadas. O carregamento frio offline com cache inclui integridade e GPU e é separado da geração. `resident: true` identifica prontidão sem recarga. Preparação inicial com download pertence somente ao piloto e não à métrica de carga com cache da campanha final. Primeiro fragmento é o emitido pelo adaptador; tokens/s usam a estatística real de decodificação do WebLLM; no Gemma são calculados no adaptador com a contagem real de IDs gerados e o tempo após o primeiro token. Tokenizadores e fronteiras de medição diferem, portanto essas taxas não são equivalentes entre motores. A quota da Prompt API não é convertida em tokens.

Revisão feita pela IA executora da implementação, independente dos cinco modelos avaliados, contra as anotações prévias. Não é estudo humano cego nem probabilidade calibrada. Cada variante de texto/avisos por ID é lida; variantes exatamente iguais compartilham anotação, com SHA-256 específico de cada resultado/rodada. Conteúdo semanticamente preservado é separado de entidades literais: `3` virar `três` pode manter o fato e violar o contrato literal. Utilidade exige preservação, literais, gramática, naturalidade, idioma e transformação pertinente. Saídas idênticas continuam visíveis, mas têm utilidade de transformação zero. Erros sem sugestão não recebem qualidade inventada.

Aviso correto indica risco efetivo observado, não apenas alteração lexical; por exemplo, trocar proibição por falta de necessidade. Avisos conservadores por capitalizar aberturas de frase, equivalências de intenção ou concisão legítima são contados como indevidos. Risco não sinalizado inclui mudança de fato/papel/condição/entidade sem cobertura correspondente, mesmo se houver outro aviso. Inadequação apenas de estilo/gramática é avaliada separadamente.

## Ajustes antes da avaliação reservada

Três pilotos de 12 pares conhecidos × cinco motores, uma rodada cada. Base anterior, prompt compacto e delimitação JSON são campanhas separadas, com snapshots; não constituem estimativa reservada nem comparação estatística de várias rodadas. O piloto inicial também preparou explicitamente os quatro modelos próprios no perfil de teste. Sem tentativa adicional após falha; respostas técnicas incompletas continuam erro, respostas legíveis continuam prévias com avisos.

| Candidato     | Úteis: base / compacto / JSON | Mediana total base / JSON | Mudanças de conteúdo base / JSON |
| ------------- | ----------------------------- | ------------------------- | -------------------------------- |
| Chrome Prompt | 4 / 2 / 4 de 12               | 0,86 / 0,92 s             | 1 / 1                            |
| Llama 3B      | 0 / 1 / 1 de 12               | 1,46 / 2,03 s             | 10 / 0                           |
| Gemma E2B     | 3 / 4 / 4 de 12               | 3,39 / 3,96 s             | 2 / 1                            |
| Qwen 4B       | 1 / 0 / 1 de 12               | 2,62 / 2,97 s             | 1 / 0                            |
| Qwen 8B       | 4 / 2 / 2 de 12               | 4,33 / 4,67 s             | 3 / 2                            |

O compacto foi descartado: trouxe respostas à pergunta em vez de edição, execução do comando citado e novo erro verbal no Gemma. A delimitação JSON foi adotada somente no WebLLM para separar dado/instrução: Llama e Qwen 4B deixaram de executar `banana` no piloto, à custa de latência maior e aspas externas frequentes. Qwen 8B já preservava essa citação na base; sua utilidade caiu no piloto JSON. Não afirmar superioridade geral desse ajuste. Chrome/Gemma mantêm seus prompts anteriores para evitar custo e piora observados. Os avisos e a revisão manual permanecem necessários.

O orçamento WebLLM conta a mensagem realmente enviada, incluindo envelope e caracteres escapados, mas calcula a reserva de resposta pelo rascunho original. O caminho padrão mantém todos os caracteres do dado e não mascara entidades. O pipeline ENTITY_* continua acessível somente para comparação histórica. Pesos residentes, streaming, cancelamento e isolamento permanecem na infraestrutura própria; não criar/destruir pesos por geração. Sessões Prompt continuam usando base sem rascunhos e clone por pedido.

## Campanhas históricas e pendências

O teste de retenção executou 24/324 pares históricos e parou pelo limite explícito de dois blocos: primeira carga Llama de aproximadamente 24,9 s, segunda consulta residente inferior a 1 ms, 24 IDs únicos e checkpoint com os demais pendentes. A retomada exige fontes/configuração idênticas e preserva resultados anteriores. A retomada terminou com 324/324 casos únicos, sem falhas técnicas, e confirmou byte a byte o prefixo dos 24 registros anteriores. A [prova de retomada](benchmark/step15d/history-original-final-03/resume-proof.json) guarda os hashes, contagens e identidade desses casos.

Campanha histórica nova, fluxo original com avisos, mesma máquina/Chrome e fontes da campanha reservada:

| Perfil      | Ofertas / 108 | Úteis | Mudanças de conteúdo | Riscos sem aviso | Mediana / p95 total |
| ----------- | ------------: | ----: | -------------------: | ---------------: | ------------------: |
| economico   |           108 |     7 |                   22 |               11 |       1,97 / 7,81 s |
| equilibrado |           108 |     8 |                    9 |                8 |      2,97 / 15,20 s |
| qualidade   |           108 |    31 |                    9 |                1 |      4,77 / 31,41 s |

O p95 inclui o rascunho longo B08; por isso difere bastante do conjunto reservado curto. Os históricos anteriores continuam arquivados com suas pendências originais; não misturar suas rodadas incompletas com esses novos denominadores. A comparação pareada ENTITY_* executou também 324/324 pedidos, com 191 sugestões disponíveis/revisadas, 132 recusas de preservação e um erro técnico `INVALID_OUTPUT` no Llama B10-formal. Nenhuma pendência foi convertida em incompatibilidade.

| Perfil      | Ofertas original / legado | Úteis original / legado, de 108 | Sem alteração original / legado | Recusas de preservação legado | Erros técnicos original / legado | Mediana / p95 de todos os pedidos original | Mediana / p95 de todos os pedidos legado |
| ----------- | ------------------------: | ------------------------------: | ------------------------------: | ----------------------------: | -------------------------------: | -----------------------------------------: | ---------------------------------------: |
| economico   |                  108 / 11 |                           7 / 7 |                           9 / 1 |                            96 |                            0 / 1 |                              1,97 / 7,81 s |                            2,12 / 3,77 s |
| equilibrado |                  108 / 92 |                          8 / 10 |                         82 / 69 |                            16 |                            0 / 0 |                             2,97 / 15,20 s |                           3,56 / 18,00 s |
| qualidade   |                  108 / 88 |                         31 / 30 |                         38 / 11 |                            20 |                            0 / 0 |                             4,77 / 31,41 s |                           5,55 / 35,02 s |

Essas latências incluem também gerações recusadas, sem carregar pesos nem esperar a UI. A mediana/p95 somente das sugestões liberadas do legado é 2,02/9,30 s, 3,64/18,20 s e 5,55/36,43 s, respectivamente; esse subconjunto tem outro denominador e não deve substituir a coluna pareada. O Llama mantém utilidade com mais disponibilidade e mais mudanças de conteúdo; Qwen 4B fica mais rápido, mas perde duas sugestões úteis; Qwen 8B ganha uma sugestão útil e reduz a latência mediana, com aumento de mudanças de conteúdo de 6 para 9. São resultados descritivos, sem significância estatística demonstrada nem ganho universal atribuído ao JSON.

Entre as sugestões liberadas, o legado teve mudanças de conteúdo/riscos sem aviso de 1/1 no Llama, 0/0 no Qwen 4B e 6/6 no Qwen 8B; entidades literais permaneceram exatas. O original teve 22/11, 9/8 e 9/1, respectivamente, além de 25/2/2 alterações de entidades literais. O legado não emite avisos; não há precisão de avisos a medir nesse caminho. A disponibilidade maior do fluxo com avisos expõe também respostas inadequadas para revisão e não comprova maior precisão. Retentativas e troca de motor após falha continuam desativadas.

Na comparação histórica, Qwen 4B recebeu recusas `PRESERVATION_RISK` em B09 mesmo repetindo o texto com `hj`: o validador legado acrescenta `hoje` na contagem anterior sem normalizar essa abreviação na saída idêntica. Em B12, o mesmo fluxo bloqueou respostas que executavam `banana`. Esses exemplos distinguem uma recusa conservadora/indevida de proteção efetiva; não alteramos o validador histórico depois de congelar a campanha. O caminho atual compara entidades antes/depois sem essa assimetria e apresenta avisos para revisão.

Duas tentativas preliminares falharam antes de inferir, por nome de arquivo raiz reservado e preparação disparada de página não autorizada. Após novo build, o perfil também estava com modo de desenvolvedor desligado; o executor passou a habilitá-lo no perfil dedicado e aguardar a interface de instalação pronta. Essas falhas do harness são separadas de erros/incompatibilidade dos modelos, sem apagar registros ou denominadores.

## Resultados reservados completos

Todos os cinco candidatos executaram 324/324 casos, sem erros, indisponibilidades ou pendências. São 108 textos únicos por candidato, repetidos três vezes; 324 observações não significam 324 rascunhos independentes. Todas as sugestões foram revisadas e todas estavam em pt-BR efetivo. As contagens de avisos são avisos individuais; riscos não sinalizados contam sugestões.

| Candidato     | Úteis / 324 | Sem alteração | Mudanças de conteúdo | Entidades literais alteradas | Avisos corretos / indevidos | Riscos não sinalizados |
| ------------- | ----------: | ------------: | -------------------: | ---------------------------: | --------------------------: | ---------------------: |
| Chrome Prompt |         147 |            12 |                   48 |                           72 |                   112 / 184 |                     17 |
| Llama 3B      |          15 |            66 |                   42 |                           15 |                     51 / 60 |                     21 |
| Gemma E2B     |         141 |            27 |                   18 |                            9 |                    27 / 102 |                      9 |
| Qwen 4B       |          21 |           279 |                    0 |                            0 |                       0 / 3 |                      0 |
| Qwen 8B       |          95 |            96 |                   34 |                           12 |                     40 / 54 |                      3 |

| Candidato     | Resultado mediana / p95 | Primeiro fragmento mediana / p95 | Carga com cache mediana / p95 | Preparação mediana / p95 | Tokens/s mediana / p95 |
| ------------- | ----------------------: | -------------------------------: | ----------------------------: | -----------------------: | ---------------------: |
| Chrome Prompt |           0,74 / 0,97 s |                    0,27 / 0,28 s |                 9,63 / 9,80 s |            2,06 / 2,08 s |                  — / — |
| Llama 3B      |           1,83 / 2,21 s |                    1,27 / 1,63 s |               25,53 / 25,88 s |          19,13 / 19,67 s |          40,98 / 42,96 |
| Gemma E2B     |           2,57 / 3,76 s |                    0,94 / 1,22 s |               36,36 / 37,80 s |          32,08 / 32,92 s |          10,24 / 11,00 |
| Qwen 4B       |           2,72 / 3,40 s |                    1,64 / 2,13 s |               30,36 / 32,06 s |          23,17 / 24,73 s |          21,39 / 24,76 |
| Qwen 8B       |           4,33 / 5,26 s |                    3,03 / 3,94 s |               69,40 / 70,49 s |          49,41 / 50,04 s |          18,68 / 20,96 |

Preparação é a fase de `initialize` identificada pelo motor, incluída na carga com cache; não somar as duas colunas. Chrome/Llama/Gemma têm três cargas frias, Qwen tem 27 por política de reinício. Os p95 de três cargas são descritivos, com amostra pequena. Consultas residentes medianas ficam abaixo de 1 ms. A totalização de uma geração quente não inclui esperar pelo usuário nem carregar pesos após liberação; o primeiro uso de Qwen 8B exigiu cerca de 69 s de carga nesta máquina.

| Ação         |          Chrome |          Llama |           Gemma |        Qwen 4B |         Qwen 8B |
| ------------ | --------------: | -------------: | --------------: | -------------: | --------------: |
| corrigir     | 33 / 36; 0,53 s | 0 / 36; 2,17 s | 30 / 36; 2,74 s | 6 / 36; 3,05 s | 21 / 36; 5,02 s |
| melhorar     | 19 / 36; 0,74 s | 0 / 36; 1,78 s | 18 / 36; 2,89 s | 6 / 36; 2,64 s | 18 / 36; 4,23 s |
| formal       | 29 / 36; 0,75 s | 3 / 36; 1,79 s | 30 / 36; 2,46 s | 9 / 36; 2,58 s | 21 / 36; 4,24 s |
| profissional |  3 / 36; 0,78 s | 3 / 36; 1,80 s |  3 / 36; 2,57 s | 0 / 36; 2,72 s |  9 / 36; 4,30 s |
| amigavel     |  5 / 36; 0,67 s | 0 / 36; 1,70 s |  0 / 36; 2,12 s | 0 / 36; 2,42 s |  0 / 36; 4,01 s |
| natural      | 15 / 36; 0,71 s | 3 / 36; 1,74 s | 21 / 36; 2,36 s | 0 / 36; 2,54 s |  9 / 36; 4,09 s |
| conciso      | 20 / 36; 0,75 s | 3 / 36; 1,95 s | 21 / 36; 2,81 s | 0 / 36; 3,23 s | 11 / 36; 4,69 s |
| engracado    |  3 / 36; 0,73 s | 3 / 36; 1,87 s |  3 / 36; 2,52 s | 0 / 36; 2,80 s |  0 / 36; 4,32 s |
| reescrever   | 20 / 36; 0,78 s | 0 / 36; 1,80 s | 15 / 36; 2,69 s | 0 / 36; 2,72 s |  6 / 36; 4,29 s |

Cada célula informa sugestões úteis / 36 e mediana total quente. `summary.json` guarda também p95 e demais medidas por ação. A revisão não mede satisfação de usuários e pode conter julgamentos subjetivos.

## Recomendações nesta máquina

Para **Corrigir**, o Prompt experimental foi o mais rápido e teve mais sugestões úteis que os candidatos locais. Para **Melhorar** e **Reescrever**, também apresentou maior utilidade com menor latência. É opção manual experimental neste Chrome: a consulta com pt-BR declarado continua indisponível. Manter o padrão Chrome preferencial com checagem de idioma/ação; não ativar silenciosamente o experimento por causa do benchmark.

Para **Formal**, **Natural** e **Conciso**, Gemma ganhou ligeiramente em utilidade, com maior latência. As diferenças de 1/36 em Formal e Conciso são descritivas e não demonstram significância estatística. No agregado foi mais conservador que Chrome quanto a conteúdo e entidades: há uma troca explícita entre velocidade e preservação. Gemma é a recomendação local para correção/escrita geral nesse hardware com shader-f16; ainda exige revisão e pode executar instruções citadas. A aplicação mantém escolha manual de modelo, sem trocar motor após uma falha.

**Profissional**, **Amigável** e **Engraçado** não têm resultado satisfatório consistente. Qwen 8B obteve 9/36 úteis em Profissional, acima dos outros, à custa de aproximadamente 4,30 s; não justificar carregamento maior como melhoria geral. Chrome obteve 5/36 em Amigável, e a utilidade de Engraçado foi no máximo 3/36, sobretudo pelo tratamento respeitoso do caso sensível. Não prometer qualidade desses tons nem equivalência semântica garantida.

Llama é mais rápido que os demais motores WebGPU, mas a utilidade observada ficou muito abaixo da do Gemma. Qwen 4B preservou o conteúdo por repetir o original em 279/324 respostas; isso não o torna bom editor. Qwen 8B melhorou várias ações frente ao Llama, mas perdeu para Gemma em utilidade geral e latência. O nome do perfil Qualidade e o número de parâmetros não são recomendação automática. Não extrapolar para CPU nativa, outra GPU, q4 sem f16 ou memória livre estimada pela RAM.

Aspas externas e execução de comandos citados continuam limitações do WebLLM, mesmo com o envelope JSON. Não remover aspas ou ajustar prompts depois de ver os casos reservados, pois isso invalidaria a avaliação desta revisão. Novos ajustes exigem outro conjunto reservado. Avisos de capitalização e concisão legítima também geram falsos alertas; mantê-los identificados nos dados e revisar o texto completo, mesmo sem aviso.

A arquitetura atual conserva pesos e reutiliza sessões, evitando custo de carga por pedido. A medição sustenta conservar essa infraestrutura, comparada à criação/destruição por geração examinada no localstudio; não houve benchmark direto do aplicativo localstudio. Transformers.js, WebLLM e Chrome foram comparados nesta integração, portanto a diferença de modelo também participa dos resultados.

## Regressões e verificação final

O build de produção **0.15.3** removeu `step15d-entry.js` e os datasets/entrypoints temporários: 51 arquivos instaláveis, sem endpoint de benchmark. Regressões em Chrome real usaram fixtures sintéticas interceptadas localmente, sem autenticação, conversas reais ou envio. As campanhas comparativas continuaram no Chrome instalado 154.0.8037.93; somente os controles locais abaixo usam CfT 154.0.8037.0, conforme os roteiros anteriores.

- **WebLLM:** Llama offline após reinício, identidade conferida na prévia, aviso de emoji, análise semântica explícita sem substituir o candidato, original preservado, substituição manual/Ctrl+Z e rascunho desatualizado bloqueado. [Resultado](benchmark/step15d/regressions/webllm-smoke.json).
- **Gemma q4f16:** inferência offline, aplicação/desfazer, prova, revisão explícita, streaming, concorrência recusada, confirmação de cancelamento do Worker, rascunho desatualizado bloqueado, troca/liberação e pedido seguinte isolado. Liberação real por inatividade após **300.248 ms**, com cache preservado. [Controles](benchmark/step15d/regressions/gemma-controls.json).
- **Cache incompleto:** remoção temporária de `config.json`, sessão liberada, download Gemma/3,13 GB apresentado corretamente e nenhum download silencioso; cancelamento e restauração do arquivo. Alternativa Gemma quando o Chrome declarado está indisponível, após reinício offline. Não repetimos a remoção/reparação dos gigabytes de pesos, já validada em C: código de cache/integridade permaneceu idêntico nas fontes congeladas. [Consentimento](benchmark/step15d/regressions/gemma-cache-consent.json) e [validação integral de recuperação C](VALIDACAO-STEP-15-C.md).
- **Chrome nativo:** painel e offscreen disponíveis no modo experimental; pt-BR declarado indisponível, APIs especializadas ausentes. Nove ações offline, revisão estruturada explícita, streaming, substituição/desfazer e rascunho desatualizado bloqueado. **11 clones criados/11 destruídos**, uso de contexto constante em cada sessão-base e três bases destruídas. Idle nativo não foi repetido: fonte ChromeEngine intacta e evidência real da [B](VALIDACAO-STEP-15-B.md) preservada. [Controle nativo](benchmark/step15d/regressions/chrome-native-controls.json).

A auditoria comparativa observou **642 requisições locais GET** no offscreen/Workers, sem corpos, requisições externas ou eventos de console nas campanhas instrumentadas; o primeiro piloto não tinha essa instrumentação. A campanha reservada inclui 360 dessas requisições e 63 auditorias. Regressões Gemma observaram somente código/runtime local, sem erros de página/console e storage com apenas `writingPreferences`; controle Chrome confirmou somente preferências persistidas. A instrumentação evita corpos e parâmetros assinados. Essas observações não medem tráfego de outros aplicativos ou processos do sistema. [Verificação dos artefatos](benchmark/step15d/verification.json).

As [tentativas de regressão](benchmark/step15d/regressions/attempts.json) registram acesso bloqueado ao executável pelo sandbox e esperas do harness corrigidas: conclusão da substituição assíncrona, confirmação de cancelamento e preferência efetivamente renderizada antes de consultar o painel. Não alteramos os prompts após a avaliação reservada, não acrescentamos retentativas ao produto e não convertimos falhas do harness em incompatibilidade de modelo.

`npm.cmd run check` final aprovado: **260 testes em 39 arquivos**, TypeScript, ESLint sem warnings, Prettier e build. Os avisos já existentes do Vite sobre módulos Node externalizados pelas dependências continuam sem erro de build. Foram conferidos os links locais, hashes dos datasets/snapshots/checkpoints/revisões, resumos recalculados, correspondência das 54 fontes medidas com o workspace e integridade dos históricos anteriores. [Checks](benchmark/step15d/checks.json) e [índice de evidências](benchmark/step15d/README.md).

Instalação limpa e fluxo final no WhatsApp pertencem à STEP-16 e não foram iniciados. Não há validação obrigatória pendente nesta subetapa, nem publicação/push.
