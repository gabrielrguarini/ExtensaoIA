# STEP-11 — Implementar verificação semântica opcional

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Objetivo

Adicionar revisão local de significado como opção desativada por padrão.

## Pré-requisitos

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
