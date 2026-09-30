# STEP-11 — Implementar verificação semântica opcional

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Instrução de execução

> Execute somente a etapa indicada. Leia o plano geral e o registro de progresso, confirme os pré-requisitos e implemente integralmente a entrega prevista. Execute as verificações pertinentes e registre os resultados. Não avance para a próxima etapa. Se houver impedimento, registre a causa e o que falta; não marque como concluído algo que não foi validado.

O status desta etapa é mantido exclusivamente em PROGRESSO.md. Não iniciar outra etapa para resolver uma pendência sem registrar o impedimento e respeitar o escopo solicitado.

## Objetivo

Adicionar revisão local de significado como opção desativada por padrão.

## Pré-requisitos

- Ler [PLANO.md](../PLANO.md) e [PROGRESSO.md](../PROGRESSO.md).
- [STEP-10](STEP-10.md) e todas as etapas anteriores concluídas, com evidências registradas.

## Tarefas

- [x] Definir a preferência de revisão semântica com padrão false. Disponibilizar um controle mínimo antes de consolidar as configurações na STEP-14.
- [x] Executar a análise somente após a validação determinística, comparando original e sugestão restaurada como dados não confiáveis.
- [x] Criar contrato validado de resposta com valid, meaningPreserved e issues. Se houver entitiesPreserved, confrontá-lo com a validação determinística.
- [x] Tratar saída inválida, erro, ausência de resposta, cancelamento ou reprovação como impossibilidade de liberar a sugestão quando a opção estiver ligada.
- [x] Usar a mesma instância do modelo de forma sequencial, sem acumular uma conversa entre pedidos e sem carregar um segundo modelo simultaneamente.
- [x] Se confidence for retornado, tratá-lo como informação não calibrada; não convertê-lo em garantia de precisão.
- [x] Criar testes com alterações de fatos, pedido versus afirmação, inclusão/remoção de negação e entidades mantidas apesar de mudança de sentido.

## Limites

- A opção permanece desligada por padrão, conforme escolha do usuário.
- A análise semântica nunca sobrepõe uma reprovação determinística.
- Não implementar ciclos automáticos ilimitados de reescrita e revisão.

## Critérios de conclusão e verificação

- [x] Com a opção desligada, não ocorre a segunda geração e as verificações determinísticas permanecem ativas.
- [x] Com a opção ligada, resultados só são liberados após resposta válida e aprovação de significado.
- [x] O conjunto de casos conhecidos de mudança de sentido é detectado; registrar falhas do modelo real sem escondê-las.
- [x] Erro e cancelamento da revisão preservam o rascunho e impedem aplicar resultado não validado.

Quando uma verificação não puder ser realizada, registrar exatamente o procedimento pendente e usar Aguardando validação ou Bloqueada no progresso, conforme o motivo. Não substituir evidência real por suposição.

## Entrega esperada

- Verificador opcional, preferência e contrato de validação.
- Testes automatizados e avaliação das saídas reais do verificador.

## Entrega funcional e commit obrigatório

Seguir [AGENTS.md](../../AGENTS.md): concluir todo o escopo acumulado da etapa, preservar o que já funciona e validar a execução correspondente. Quando houver código, executar npm run check e a validação real exigida pela etapa antes de encerrar. Cada etapa concluída deve gerar um commit próprio; revisar os arquivos preparados e informar seu hash na resposta final. Não declarar conclusão com validação obrigatória ou commit pendente.

Para testes de mensagens que forem realmente necessários, usar exclusivamente o contato @gabrielrguarini, conforme as regras de teste do projeto. Esta autorização não altera a proibição de envio automático pela extensão.

## Encerramento

Atualizar PROGRESSO.md com status, arquivos, verificações executadas, resultados, evidências e impedimentos. Na resposta final, informar o que foi entregue, como conferir e o que falta.

Próxima etapa: [STEP-12](STEP-12.md). **Não iniciá-la nesta execução.**
