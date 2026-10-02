# STEP-15 — Melhorar IA local, integrar Chrome e comparar motores

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Objetivo e execução

Melhorar rapidez e precisão em pt-BR por evidência real. Executar uma subetapa por vez com aceite, relatório e commit próprios; parar ao terminar. [AGENTS.md](../../AGENTS.md) continua obrigatório.

## Pré-requisitos e sequência

STEP-14 concluída; preservar implementação e resultados históricos da STEP-15 parcial.

| Subetapa                  | Entrega                                                            |
| ------------------------- | ------------------------------------------------------------------ |
| [STEP-15-A](STEP-15-A.md) | Sugestões com avisos, contratos e benchmark retomável com WebLLM   |
| [STEP-15-B](STEP-15-B.md) | Tipagens oficiais e Prompt/Rewriter/Proofreader nativos            |
| [STEP-15-C](STEP-15-C.md) | Gemma 4 E2B via Transformers.js/WebGPU                             |
| [STEP-15-D](STEP-15-D.md) | Comparação, otimização e recomendações por ação/hardware           |
| [STEP-15-E](STEP-15-E.md) | Retirar avaliação de conteúdo; revisão e substituição pelo usuário |

## Histórico preservado e pendências

O [relatório original](../VALIDACAO-STEP-15.md) e as evidências canônicas permanecem intactos: 108 pares (12 textos × nove ações) por perfil, 133/324 gerações completas e 191 pendentes nos Qwen. Llama completou 108/108, mediana total 2,14 s, apenas 4/108 sugestões consideradas úteis; Qwen4B 14/108 e 2,63 s; Qwen8B 11/108 e 4,61 s, qualidade incompleta. Os resultados refletem o pipeline histórico de placeholders e bloqueio, não antecipam desempenho do novo fluxo.

O antigo critério de impedir liberação por qualquer risco foi substituído pelo plano aprovado: respostas legíveis ficam disponíveis com avisos; falhas técnicas, cancelamento e perda de vínculo continuam impedindo aplicação. Isso não converte saídas antigas em aprovações nem altera avaliações históricas.

A [STEP-15-B](STEP-15-B.md) confirmou português por instrução de prompt no Chrome instalado, apesar de `pt`/`pt-BR` declarados indisponíveis, e incorporou uma opção experimental manual. A [análise do localstudio e guia de cache](../REFERENCIAS-IA-CHROME.md) serve de referência para C/D/16. O smoke comprova execução, sem antecipar recomendações de velocidade ou precisão da D.

## Aceite da etapa principal

- [ ] A–D concluídas com entrega funcional, validação real e commits próprios.
- [ ] 108 pares históricos e 108 novos rascunhos distintos reservados/anotados, três rodadas por candidato e avaliações obrigatórias completas.
- [ ] Disponibilidade, utilidade, preservação, mudanças e avisos avaliados separadamente; mediana/p95 e limitações explícitas.
- [ ] Rede/logs/storage sem conteúdo real, inferência local e aplicação manual preservadas.

Interrupções não comprovam incompatibilidade; preservar os registros históricos. Validações obrigatórias pendentes mantêm Aguardando validação. A D cobriu os casos antes interrompidos em campanhas novas. O ajuste E deve ser concluído antes da STEP-16. Status exclusivamente em [PROGRESSO.md](../PROGRESSO.md).

## Entrega e encerramento

Arquitetura com vários motores, seleção nativa condicional e modelos locais manuais; evidências reproduzíveis, recomendações medidas e documentação íntegra. npm.cmd run check e validação real conforme cada subetapa. Atualizar progresso, revisar arquivos preparados e confirmar identidade/mensagem/estado Git antes do commit próprio.

Próxima etapa após A–D: [STEP-16](STEP-16.md). Não iniciar automaticamente.

## Ajuste adicional autorizado em 02/10/2026

A [STEP-15-E](STEP-15-E.md) remove a avaliação automática de conteúdo e a análise semântica da interface antes da STEP-16, a pedido do usuário. Esta decisão substitui os requisitos de avisos/avaliação no produto, mantendo as evidências históricas A–D. Copiar e Substituir passam a depender da revisão do usuário; guardas técnicas, cancelamento e vínculo ao rascunho permanecem obrigatórios.
