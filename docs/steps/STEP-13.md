# STEP-13 — Consolidar cache, recuperação e desempenho

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Instrução de execução

> Execute somente a etapa indicada. Leia o plano geral e o registro de progresso, confirme os pré-requisitos e implemente integralmente a entrega prevista. Execute as verificações pertinentes e registre os resultados. Não avance para a próxima etapa. Se houver impedimento, registre a causa e o que falta; não marque como concluído algo que não foi validado.

O status desta etapa é mantido exclusivamente em PROGRESSO.md. Não iniciar outra etapa para resolver uma pendência sem registrar o impedimento e respeitar o escopo solicitado.

## Objetivo

Garantir reutilização local dos artefatos e recuperação previsível sem reter mensagens.

## Pré-requisitos

- Ler [PLANO.md](../PLANO.md) e [PROGRESSO.md](../PROGRESSO.md).
- [STEP-12](STEP-12.md) e todas as etapas anteriores concluídas, com evidências registradas.

## Tarefas

- [ ] Gerenciar cache por modelo, variante e revisão; verificar completude e integridade com os mecanismos suportados pelos artefatos e runtime fixados.
- [ ] Detectar downloads interrompidos ou cache inconsistente; oferecer reparo/novo download quando necessário, sem declarar disponibilidade offline indevida.
- [ ] Permitir remover somente os artefatos do modelo selecionado, sem apagar preferências ou dados de outros sites.
- [ ] Reutilizar a sessão entre pedidos independentes e liberar GPU/Worker após cinco minutos sem atividade. Reiniciar a contagem após cada operação concluída.
- [ ] Tratar perda de dispositivo, reinício do Service Worker, encerramento do offscreen e desconexão de abas. Encerrar pedidos afetados e descartar suas respostas.
- [ ] Não retomar automaticamente rascunhos interrompidos: nova geração requer nova ação do usuário.
- [ ] Testar inicialização fria após reiniciar o navegador com rede indisponível e modelo previamente preparado.
- [ ] Documentar que persistência do cache depende do navegador e que sua remoção pode exigir baixar o modelo novamente.

## Limites

- Cache refere-se a artefatos do modelo; não criar cache persistente de mensagens ou sugestões.
- A capacidade offline prometida é da inferência, não do WhatsApp.
- Não simular permanência do Service Worker por keepalive artificial.

## Critérios de conclusão e verificação

- [ ] Modelo íntegro em cache gera resultado após reinício do navegador sem downloads adicionais.
- [ ] Cache incompleto produz orientação correta e mantém o original.
- [ ] Cinco minutos de inatividade liberam recursos sem apagar artefatos.
- [ ] Perda de GPU ou contexto cancela o pedido; reconexão não aplica nem reinicia texto antigo.

Quando uma verificação não puder ser realizada, registrar exatamente o procedimento pendente e usar Aguardando validação ou Bloqueada no progresso, conforme o motivo. Não substituir evidência real por suposição.

## Entrega esperada

- Gerenciamento de cache, descarregamento por inatividade e recuperação.
- Evidência de teste offline após reinício e dos cenários de falha.

## Entrega funcional e commit obrigatório

Seguir [AGENTS.md](../../AGENTS.md): concluir todo o escopo acumulado da etapa, preservar o que já funciona e validar a execução correspondente. Quando houver código, executar npm run check e a validação real exigida pela etapa antes de encerrar. Cada etapa concluída deve gerar um commit próprio; revisar os arquivos preparados e informar seu hash na resposta final. Não declarar conclusão com validação obrigatória ou commit pendente.

Para testes de mensagens que forem realmente necessários, usar exclusivamente o contato @gabrielrguarini, conforme as regras de teste do projeto. Esta autorização não altera a proibição de envio automático pela extensão.

## Encerramento

Atualizar PROGRESSO.md com status, arquivos, verificações executadas, resultados, evidências e impedimentos. Na resposta final, informar o que foi entregue, como conferir e o que falta.

Próxima etapa: [STEP-14](STEP-14.md). **Não iniciá-la nesta execução.**
