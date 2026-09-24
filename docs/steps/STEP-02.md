# STEP-02 — Criar a base do projeto

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Instrução de execução

> Execute somente a etapa indicada. Leia o plano geral e o registro de progresso, confirme os pré-requisitos e implemente integralmente a entrega prevista. Execute as verificações pertinentes e registre os resultados. Não avance para a próxima etapa. Se houver impedimento, registre a causa e o que falta; não marque como concluído algo que não foi validado.

O status desta etapa é mantido exclusivamente em PROGRESSO.md. Não iniciar outra etapa para resolver uma pendência sem registrar o impedimento e respeitar o escopo solicitado.

## Objetivo

Preparar uma base tipada, modular e reproduzível para a extensão, com build e verificações funcionando.

## Pré-requisitos

- Ler [PLANO.md](../PLANO.md) e [PROGRESSO.md](../PROGRESSO.md).
- [STEP-01](STEP-01.md) e todas as etapas anteriores concluídas, com evidências registradas.

## Tarefas

- [ ] Verificar as versões estáveis compatíveis de Node.js, npm, TypeScript, React, Vite, Vitest, ESLint e Prettier na documentação oficial; registrar o requisito de Node.
- [ ] Configurar npm e versionar package-lock.json; evitar dependências sem uso imediato.
- [ ] Ativar TypeScript strict, regras de lint e verificação de formatação sem alterações automáticas durante a validação.
- [ ] Separar módulos de extensão, integração com WhatsApp, interface, comunicação, IA, modelos, núcleo de validação, armazenamento e tipos compartilhados. Evitar abstrações e arquivos vazios sem propósito.
- [ ] Preparar o build para os futuros pontos de entrada de content script, service worker, offscreen, worker, popup e painel. Nesta etapa, gerar somente as entradas realmente criadas.
- [ ] Documentar npm ci, npm run typecheck, npm run lint, npm run format:check, npm test e npm run build.
- [ ] Criar um teste inicial significativo para a configuração ou comportamento real introduzido, sem testes que apenas confirmem constantes.

## Limites

- Não implementar Manifest V3 e comunicação, que pertencem à STEP-03.
- Não baixar modelos nem criar interfaces finais.
- Não tratar a saída do build como uma extensão instalável antes da implementação do Manifest.

## Critérios de conclusão e verificação

- [ ] Uma instalação reproduzível pelo lockfile funciona no ambiente documentado.
- [ ] Typecheck, lint, verificação de formatação, teste inicial e build passam.
- [ ] A saída do build utiliza arquivos locais e não inclui segredos ou referências obrigatórias a um servidor de desenvolvimento.

Quando uma verificação não puder ser realizada, registrar exatamente o procedimento pendente e usar Aguardando validação ou Bloqueada no progresso, conforme o motivo. Não substituir evidência real por suposição.

## Entrega esperada

- Base do projeto e documentação dos comandos.
- Registro das versões utilizadas, verificações executadas e estrutura inicial.

## Entrega funcional e commit obrigatório

Seguir [AGENTS.md](../../AGENTS.md): concluir todo o escopo acumulado da etapa, preservar o que já funciona e validar a execução correspondente. Quando houver código, executar npm run check e a validação real exigida pela etapa antes de encerrar. Cada etapa concluída deve gerar um commit próprio; revisar os arquivos preparados e informar seu hash na resposta final. Não declarar conclusão com validação obrigatória ou commit pendente.

Para testes de mensagens que forem realmente necessários, usar exclusivamente o contato @gabrielrguarini, conforme as regras de teste do projeto. Esta autorização não altera a proibição de envio automático pela extensão.

## Encerramento

Atualizar PROGRESSO.md com status, arquivos, verificações executadas, resultados, evidências e impedimentos. Na resposta final, informar o que foi entregue, como conferir e o que falta.

Próxima etapa: [STEP-03](STEP-03.md). **Não iniciá-la nesta execução.**
