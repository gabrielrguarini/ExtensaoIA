# STEP-05 — Criar preview e substituição manual

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Instrução de execução

> Execute somente a etapa indicada. Leia o plano geral e o registro de progresso, confirme os pré-requisitos e implemente integralmente a entrega prevista. Execute as verificações pertinentes e registre os resultados. Não avance para a próxima etapa. Se houver impedimento, registre a causa e o que falta; não marque como concluído algo que não foi validado.

O status desta etapa é mantido exclusivamente em PROGRESSO.md. Não iniciar outra etapa para resolver uma pendência sem registrar o impedimento e respeitar o escopo solicitado.

## Objetivo

Validar a experiência de visualizar, copiar, cancelar e aplicar uma sugestão simulada junto ao editor.

## Pré-requisitos

- Ler [PLANO.md](../PLANO.md) e [PROGRESSO.md](../PROGRESSO.md).
- [STEP-04](STEP-04.md) e todas as etapas anteriores concluídas, com evidências registradas.

## Tarefas

- [ ] Criar menu e preview em React com isolamento de estilos, preferencialmente Shadow DOM, sem tratar esse isolamento visual como fronteira de segurança.
- [ ] Exibir claramente o estado simulado durante o desenvolvimento; disponibilizar Substituir, Copiar e Cancelar.
- [ ] Registrar snapshot, revisão e identidade do editor. Antes de aplicar, confirmar mesma origem, contexto de conversa e texto original inalterado; fechar ou invalidar resultados obsoletos.
- [ ] Encapsular Selection/Range e execCommand('insertText') no adaptador. A API é obsoleta: verificar suporte e resultado no Chrome alvo e manter uma saída segura por cópia.
- [ ] Preservar quebras de linha, Unicode e edição/desfazer nativos. Não substituir o editor inteiro com innerHTML ou forçar mudanças em seu estado interno.
- [ ] Detectar estruturas que não possam ser preservadas, incluindo chips de menção. Para essas estruturas, oferecer somente cópia do texto representável.
- [ ] Implementar cópia em gesto explícito e tratamento de falha da área de transferência. Nenhuma ação deve clicar em Enviar ou simular Enter.
- [ ] Implementar foco, Escape e rótulos acessíveis.

## Limites

- Usar resultados simulados; não apresentar esta etapa como correção por IA.
- Texto do preview deve ser renderizado como texto, sem HTML interpretado.
- Falhas ou contexto ambíguo devem preservar o rascunho; nunca reaplicar silenciosamente.

## Critérios de conclusão e verificação

- [ ] Uma sugestão é aplicada somente após confirmação e pode ser desfeita no editor compatível.
- [ ] Editar o rascunho, trocar de conversa ou substituir o elemento invalida a sugestão, mesmo quando duas conversas têm textos idênticos.
- [ ] Menções estruturadas e editor não suportado não recebem substituição automática.
- [ ] Testar texto multilinha, emojis, falha de cópia, navegação por teclado e cancelamento.

Quando uma verificação não puder ser realizada, registrar exatamente o procedimento pendente e usar Aguardando validação ou Bloqueada no progresso, conforme o motivo. Não substituir evidência real por suposição.

## Entrega esperada

- Preview utilizável com motor simulado e adaptador de escrita isolado.
- Testes de edição e evidência de aplicação/desfazer no Chrome com editor real.

## Entrega funcional e commit obrigatório

Seguir [AGENTS.md](../../AGENTS.md): concluir todo o escopo acumulado da etapa, preservar o que já funciona e validar a execução correspondente. Quando houver código, executar npm run check e a validação real exigida pela etapa antes de encerrar. Cada etapa concluída deve gerar um commit próprio; revisar os arquivos preparados e informar seu hash na resposta final. Não declarar conclusão com validação obrigatória ou commit pendente.

Para testes de mensagens que forem realmente necessários, usar exclusivamente o contato @gabrielrguarini, conforme as regras de teste do projeto. Esta autorização não altera a proibição de envio automático pela extensão.

## Encerramento

Atualizar PROGRESSO.md com status, arquivos, verificações executadas, resultados, evidências e impedimentos. Na resposta final, informar o que foi entregue, como conferir e o que falta.

Próxima etapa: [STEP-06](STEP-06.md). **Não iniciá-la nesta execução.**
