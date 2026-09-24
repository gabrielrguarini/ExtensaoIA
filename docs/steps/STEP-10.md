# STEP-10 — Exibir geração progressiva e cancelamento

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Instrução de execução

> Execute somente a etapa indicada. Leia o plano geral e o registro de progresso, confirme os pré-requisitos e implemente integralmente a entrega prevista. Execute as verificações pertinentes e registre os resultados. Não avance para a próxima etapa. Se houver impedimento, registre a causa e o que falta; não marque como concluído algo que não foi validado.

O status desta etapa é mantido exclusivamente em PROGRESSO.md. Não iniciar outra etapa para resolver uma pendência sem registrar o impedimento e respeitar o escopo solicitado.

## Objetivo

Mostrar o andamento da geração e permitir interrupção real sem resultados parciais aplicáveis.

## Pré-requisitos

- Ler [PLANO.md](../PLANO.md) e [PROGRESSO.md](../PROGRESSO.md).
- [STEP-09](STEP-09.md) e todas as etapas anteriores concluídas, com evidências registradas.

## Tarefas

- [ ] Conectar os fragmentos do AsyncIterable aos eventos tipados de progresso e à interface.
- [ ] Mostrar os estados Gerando e Validando; manter Substituir e Copiar desabilitados até a aprovação final.
- [ ] Restaurar entidades antes de exibir os trechos; reter fragmentos ambíguos de placeholders para não expor marcadores internos.
- [ ] Implementar Cancelar no caminho completo: interface, roteador, offscreen e runtime. Cancelar também a revisão extra quando ela for adicionada.
- [ ] Descartar tokens e eventos tardios usando requestId e revisão do editor. Limpar buffers ao cancelar, trocar de contexto ou perder a conexão.
- [ ] Não confundir fechar o preview com conclusão da geração; fechar ou cancelar deve encerrar o pedido correspondente.
- [ ] Limitar atualizações visuais para manter a interface responsiva.

## Limites

- Streaming não torna texto parcial válido.
- Não deixar o modelo trabalhando silenciosamente depois de um cancelamento confirmado.
- Não apresentar progresso de download como progresso de geração.

## Critérios de conclusão e verificação

- [ ] Cancelar interrompe a geração real e libera a solicitação ativa.
- [ ] Nenhum fragmento atrasado aparece em outro pedido ou aba.
- [ ] Placeholders divididos entre vários fragmentos nunca aparecem ao usuário.
- [ ] Aplicação e cópia só são habilitadas após geração completa e validação favorável.

Quando uma verificação não puder ser realizada, registrar exatamente o procedimento pendente e usar Aguardando validação ou Bloqueada no progresso, conforme o motivo. Não substituir evidência real por suposição.

## Entrega esperada

- Streaming visual e cancelamento ponta a ponta.
- Testes de corrida, buffers, desconexão e eventos tardios.

## Entrega funcional e commit obrigatório

Seguir [AGENTS.md](../../AGENTS.md): concluir todo o escopo acumulado da etapa, preservar o que já funciona e validar a execução correspondente. Quando houver código, executar npm run check e a validação real exigida pela etapa antes de encerrar. Cada etapa concluída deve gerar um commit próprio; revisar os arquivos preparados e informar seu hash na resposta final. Não declarar conclusão com validação obrigatória ou commit pendente.

Para testes de mensagens que forem realmente necessários, usar exclusivamente o contato @gabrielrguarini, conforme as regras de teste do projeto. Esta autorização não altera a proibição de envio automático pela extensão.

## Encerramento

Atualizar PROGRESSO.md com status, arquivos, verificações executadas, resultados, evidências e impedimentos. Na resposta final, informar o que foi entregue, como conferir e o que falta.

Próxima etapa: [STEP-11](STEP-11.md). **Não iniciá-la nesta execução.**
