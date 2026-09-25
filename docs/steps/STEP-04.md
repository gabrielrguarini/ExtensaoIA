# STEP-04 — Detectar o editor do WhatsApp

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Instrução de execução

> Execute somente a etapa indicada. Leia o plano geral e o registro de progresso, confirme os pré-requisitos e implemente integralmente a entrega prevista. Execute as verificações pertinentes e registre os resultados. Não avance para a próxima etapa. Se houver impedimento, registre a causa e o que falta; não marque como concluído algo que não foi validado.

O status desta etapa é mantido exclusivamente em PROGRESSO.md. Não iniciar outra etapa para resolver uma pendência sem registrar o impedimento e respeitar o escopo solicitado.

## Objetivo

Encontrar o campo de composição correto e posicionar um único botão IA sem ler a conversa.

## Pré-requisitos

- Ler [PLANO.md](../PLANO.md) e [PROGRESSO.md](../PROGRESSO.md).
- [STEP-03](STEP-03.md) e todas as etapas anteriores concluídas, com evidências registradas.

## Tarefas

- [x] Concentrar seletores em um adaptador do WhatsApp, combinando contenteditable, atributos semânticos e localização na área de composição.
- [x] Não depender exclusivamente de classes CSS ofuscadas, texto de placeholder ou idioma da interface do WhatsApp.
- [x] Inserir um botão IA acessível próximo ao editor, sem deslocar ou impedir controles nativos.
- [x] Observar mudanças com MutationObserver de escopo limitado, coalescer atualizações e excluir o próprio conteúdo da extensão de ciclos de observação.
- [x] Remover eventos e observadores obsoletos quando o editor mudar; atualizar posição e visibilidade sem duplicar o botão.
- [x] Capturar o texto somente em uma ação explícita. Invalidar snapshots ao detectar edição, troca de contexto ou substituição do editor, sem coletar nomes de contatos.
- [x] Criar fixtures sintéticas para editor válido, busca, conversa sem editor, troca de conversa e editor removido.

## Limites

- Não percorrer nem extrair o histórico de mensagens ou contatos.
- Não usar rede, banco interno, objetos internos da aplicação ou instrumentação de APIs do WhatsApp.
- Apenas detectar editor e botão; o preview entra na STEP-05.

## Critérios de conclusão e verificação

- [x] Há um único botão por editor válido e nenhum em busca ou campos não relacionados.
- [x] O botão acompanha troca de conversa e remoção/recriação do editor.
- [x] Montagens repetidas e mudanças feitas pela própria extensão não geram loops ou eventos duplicados.
- [x] Fixtures automatizadas passam e o comportamento é conferido no WhatsApp real quando disponível.

Quando uma verificação não puder ser realizada, registrar exatamente o procedimento pendente e usar Aguardando validação ou Bloqueada no progresso, conforme o motivo. Não substituir evidência real por suposição.

## Entrega esperada

- Adaptador do WhatsApp, botão IA e fixtures de detecção.
- Registro separado dos resultados automatizados e da validação real.

## Entrega funcional e commit obrigatório

Seguir [AGENTS.md](../../AGENTS.md): concluir todo o escopo acumulado da etapa, preservar o que já funciona e validar a execução correspondente. Quando houver código, executar npm run check e a validação real exigida pela etapa antes de encerrar. Cada etapa concluída deve gerar um commit próprio; revisar os arquivos preparados e informar seu hash na resposta final. Não declarar conclusão com validação obrigatória ou commit pendente.

Para testes de mensagens que forem realmente necessários, usar exclusivamente o contato @gabrielrguarini, conforme as regras de teste do projeto. Esta autorização não altera a proibição de envio automático pela extensão.

## Encerramento

Atualizar PROGRESSO.md com status, arquivos, verificações executadas, resultados, evidências e impedimentos. Na resposta final, informar o que foi entregue, como conferir e o que falta.

Próxima etapa: [STEP-05](STEP-05.md). **Não iniciá-la nesta execução.**
