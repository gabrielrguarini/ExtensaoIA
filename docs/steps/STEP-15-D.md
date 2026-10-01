# STEP-15-D — Comparação e otimização

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md) · [STEP-15 principal](STEP-15.md)

## Instrução de execução

Executar somente esta subetapa. Ler o plano, progresso e este arquivo. Entregar todo o escopo acumulado, validar no ambiente exigido, revisar o diff e registrar commit próprio conforme [AGENTS.md](../../AGENTS.md). Não iniciar a próxima subetapa. Validação obrigatória pendente mantém Aguardando validação; não transformar interrupção em incompatibilidade presumida.

## Objetivo e pré-requisitos

STEP-15-C concluída. Determinar recomendações por ação e hardware com medidas reais, sem presumir superioridade de Chrome, Gemma ou Transformers.js.

## Tarefas

- Preservar 108 pares históricos e acrescentar **108 rascunhos distintos**, 12 por ação, reservados e anotados antes da avaliação. Separar campanhas/exemplos usados nos prompts de avaliação reservada.
- Completar avaliações obrigatórias dos modelos suportados. Executar blocos de 12 com checkpoints/reinícios; erros, indisponibilidades, interrupções e pendências continuam no relatório/denominador.
- Mesma máquina/casos por candidato, três rodadas quentes. Medir preparação, carregamento com cache, primeiro trecho e resultado completo com mediana/p95. Tokens/s só quando disponíveis. Registrar versões/revisões, parâmetros, Chrome/hardware e limites de medição.
- Avaliar separadamente disponibilidade, utilidade, preservação, mudanças de conteúdo, avisos corretos/indevidos e riscos não sinalizados; avaliação além do próprio modelo. Nenhum risco detectado não garante equivalência.
- Comparar texto original com pipeline histórico mascarado. Ajustar prompts, orçamento e carregamento com evidências, desativando raciocínio prolongado quando suportado. Evitar hashes repetidos na UI.
- Comparar o candidato experimental pt-BR por prompt validado em B, sem declarações de idioma, conforme [protocolo do localstudio](../REFERENCIAS-IA-CHROME.md), e os caminhos declarados que estiverem realmente disponíveis no alvo. Medir idioma efetivo, preservação, utilidade e latência separadamente; disponibilidade genérica não aprova qualidade. Avaliar pouca diferenciação de tons, emojis e acréscimos/instruções indevidas registrados no [smoke B](../VALIDACAO-STEP-15-B.md). Avaliar armazenamento/restauração do cache próprio seguindo o guia Chrome, sem confundir carregamento frio com rodada quente.
- Recomendar ganho de utilidade sem piora de latência ou ganho de velocidade sem perda de utilidade; explicitar trocas, por ação/hardware. Não inventar meta percentual de qualidade.

## Aceite e validação

Campanhas reproduzíveis e retomáveis, casos reservados anotados, três rodadas comparáveis, métricas/avaliação/limitações e recomendações documentadas. Testar troca, cache, reinício, sessões isoladas e offline no hardware real. STEP-15 principal continua Aguardando validação enquanto avaliações obrigatórias estiverem pendentes; interrupção não prova incompatibilidade.

## Evidências e commit

Registrar procedimentos, ambiente, resultados e pendências no progresso e relatório da subetapa. Usar dados sintéticos, npm.cmd run check e commit Conventional Commits com identidade humana configurada. Não publicar nem enviar mensagens automaticamente.

Próxima etapa: [STEP-16](STEP-16.md), somente após solicitação.
