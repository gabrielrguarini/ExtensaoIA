# Validação da STEP-15 — benchmark pt-BR

[Plano](PLANO.md) · [Progresso](PROGRESSO.md) · [Etapa](steps/STEP-15.md) · [Como reproduzir](benchmark/README.md)

## Resultado e aceite

**Aguardando validação.** Dataset, executor, revisão, agregação e evidências estão disponíveis. A rodada final planejou **324 pares modelo/caso**, mantendo 108 no denominador de cada perfil. Foram concluídas **133 gerações reais**: 108 no Llama 3.2 3B, 14 no Qwen3 4B e 11 no Qwen3 8B. Restam **191 resultados** dos Qwen sem execução concluída. Não afirmar que os três modelos completaram o benchmark nem concluir a etapa.

O ensaio inicial encontrou cinco mudanças conhecidas de fato/intenção em saídas liberadas pelo Llama. As guardas foram corrigidas e a rodada final bloqueou essas cinco sugestões. Nas 36 sugestões liberadas e revisadas da rodada final não se encontrou nova troca de entidade, fato ou pedido. Há defeitos de estilo e utilidade registrados. Essa observação parcial não substitui os 191 casos restantes nem prova equivalência geral.

Os Qwen pararam durante a campanha contínua. Houve pressão de memória, VRAM global próxima de 8 GB, erro de falta de memória num PowerShell e falha de lançamento de processo indicando arquivo de paginação insuficiente. Também se observaram somente **2.652.909.568 bytes livres em C:** ao final. Esses eventos são evidência de limitações do ambiente; a causa exata da estagnação do runtime não foi isolada. Não declarar incompatibilidade absoluta dos modelos: ambos carregaram e produziram saídas reais. Nenhuma configuração de RAM, paginação, GPU ou sistema foi modificada.

## Conjunto e metodologia

[Dataset anotado](../tests/benchmark/cases.ts): 12 rascunhos fictícios × Corrigir, Melhorar, Formal, Profissional, Amigável, Natural, Conciso, Engraçado e Reescrever. São 108 pares distintos, 12 por ação, e não 108 textos independentes. Incluem informal/profissional, curto/longo, gírias, abreviações, números, datas, URLs/email, emojis compostos, negativas, nomes, valores, condições, incerteza, papéis de remetente/destinatário e comandos escritos no rascunho.

Entidades, fatos invariantes, intenção e critérios de gramática/naturalidade foram definidos **antes da primeira inferência**, sem resposta literal única obrigatória. Os mesmos pares e sua ordem foram usados nos perfis. A revisão textual foi feita pela IA executora da tarefa, independentemente dos modelos locais avaliados, confrontando todas as saídas concluídas com as anotações. Não é avaliação humana cega, julgamento do próprio modelo nem pontuação calibrada. Não há mensagens reais, identificação de contatos ou envio no WhatsApp.

O harness temporário executou em Worker local, na origem da extensão instalada, o mesmo `WebLLMEngine`, proteção, restauração e `validateActionOutput` do produto. A instrumentação numérica é opcional e não persiste/loga conteúdo no produto. Somente o runner externo grava a ficção fixa. O navegador foi reiniciado entre os perfis da rodada final. Cada geração limpou o chat; revisão semântica adicional permaneceu desligada, conforme padrão do produto. Não foi usado outro LLM como juiz.

Após a prontidão do modelo, o contexto foi colocado **offline antes dos casos**. A preparação pode baixar pesos públicos fixados; não há serviço de inferência externo. Na rodada final, nenhuma requisição HTTPS de host fora dos dois repositórios permitidos foi observada pelo harness. A auditoria completa da extensão pertence à STEP-16 e não foi antecipada.

## Ambiente e parâmetros

- Data: **01/10/2026**, fuso de relato America/Sao_Paulo; timestamps das evidências em UTC.
- Windows 10.0.26200 x64; Intel Core i9-13980HX; RAM física medida pelo sistema: **16.779.935.744 bytes** (aproximadamente 15,63 GiB).
- NVIDIA GeForce RTX 4060 Laptop GPU; VRAM física informada: **8.188 MiB**; driver **555.97**; adaptador WebGPU NVIDIA/lovelace, `shader-f16` disponível.
- Chrome for Testing **154.0.8037.0**, visível, perfil dedicado `step15-isolated`, sem autenticação, controle por pipe sem porta TCP.
- Pacote/Manifest **0.14.0**; Node **22.14.0**, npm **10.9.2**; WebLLM **0.2.82**, tokenizer **0.1.6**, versões diretas/transitivas fixadas no lockfile. O ajuste local de `powerPreference` no Windows permaneceu o mesmo.
- Temperatura **0**, contexto **4.096 tokens**, orçamento de saída calculado com tokenizer/template reais e registrado por caso em `metrics.maxTokens`. Qwen com `enable_thinking: false`; preservar gírias, sem novos emojis, revisão semântica adicional desligada.

