# STEP-02 — Criar a base do projeto

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Objetivo

Preparar uma base tipada, modular e reproduzível para a extensão, com build e verificações funcionando.

## Pré-requisitos

- [STEP-01](STEP-01.md) e todas as etapas anteriores concluídas, com evidências registradas.

## Tarefas

- [x] Verificar as versões estáveis compatíveis de Node.js, npm, TypeScript, React, Vite, Vitest, ESLint e Prettier na documentação oficial; registrar o requisito de Node.
- [x] Configurar npm e versionar package-lock.json; evitar dependências sem uso imediato.
- [x] Ativar TypeScript strict, regras de lint e verificação de formatação sem alterações automáticas durante a validação.
- [x] Separar módulos de extensão, integração com WhatsApp, interface, comunicação, IA, modelos, núcleo de validação, armazenamento e tipos compartilhados. Evitar abstrações e arquivos vazios sem propósito.
- [x] Preparar o build para os futuros pontos de entrada de content script, service worker, offscreen, worker, popup e painel. Nesta etapa, gerar somente as entradas realmente criadas.
- [x] Documentar instalação reproduzível, verificação de tipos, análise estática, verificação de formatação, testes automatizados e compilação.
- [x] Criar um teste inicial significativo para a configuração ou comportamento real introduzido, sem testes que apenas confirmem constantes.

## Limites

- Não implementar Manifest V3 e comunicação, que pertencem à STEP-03.
- Não baixar modelos nem criar interfaces finais.
- Não tratar a saída do build como uma extensão instalável antes da implementação do Manifest.

## Critérios de conclusão e verificação

- [x] Uma instalação reproduzível pelo lockfile funciona no ambiente documentado.
- [x] Typecheck, lint, verificação de formatação, teste inicial e build passam.
- [x] A saída do build utiliza arquivos locais e não inclui segredos ou referências obrigatórias a um servidor de desenvolvimento.

Quando uma verificação não puder ser realizada, registrar exatamente o procedimento pendente e usar Aguardando validação ou Bloqueada no progresso, conforme o motivo. Não substituir evidência real por suposição.

## Entrega esperada

- Base do projeto e documentação dos comandos.
- Registro das versões utilizadas, verificações executadas e estrutura inicial.
