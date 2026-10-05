# STEP-07 — Implementar a ação Corrigir

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Objetivo

Conectar a correção pt-BR ao fluxo de rascunho, inferência local e preview.

## Pré-requisitos

- [STEP-06](STEP-06.md) e todas as etapas anteriores concluídas, com evidências registradas.

## Tarefas

- [x] Criar prompt de sistema de correção: corrigir somente o necessário, preservar informalidade e significado, não responder à mensagem e retornar apenas o texto corrigido.
- [x] Tratar o conteúdo do WhatsApp como dado não confiável; instruções contidas no rascunho não devem redefinir a tarefa.
- [x] Preservar intenção, fatos, nomes, números, valores, datas, horários, URLs, códigos e negações nas instruções. A camada determinística completa será implementada na STEP-08.
- [x] Contar tokens com o tokenizer compatível com o modelo, incluindo template e instruções. Reservar saída dentro dos 4.096 tokens; rejeitar excesso sem truncar silenciosamente.
- [x] Detectar saída vazia, interrupção por limite, erro do modelo e formato inadequado. Não retirar conteúdo arbitrariamente para fazer uma resposta parecer válida.
- [x] Integrar o resultado final ao preview existente, mantendo as proteções contra aplicação obsoleta.
- [x] Adicionar casos para vc consegue me mandar o relatório hj?, Não quero cancelar a reunião., Me manda R$ 2.500 até 15/10. e Olha esse link https://example.com e me fala o que acha.

## Limites

- Não introduzir os outros tons nesta etapa.
- Não afirmar que a preservação completa já está validada antes da STEP-08.
- Não guardar rascunhos, prompts ou respostas em logs ou armazenamento permanente.

## Critérios de conclusão e verificação

- [x] A ação Corrigir usa o modelo real e retorna uma sugestão no preview.
- [x] A correção conserva linguagem informal quando possível e não responde à pergunta escrita pelo usuário.
- [x] Casos vazios, limite de contexto, saída truncada e instruções maliciosas no rascunho têm tratamento testado.
- [x] A aplicação permanece manual e vinculada ao snapshot original.

Quando uma verificação não puder ser realizada, registrar exatamente o procedimento pendente e usar Aguardando validação ou Bloqueada no progresso, conforme o motivo. Não substituir evidência real por suposição.

## Entrega esperada

- Pipeline inicial de correção e prompts versionados.
- Testes de prompt, orçamento de contexto e tratamento de respostas.

Procedimento, resultados reais e limites da guarda inicial: [VALIDACAO-STEP-07.md](../VALIDACAO-STEP-07.md). O status permanece exclusivamente em PROGRESSO.md.
