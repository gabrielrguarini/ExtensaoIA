# STEP-10 — Exibir geração progressiva e cancelamento

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Objetivo

Mostrar o andamento da geração e permitir interrupção real sem resultados parciais aplicáveis.

## Pré-requisitos

- [STEP-09](STEP-09.md) e todas as etapas anteriores concluídas, com evidências registradas.

## Tarefas

- [x] Conectar os fragmentos do AsyncIterable aos eventos tipados de progresso e à interface.
- [x] Mostrar os estados Gerando e Validando; manter Substituir e Copiar desabilitados até a aprovação final.
- [x] Restaurar entidades antes de exibir os trechos; reter fragmentos ambíguos de placeholders para não expor marcadores internos.
- [x] Implementar Cancelar no caminho completo: interface, roteador, offscreen e runtime. Cancelar também a revisão extra quando ela for adicionada.
- [x] Descartar tokens e eventos tardios usando requestId e revisão do editor. Limpar buffers ao cancelar, trocar de contexto ou perder a conexão.
- [x] Não confundir fechar o preview com conclusão da geração; fechar ou cancelar deve encerrar o pedido correspondente.
- [x] Limitar atualizações visuais para manter a interface responsiva.

## Limites

- Streaming não torna texto parcial válido.
- Não deixar o modelo trabalhando silenciosamente depois de um cancelamento confirmado.
- Não apresentar progresso de download como progresso de geração.

## Critérios de conclusão e verificação

- [x] Cancelar interrompe a geração real e libera a solicitação ativa.
- [x] Nenhum fragmento atrasado aparece em outro pedido ou aba.
- [x] Placeholders divididos entre vários fragmentos nunca aparecem ao usuário.
- [x] Aplicação e cópia só são habilitadas após geração completa e validação favorável.

Quando uma verificação não puder ser realizada, registrar exatamente o procedimento pendente e usar Aguardando validação ou Bloqueada no progresso, conforme o motivo. Não substituir evidência real por suposição.

## Entrega esperada

- Streaming visual e cancelamento ponta a ponta.
- Testes de corrida, buffers, desconexão e eventos tardios.
