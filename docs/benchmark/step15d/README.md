# Evidências da STEP-15-D

[Relatório e recomendações](../../VALIDACAO-STEP-15-D.md) · [Procedimento](../STEP-15-D.md) · [Progresso](../../PROGRESSO.md)

Somente dados sintéticos. Artefatos históricos das etapas anteriores permanecem intactos. Pesos, caches, capturas de conversas e diretórios temporários não pertencem a este registro.

| Campanha | Finalidade | Resultados e revisão |
|---|---|---|
| training-baseline-03 | Piloto: prompts anteriores, 12 pares conhecidos por candidato | [Resumo](training-baseline-03/summary.json) · [Revisão](training-baseline-03/review.json) |
| training-compact-01 | Piloto descartado: prompt compacto | [Resumo](training-compact-01/summary.json) · [Revisão](training-compact-01/review.json) |
| training-quoted-01 | Piloto: delimitação JSON; seleção final conforme relatório | [Resumo](training-quoted-01/summary.json) · [Revisão](training-quoted-01/review.json) |
| history-original-final-03 | Histórico com texto original, retomado de 24 para 324 casos | [Resumo](history-original-final-03/summary.json) · [Revisão](history-original-final-03/review.json) · [Retomada](history-original-final-03/resume-proof.json) |
| history-legacy-final-01 | Comparação pareada ENTITY_*: 324 pedidos, recusas separadas de erros | [Resumo](history-legacy-final-01/summary.json) · [Revisão](history-legacy-final-01/review.json) |
| reserved-final-01 | 108 textos reservados × cinco candidatos × três rodadas | [Resumo](reserved-final-01/summary.json) · [Revisão](reserved-final-01/review.json) |

Cada diretório contém dataset anotado antes da inferência, metadata com hashes/configuração, snapshot das fontes, resultados JSONL, checkpoints, revisão independente e resumo calculado. A auditoria de rede observa offscreen/Workers reais; o primeiro piloto ainda não tinha essa instrumentação. A preparação inicial com download desse piloto não representa carregamento com cache.

A revisão foi realizada pela IA executora, independente dos modelos avaliados. Não houve avaliação humana cega nem calibração de notas. O hash de cada anotação identifica o resultado específico inspecionado; saídas idênticas do mesmo ID compartilham julgamento, mantendo registros separados por rodada. Resultados indisponíveis não recebem notas de qualidade inventadas.

[Tentativas preliminares do harness](harness-attempts.json) registram falhas antes da inferência. Elas não foram convertidas em incompatibilidade dos modelos.

[Verificação integral](verification.json) vincula os datasets, snapshots, checkpoints, revisões e resumos, além de conferir as fontes medidas contra o código final. Foram executados 2.448 pedidos comparativos e revisadas todas as 2.314 sugestões disponíveis; recusas e erros permanecem nos resultados.

[Checks finais](checks.json) · [SHA-256 de todos os arquivos canônicos](SHA256SUMS.json)

Regressões do pacote 0.15.3: [WebLLM](regressions/webllm-smoke.json), [Gemma/idle](regressions/gemma-controls.json), [cache incompleto/consentimento](regressions/gemma-cache-consent.json) e [Chrome nativo](regressions/chrome-native-controls.json). [Tentativas de regressão](regressions/attempts.json) distinguem limitações do ambiente e sincronização dos testes de falhas do produto. Não houve envio de mensagens.
