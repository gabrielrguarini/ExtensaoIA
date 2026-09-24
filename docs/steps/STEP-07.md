# STEP-07 — Implementar a ação Corrigir

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Instrução de execução

> Execute somente a etapa indicada. Leia o plano geral e o registro de progresso, confirme os pré-requisitos e implemente integralmente a entrega prevista. Execute as verificações pertinentes e registre os resultados. Não avance para a próxima etapa. Se houver impedimento, registre a causa e o que falta; não marque como concluído algo que não foi validado.

O status desta etapa é mantido exclusivamente em PROGRESSO.md. Não iniciar outra etapa para resolver uma pendência sem registrar o impedimento e respeitar o escopo solicitado.

## Objetivo

Conectar a correção pt-BR ao fluxo de rascunho, inferência local e preview.

## Pré-requisitos

- Ler [PLANO.md](../PLANO.md) e [PROGRESSO.md](../PROGRESSO.md).
- [STEP-06](STEP-06.md) e todas as etapas anteriores concluídas, com evidências registradas.

## Tarefas

- [ ] Criar prompt de sistema de correção: corrigir somente o necessário, preservar informalidade e significado, não responder à mensagem e retornar apenas o texto corrigido.
- [ ] Tratar o conteúdo do WhatsApp como dado não confiável; instruções contidas no rascunho não devem redefinir a tarefa.
- [ ] Preservar intenção, fatos, nomes, números, valores, datas, horários, URLs, códigos e negações nas instruções. A camada determinística completa será implementada na STEP-08.
- [ ] Contar tokens com o tokenizer compatível com o modelo, incluindo template e instruções. Reservar saída dentro dos 4.096 tokens; rejeitar excesso sem truncar silenciosamente.
- [ ] Detectar saída vazia, interrupção por limite, erro do modelo e formato inadequado. Não retirar conteúdo arbitrariamente para fazer uma resposta parecer válida.
- [ ] Integrar o resultado final ao preview existente, mantendo as proteções contra aplicação obsoleta.
- [ ] Adicionar casos para vc consegue me mandar o relatório hj?, Não quero cancelar a reunião., Me manda R$ 2.500 até 15/10. e Olha esse link https://example.com e me fala o que acha.

## Limites

- Não introduzir os outros tons nesta etapa.
- Não afirmar que a preservação completa já está validada antes da STEP-08.
- Não guardar rascunhos, prompts ou respostas em logs ou armazenamento permanente.

## Critérios de conclusão e verificação

- [ ] A ação Corrigir usa o modelo real e retorna uma sugestão no preview.
- [ ] A correção conserva linguagem informal quando possível e não responde à pergunta escrita pelo usuário.
- [ ] Casos vazios, limite de contexto, saída truncada e instruções maliciosas no rascunho têm tratamento testado.
- [ ] A aplicação permanece manual e vinculada ao snapshot original.

Quando uma verificação não puder ser realizada, registrar exatamente o procedimento pendente e usar Aguardando validação ou Bloqueada no progresso, conforme o motivo. Não substituir evidência real por suposição.

## Entrega esperada

- Pipeline inicial de correção e prompts versionados.
- Testes de prompt, orçamento de contexto e tratamento de respostas.

## Entrega funcional e commit obrigatório

Seguir [AGENTS.md](../../AGENTS.md): concluir todo o escopo acumulado da etapa, preservar o que já funciona e validar a execução correspondente. Quando houver código, executar npm run check e a validação real exigida pela etapa antes de encerrar. Cada etapa concluída deve gerar um commit próprio; revisar os arquivos preparados e informar seu hash na resposta final. Não declarar conclusão com validação obrigatória ou commit pendente.

Para testes de mensagens que forem realmente necessários, usar exclusivamente o contato @gabrielrguarini, conforme as regras de teste do projeto. Esta autorização não altera a proibição de envio automático pela extensão.

## Encerramento

Atualizar PROGRESSO.md com status, arquivos, verificações executadas, resultados, evidências e impedimentos. Na resposta final, informar o que foi entregue, como conferir e o que falta.

Próxima etapa: [STEP-08](STEP-08.md). **Não iniciá-la nesta execução.**