| Perfil      | Modelo/variante efetivamente carregados | Revisão dos pesos                          |
| ----------- | --------------------------------------- | ------------------------------------------ |
| Econômico   | Llama-3.2-3B-Instruct-q4f16_1-MLC       | `1e80abf71e3d17cd564e2d2b63caa15cb226018e` |
| Equilibrado | Qwen3-4B-q4f16_1-MLC                    | `a5c9fab855e3ccbdfed2e7e69683d75f30332161` |
| Qualidade   | Qwen3-8B-q4f16_1-MLC                    | `b3d55c289eae58f77095f5b68c895eeea358ee09` |

Não foram executadas variantes f32, outra GPU ou outras versões de Chrome. [Metadados finais](benchmark/step15/final-01/metadata.json) contêm URLs fixas, limites do adaptador, hashes do núcleo, dataset, lockfile e WASMs. [Snapshot do núcleo medido](benchmark/step15/final-01/source-snapshot.json) registra a implementação da rodada. O dataset tem SHA-256 `d564c86b7d8bb1b6e524c96b6e30951e8318c9e24e822f9bf69297e09457287a`.

## Resultados finais, sem excluir casos difíceis

| Perfil      | Denominador | Gerações concluídas | Liberadas | Recusadas | Sem resultado concluído | Liberadas preservadas / todos |  Úteis / todos |
| ----------- | ----------: | ------------------: | --------: | --------: | ----------------------: | ----------------------------: | -------------: |
| Econômico   |         108 |                 108 |        11 |        97 |                       0 |               11/108 (10,19%) |  4/108 (3,70%) |
| Equilibrado |         108 |                  14 |        14 |         0 |                      94 |               14/108 (12,96%) |  6/108 (5,56%) |
| Qualidade   |         108 |                  11 |        11 |         0 |                      97 |               11/108 (10,19%) |  6/108 (5,56%) |
| Total       |         324 |                 133 |        36 |        97 |                     191 |               36/324 (11,11%) | 16/324 (4,94%) |

Os 191 registros sem resultado carregam `executionComplete: false` e a causa `BENCHMARK_IDLE_TIMEOUT`, sem texto/tempo/tokens fabricados. O campo técnico `generationErrors` agrega essas linhas; são **duas interrupções de campanha**, não 191 inferências concluídas com erro. O registro não prova que cada uma dessas linhas chegou a iniciar a GPU. Todas continuam no denominador e no aceite pendente.

No Qwen 4B concluíram B01 nas nove ações e B02 até Amigável. No Qwen 8B concluíram B01 nas nove ações e B02 em Corrigir/Melhorar. As demais linhas são identificáveis em [resultados](benchmark/step15/final-01/results.jsonl). Logo os números dos Qwen não são comparação completa de qualidade com o Llama nem amostra representativa das categorias difíceis.

“Útil” exige sugestão liberada, preservação, gramática/naturalidade conforme anotação e benefício para a ação. Saída idêntica ao original não recebe utilidade de transformação. Retirada de gíria apesar da preferência, emoji mal posicionado, conjugação não corrigida e mera correção no modo Reescrever foram penalizados, sem confundir estilo com troca de remetente, fato ou pedido. O texto longo inalterado liberado pelo Llama é seguro, mas não ganha utilidade. O Llama mostrou qualidade baixa neste conjunto; não prometer benefício a partir da existência do botão.

As avaliações por linha e notas estão em [review.json](benchmark/step15/final-01/review.json), vinculadas por hashes aos dados. [summary.json](benchmark/step15/final-01/summary.json) inclui cobertura/aceite por perfil, mediana/p95, medidas indisponíveis e distribuição por ação.

## Desempenho observado

Tempos por caso excluem download/carregamento e interação com a interface. Incluem preparação do tokenizer quando necessária, geração, limpeza do chat e validação. Cada linha com medida entra na distribuição, incluindo recusas. Valores sem resultado são indisponíveis, jamais zero.

