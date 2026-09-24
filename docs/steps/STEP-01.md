# STEP-01 — Organizar o plano e o acompanhamento

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Instrução de execução

> Execute somente a etapa indicada. Leia o plano geral e o registro de progresso, confirme os pré-requisitos e implemente integralmente a entrega prevista. Execute as verificações pertinentes e registre os resultados. Não avance para a próxima etapa. Se houver impedimento, registre a causa e o que falta; não marque como concluído algo que não foi validado.

O status desta etapa é mantido exclusivamente em PROGRESSO.md. Não iniciar outra etapa para resolver uma pendência sem registrar o impedimento e respeitar o escopo solicitado.

## Objetivo

Materializar o roteiro aprovado em documentação suficiente para que outra IA execute uma etapa por vez sem depender do histórico da conversa.

## Pré-requisitos

- Ler [PLANO.md](../PLANO.md) e [PROGRESSO.md](../PROGRESSO.md).
- Ter acesso de escrita à pasta do projeto e ao plano aprovado pelo usuário.

## Tarefas

- [x] Criar docs/PLANO.md com objetivo, decisões, arquitetura, modelos, invariantes, sequência e protocolo de execução.
- [x] Criar docs/steps/STEP-01.md até STEP-16.md. Cada etapa deve conter objetivo, pré-requisitos, tarefas, limites, critérios de conclusão e entrega esperada.
- [x] Criar docs/PROGRESSO.md como fonte única de status, com todas as etapas, evidências, impedimentos e próxima etapa.
- [x] Incluir as características dos tons e os exemplos essenciais da especificação nos documentos correspondentes; a execução não pode depender do anexo original.
- [x] Conferir a numeração, os links relativos, as dependências sequenciais e a presença da regra de execução em todos os arquivos.
- [x] Registrar os resultados efetivamente verificados, concluir somente a STEP-01 e indicar a STEP-02 como próxima.

## Limites

- Esta etapa produz somente documentação; não criar o aplicativo, instalar dependências ou baixar modelos.
- Não iniciar a STEP-02 automaticamente.

## Critérios de conclusão e verificação

- [x] Existem exatamente 16 arquivos STEP, numerados de 01 a 16, além do plano e do progresso.
- [x] Todos os arquivos de etapas contêm as seções obrigatórias e a instrução de execução individual.
- [x] Todos os links locais apontam para arquivos existentes; cada etapa posterior à primeira identifica sua dependência.
- [x] O progresso distingue a etapa concluída das outras 15 pendentes, sem registrar funcionalidades ou testes ainda inexistentes.

Quando uma verificação não puder ser realizada, registrar exatamente o procedimento pendente e usar Aguardando validação ou Bloqueada no progresso, conforme o motivo. Não substituir evidência real por suposição.

## Entrega esperada

- Os 18 documentos de planejamento em UTF-8.
- Registro da verificação documental e orientação para executar somente a STEP-02.

## Entrega funcional e commit obrigatório

Seguir [AGENTS.md](../../AGENTS.md): concluir todo o escopo acumulado da etapa, preservar o que já funciona e validar a execução correspondente. Quando houver código, executar npm run check e a validação real exigida pela etapa antes de encerrar. Cada etapa concluída deve gerar um commit próprio; revisar os arquivos preparados e informar seu hash na resposta final. Não declarar conclusão com validação obrigatória ou commit pendente.

Para testes de mensagens que forem realmente necessários, usar exclusivamente o contato @gabrielrguarini, conforme as regras de teste do projeto. Esta autorização não altera a proibição de envio automático pela extensão.

## Encerramento

Atualizar PROGRESSO.md com status, arquivos, verificações executadas, resultados, evidências e impedimentos. Na resposta final, informar o que foi entregue, como conferir e o que falta.

Próxima etapa: [STEP-02](STEP-02.md). **Não iniciá-la nesta execução.**
