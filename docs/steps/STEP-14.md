# STEP-14 — Finalizar configurações e interfaces auxiliares

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Instrução de execução

> Execute somente a etapa indicada. Leia o plano geral e o registro de progresso, confirme os pré-requisitos e implemente integralmente a entrega prevista. Execute as verificações pertinentes e registre os resultados. Não avance para a próxima etapa. Se houver impedimento, registre a causa e o que falta; não marque como concluído algo que não foi validado.

O status desta etapa é mantido exclusivamente em PROGRESSO.md. Não iniciar outra etapa para resolver uma pendência sem registrar o impedimento e respeitar o escopo solicitado.

## Objetivo

Consolidar preferências e informações do modelo em interfaces acessíveis, preservando o preview junto ao editor.

## Pré-requisitos

- Ler [PLANO.md](../PLANO.md) e [PROGRESSO.md](../PROGRESSO.md).
- [STEP-13](STEP-13.md) e todas as etapas anteriores concluídas, com evidências registradas.

## Tarefas

- [x] Criar popup e painel lateral para configurações e informações; o fluxo principal permanece junto ao campo do WhatsApp.
- [x] Adicionar a permissão sidePanel apenas quando sua funcionalidade estiver implementada e verificar abertura por gesto do usuário.
- [x] Definir padrões: idioma pt-BR, tema do sistema, Corrigir, Econômico, preservar gírias e emojis existentes, não adicionar novos emojis, revisão semântica desligada.
- [x] Tratar a privacidade local como propriedade obrigatória e informativa, sem interruptor para enviar conteúdo à nuvem.
- [x] Salvar somente preferências em chrome.storage.local, com esquema versionado, validação de dados e migração de configurações anteriores.
- [x] Fazer com que desabilitar adição de emojis preserve os emojis originais. Formalização explicitamente escolhida pode adaptar gírias sem mudar o sentido.
- [x] Exibir modelo, licença, estado do cache e controles de descarga/remoção; diferenciar liberar GPU de remover arquivos baixados.
- [x] Implementar contraste, tema claro/escuro, navegação por teclado, foco previsível e rótulos acessíveis.

## Limites

- Não persistir mensagens, prompts, respostas, contatos ou histórico.
- Não introduzir analytics ou serviços externos.
- Não transferir o preview principal para o painel lateral.

## Critérios de conclusão e verificação

- [x] Preferências permanecem após reiniciar a extensão e dados inválidos recebem padrões seguros.
- [x] Migração preserva preferências válidas e não cria chaves com conteúdo de mensagens.
- [x] Popup, painel e interface junto ao editor refletem as mesmas configurações.
- [x] Fluxos essenciais são utilizáveis por teclado e os padrões correspondem ao plano.

Quando uma verificação não puder ser realizada, registrar exatamente o procedimento pendente e usar Aguardando validação ou Bloqueada no progresso, conforme o motivo. Não substituir evidência real por suposição.

## Entrega esperada

- Interfaces auxiliares, armazenamento versionado e acessibilidade.
- Testes de preferências, migração e sincronização local da interface.

## Entrega funcional e commit obrigatório

Seguir [AGENTS.md](../../AGENTS.md): concluir todo o escopo acumulado da etapa, preservar o que já funciona e validar a execução correspondente. Quando houver código, executar npm run check e a validação real exigida pela etapa antes de encerrar. Cada etapa concluída deve gerar um commit próprio; revisar os arquivos preparados e informar seu hash na resposta final. Não declarar conclusão com validação obrigatória ou commit pendente.

Para testes de mensagens que forem realmente necessários, usar exclusivamente o contato @gabrielrguarini, conforme as regras de teste do projeto. Esta autorização não altera a proibição de envio automático pela extensão.

## Evidências da execução

Procedimentos, resultados, ambiente e limites: [VALIDACAO-STEP-14.md](../VALIDACAO-STEP-14.md).

## Encerramento

Atualizar PROGRESSO.md com status, arquivos, verificações executadas, resultados, evidências e impedimentos. Na resposta final, informar o que foi entregue, como conferir e o que falta.

Próxima etapa: [STEP-15](STEP-15.md). **Não iniciá-la nesta execução.**