| Perfil      | Medidas / denominador | Primeiro trecho mediana / p95 | Total mediana / p95 | Decode tokens/s mediana / p95 |
| ----------- | --------------------: | ----------------------------: | ------------------: | ----------------------------: |
| Econômico   |               108/108 |              1.614 / 2.513 ms |    2.139 / 4.523 ms |                 38,83 / 41,55 |
| Equilibrado |                14/108 |              2.033 / 4.038 ms |    2.630 / 5.072 ms |                 22,47 / 27,46 |
| Qualidade   |                11/108 |              3.770 / 6.777 ms |    4.609 / 8.052 ms |                 20,45 / 20,98 |

Há **94 e 97 medidas indisponíveis**, respectivamente, nos Qwen. Não extrapolar esses percentis para toda a campanha. Primeiro token interno, tokens do prompt/saída e `maxTokens` também estão por caso. Tokens/s vêm de `usage.extra.decode_tokens_per_s`, conforme tipos da versão travada e [API de streaming WebLLM](https://webllm.mlc.ai/docs/user/basic_usage.html); não são estimativa por caracteres ou velocidade da UI. Sem controle térmico/isolamento de outros processos, nem múltiplas repetições por par: não são números universais ou estudo estatístico de hardware.

| Perfil      | Frio inicial até pronto | Preparação anterior à GPU | Carregamento da GPU | Initialize quente residente |
| ----------- | ----------------------: | ------------------------: | ------------------: | --------------------------: |
| Econômico   |                143,50 s |                  135,60 s |              7,90 s |                     0,00 ms |
| Equilibrado |                180,74 s |                  172,13 s |              8,61 s |                     0,00 ms |
| Qualidade   |                375,72 s |                  355,81 s |             19,92 s |                     0,10 ms |

Preparação inclui conferência, cache e download quando necessário; não mede a rede isoladamente. Zeros no initialize quente refletem a resolução do relógio e o retorno imediato da instância pronta, não custo físico zero.

Após novos reinícios, o ensaio de carga inteiramente offline retornou `DOWNLOAD_REQUIRED` em Econômico (111,40 ms) e Equilibrado (94,90 ms): são **falhas de disponibilidade de cache**, não carregamentos bem-sucedidos nem desempenho de inferência. Qualidade carregou offline em **64,85 s**, incluindo 46,46 s de preparação e 18,39 s de GPU. [Registros](benchmark/step15/final-01/cached-loads.jsonl). A disponibilidade simultânea dos três caches não foi demonstrada; a baixa folga de disco coincide com perda de artefatos anteriores, mas não foi provada a causa de remoção. A aplicação recusa cache ausente em vez de baixar silenciosamente.

## Memória: medição, estimativa e ausência

| Informação                                             |    Econômico |  Equilibrado |    Qualidade | Natureza                                     |
| ------------------------------------------------------ | -----------: | -----------: | -----------: | -------------------------------------------- |
| Memória do modelo no catálogo                          |  2.263,69 MB |  3.431,59 MB |  5.695,78 MB | Estimativa, não consumo medido               |
| VRAM global usada no instante de prontidão             |    2.349 MiB |    2.931 MiB |    5.155 MiB | Medição `nvidia-smi` de todo o equipamento   |
| VRAM exata atribuída ao modelo / pico / heap da sessão | Indisponível | Indisponível | Indisponível | Não inferir pela diferença nem pelo catálogo |

VRAM global de **7.781 MiB usada / 177 MiB livre**, com utilização de GPU 0%, foi observada durante estagnação do Qwen 4B. O valor é uma amostra do sistema, não pico instrumentado nem prova de vazamento específico. Em WDDM, memória por processo apareceu como N/A. RAM física e folga de disco foram medidas do sistema; não foram feitas medições contínuas de RAM/commit ou alterações de paginação.

## Defeitos, validadores e experimentos

1. **Cinco falsos negativos iniciais**, todos no Llama: B01-Reescrever trocou verificação por envio de arquivo; B03-Formal/Profissional transformaram a quantidade em quem confirmou; B03-Conciso mudou papéis; B07-Formal omitiu o envelope e criou pergunta sobre status dos emojis. [Resultados iniciais](benchmark/step15/baseline-01/results.jsonl) e [revisão](benchmark/step15/baseline-01/review.json). A campanha inicial também foi interrompida; há 122 resultados reais e 202 linhas sem resultado, preservadas no denominador, com o [registro observado original](benchmark/step15/baseline-01/observed-results.jsonl).
2. **Correção aplicada:** conferir ordem de slots, preposições próximas e vínculo de quantidade ao substantivo; bloquear famílias de ações trocadas/removidas, perda de condição/incerteza/autor e desaparecimento de local/recipiente. Aberturas comuns de oração deixam de ser tratadas como novos nomes. Guardas não interpretam toda a língua; podem recusar sinônimos e mudanças legítimas de construção. Os cinco defeitos específicos foram barrados na execução final. Nenhum falso negativo novo foi identificado nas saídas liberadas concluídas, sem extrapolar para linhas pendentes.
3. **Falsos positivos conhecidos:** controles C02 (construção inversa legítima de envio/recebimento) e C04 (Encaminhe classificado como novo nome) foram recusados. Nos oito [controles anotados](../tests/benchmark/controls.ts), dois válidos passaram, dois válidos foram recusados e quatro inválidos foram bloqueados. [Evidência](benchmark/step15/validator-controls.json). Esses controles executam o validador real sem IA, ficam fora do denominador de gerações e não substituem WebGPU. Nas 97 recusas efetivamente produzidas pelo Llama final, não foi identificado candidato completo preservado com formato exato; marcadores malformados não são falsos positivos de preservação completa.
4. **Regressão experimental de prompt:** uma tentativa de retirar exemplos e compactar instruções gerou respostas ao autor e recusas indevidas; foi abandonada, restaurando integralmente os prompts funcionais anteriores. [Experimento separado](benchmark/step15/experiment-compact-prompt/status.json), com registros e hashes; não afirmar revisão integral ou reprodução completa dessa versão transitória, cujo snapshot não foi preservado. Não integra o aceite nem substitui a rodada final.
5. **Limite de recursos em campanha contínua:** Qwen 4B estagnou depois de 14 resultados em duas rodadas; Qwen 8B depois de 11 na rodada final. O watchdog externo registrou todos os IDs restantes, fechou somente o Chrome dedicado e não repetiu automaticamente pedidos. A execução final terminou com exit code não zero e dois eventos de erro de página; a contagem foi preservada, mas seus detalhes textuais não foram capturados. Não esconder esse resultado como sucesso.
6. **Utilidade e estilo:** saídas idênticas, formalização excessiva, gírias omitidas e emoji pouco natural continuam registradas. Revisão semântica opcional desligada por padrão e guardas determinísticas não constituem prova geral de sentido.

## Extensão instalável e verificações

O pacote instalado no Chrome foi exercitado separadamente com o perfil Qualidade já em cache, em fixture sintética UTF-8, **offline**: clicar Corrigir, obter prévia preservando pergunta/emoji, conferir rascunho intacto, Substituir explicitamente e desfazer por Ctrl+Z. Resultado: original restaurado, nenhum envio e **zero erros de página** nesse fluxo. [Evidência](benchmark/step15/smoke.json), [roteiro](../tests/browser/step15-smoke.mjs). Isso valida o fluxo acumulado correspondente, sem substituir os 191 casos pendentes ou alegar novo teste em conversa real.

Os comandos de execução/revisão estão em [benchmark/README.md](benchmark/README.md). O relatório pode ser recalculado somente com Node local; os hashes impedem aplicar uma revisão a outra geração. O agregador retorna exit code 2 para a rodada final, pois existem resultados pendentes. O check do projeto é registrado no progresso após sua execução, antes do commit. O build final remove o harness temporário de `dist`; dados de benchmark nunca são incluídos na extensão.

## Trabalho necessário para concluir

- Disponibilizar folga suficiente de RAM/commit/paginação/disco e investigar a estagnação do runtime com consumo medido; não modificar o sistema ou remover dados alheios automaticamente.
- Reexecutar integralmente os 108 pares nos Qwen, registrar sucessos/falhas reais e revisar cada nova saída. Não reutilizar a revisão atual para novas gerações.
- Medir novamente cargas frias offline após preparação/cache de cada perfil, registrando ausência/evicção separadamente de sucesso.
- Confirmar ausência de alterações conhecidas entre todas as saídas liberadas da nova campanha, revisar os defeitos de utilidade e registrar o aceite e seu commit de conclusão.

Nenhuma STEP-16 foi iniciada. O commit desta execução registra trabalho e evidências **parciais**, não conclusão da STEP-15.
