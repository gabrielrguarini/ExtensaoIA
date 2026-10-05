# STEP-01 — Organizar o plano e o acompanhamento

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Objetivo

Materializar o roteiro aprovado em documentação suficiente para que outra IA execute uma etapa por vez sem depender do histórico da conversa.

## Pré-requisitos

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
