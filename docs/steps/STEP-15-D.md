# STEP-15-D — Comparação e otimização

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md) · [STEP-15 principal](STEP-15.md)

## Objetivo e pré-requisitos

STEP-15-C concluída. Determinar recomendações por ação e hardware com medidas reais, sem presumir superioridade de Chrome, Gemma ou Transformers.js.

## Tarefas

- Preservar 108 pares históricos e acrescentar **108 rascunhos distintos**, 12 por ação, reservados e anotados antes da avaliação. Separar campanhas/exemplos usados nos prompts de avaliação reservada.
- Completar avaliações obrigatórias dos modelos suportados. Executar blocos de 12 com checkpoints/reinícios; erros, indisponibilidades, interrupções e pendências continuam no relatório/denominador.
- Mesma máquina/casos por candidato, três rodadas quentes. Medir preparação, carregamento com cache, primeiro trecho e resultado completo com mediana/p95. Tokens/s só quando disponíveis. Registrar versões/revisões, parâmetros, Chrome/hardware e limites de medição.
- Avaliar separadamente disponibilidade, utilidade, preservação, mudanças de conteúdo, avisos corretos/indevidos e riscos não sinalizados; avaliação além do próprio modelo. Nenhum risco detectado não garante equivalência.
- Comparar texto original com pipeline histórico mascarado. Ajustar prompts, orçamento e carregamento com evidências, desativando raciocínio prolongado quando suportado. Evitar hashes repetidos na UI.
- Usar o [smoke C](../VALIDACAO-STEP-15-C.md) e seu catálogo/revisão como referência do Gemma textual q4f16. Separar verificação integral/carregamento frio (aproximadamente 39 s nesta integração) das rodadas quentes. Avaliar diferenciação de tons e avisos conservadores por capitalização de nomes; estes exemplos de integração não integram automaticamente o conjunto reservado. q4 sem shader-f16 requer inferência real no hardware correspondente antes de recomendação.
- Comparar o candidato experimental pt-BR por prompt validado em B, sem declarações de idioma, conforme [protocolo do localstudio](../REFERENCIAS-IA-CHROME.md), e os caminhos declarados que estiverem realmente disponíveis no alvo. Medir idioma efetivo, preservação, utilidade e latência separadamente; disponibilidade genérica não aprova qualidade. Avaliar pouca diferenciação de tons, emojis e acréscimos/instruções indevidas registrados no [smoke B](../VALIDACAO-STEP-15-B.md). Avaliar armazenamento/restauração do cache próprio seguindo o guia Chrome, sem confundir carregamento frio com rodada quente.
- Recomendar ganho de utilidade sem piora de latência ou ganho de velocidade sem perda de utilidade; explicitar trocas, por ação/hardware. Não inventar meta percentual de qualidade.

## Aceite e validação

Campanhas reproduzíveis e retomáveis, casos reservados anotados, três rodadas comparáveis, métricas/avaliação/limitações e recomendações documentadas. Testar troca, cache, reinício, sessões isoladas e offline no hardware real. STEP-15 principal continua Aguardando validação enquanto avaliações obrigatórias estiverem pendentes; interrupção não prova incompatibilidade.

## Evidências

A campanha STEP-15-D usa cinco candidatos, dataset reservado de 108 rascunhos independentes e checkpoints a cada caso. [Procedimento reproduzível](../benchmark/STEP-15-D.md). Congelar fontes de inferência antes da campanha reservada. Ajustes de prompt usam exclusivamente os exemplos históricos separados como desenvolvimento; não ajustar prompts às respostas reservadas.

No WebLLM, comparar também a delimitação do rascunho como string JSON original, sem ENTITY_*. Contar o texto realmente enviado ao modelo no orçamento de entrada; calcular a saída pelo rascunho original. O piloto mostrou redução de execução de instruções citadas, com aumento de latência e respostas entre aspas. Esse resultado não comprova proteção geral contra instruções no texto nem ganho universal de utilidade.

Relatório com procedimentos, ambiente, resultados, pendências e evidências sintéticas da subetapa.

Entrega final: [STEP-16](STEP-16.md).
