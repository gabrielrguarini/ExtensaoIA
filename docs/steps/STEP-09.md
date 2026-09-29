# STEP-09 — Adicionar os demais modos

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Instrução de execução

> Execute somente a etapa indicada. Leia o plano geral e o registro de progresso, confirme os pré-requisitos e implemente integralmente a entrega prevista. Execute as verificações pertinentes e registre os resultados. Não avance para a próxima etapa. Se houver impedimento, registre a causa e o que falta; não marque como concluído algo que não foi validado.

O status desta etapa é mantido exclusivamente em PROGRESSO.md. Não iniciar outra etapa para resolver uma pendência sem registrar o impedimento e respeitar o escopo solicitado.

## Objetivo

Disponibilizar as nove ações com diferenças semânticas claras e preservação obrigatória.

## Pré-requisitos

- Ler [PLANO.md](../PLANO.md) e [PROGRESSO.md](../PROGRESSO.md).
- [STEP-08](STEP-08.md) e todas as etapas anteriores concluídas, com evidências registradas.

## Tarefas

- [x] Criar um registro tipado único das ações para a interface e os prompts; evitar listas divergentes.
- [x] Corrigir: alterações mínimas de escrita. Melhorar: clareza e fluidez sem alterar conteúdo. Reescrever: formulação alternativa com a mesma intenção e informações.
- [x] Formal: vocabulário e estrutura formais, cordialidade, evitar gírias e abreviações. Profissional: claro, objetivo e educado, sem excesso de formalidade.
- [x] Amigável: proximidade e cordialidade, preservando informalidade compatível. Natural: corrigir sem linguagem artificial, mantendo personalidade.
- [x] Conciso: remover redundâncias preservando todas as informações importantes. Engraçado: leveza compatível com o assunto, sem inventar fatos, ridicularizar ou descaracterizar intenção séria.
- [x] Aplicar a proteção e validação existentes a todas as ações. Preservar gírias por padrão, com a formalização explicitamente escolhida podendo adaptá-las.
- [x] Acrescentar exemplos por ação, incluindo mano consegue ver isso pra mim hoje?, mensagens profissionais e mensagens sérias.
- [x] Manter a escolha da ação ligada ao pedido correspondente, sem aplicar uma resposta produzida para outro modo.

## Limites

- Tradução e expansão permanecem fora desta versão.
- Os modos não podem ser implementados como simples substituições de palavras.
- Um tom não autoriza alterar fatos, valores ou negações.

## Critérios de conclusão e verificação

- [x] As nove ações aparecem com rótulos em pt-BR e acionam a configuração correta.
- [x] Formal e Profissional têm comportamentos distintos nos casos de avaliação.
- [x] Conciso preserva informações e Engraçado não inventa conteúdo factual.
- [x] Testes de preservação continuam passando para todas as ações.

Quando uma verificação não puder ser realizada, registrar exatamente o procedimento pendente e usar Aguardando validação ou Bloqueada no progresso, conforme o motivo. Não substituir evidência real por suposição.

## Entrega esperada

- Registro de ações, prompts semânticos e menu completo.
- Exemplos e testes cobrindo cada modo.

## Entrega funcional e commit obrigatório

Seguir [AGENTS.md](../../AGENTS.md): concluir todo o escopo acumulado da etapa, preservar o que já funciona e validar a execução correspondente. Quando houver código, executar npm run check e a validação real exigida pela etapa antes de encerrar. Cada etapa concluída deve gerar um commit próprio; revisar os arquivos preparados e informar seu hash na resposta final. Não declarar conclusão com validação obrigatória ou commit pendente.

Para testes de mensagens que forem realmente necessários, usar exclusivamente o contato @gabrielrguarini, conforme as regras de teste do projeto. Esta autorização não altera a proibição de envio automático pela extensão.

Nesta execução, o usuário autorizou especificamente testes no WhatsApp real no grupo **Teste Extensão** e, somente se necessário, o envio de mensagens sintéticas de teste nesse grupo. Confirmar a identidade do grupo na interface antes de usar o rascunho. Esta autorização específica prevalece para a STEP-09; não altera o comportamento da extensão nem as regras das outras etapas.

## Encerramento

Atualizar PROGRESSO.md com status, arquivos, verificações executadas, resultados, evidências e impedimentos. Na resposta final, informar o que foi entregue, como conferir e o que falta.

Próxima etapa: [STEP-10](STEP-10.md). **Não iniciá-la nesta execução.**
