# STEP-15-H — Substituição direta e tooltip de IA

[Plano](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Escopo autorizado em 02/10/2026

O clique em IA passa a executar a ação configurada e substituir o rascunho diretamente. Padrões: Corrigir e Substituir diretamente. O usuário pode selecionar Revisar sugestão nas configurações para recuperar o fluxo anterior. Essa autorização substitui a exigência anterior de uma segunda confirmação de substituição; nenhuma mensagem será enviada pela extensão.

## Tarefas

- Migrar preferências, preservando ação/modelo/opções já escolhidos e adotando o modo direto por padrão.
- No modo direto, nenhuma prévia/janela, inclusive durante carregamento. Tooltip compacto com Carregando IA, foco/hover, acessibilidade e cancelamento pelo botão/Escape. Erros e editor incompatível preservam o rascunho e usam tooltip.
- Aplicar somente resultado final tecnicamente válido, para o snapshot original ainda atual. Preservar guardas de conversa, origem, desconexão, edição, cancelamento e undo; jamais enviar mensagem. Saída idêntica não gera transação de escrita.
- Revisar sugestão mantém Copiar/Substituir e download explícito. Preparação dos modelos próprios fica também nas configurações, com tamanho, progresso e cancelamento, para que o modo direto não precise de consentimento em janela.
- Usar [tooltip shadcn/Base UI](https://ui.shadcn.com/docs/components/base/tooltip) como referência visual e de comportamento, adaptado ao Shadow DOM existente sem instalar uma biblioteca completa.
- Atualizar documentação e STEP-16, preservando evidências históricas.

## Aceite

- Testes relevantes: migração/modos, uma geração, substituição apenas final, saída idêntica/inválida, cancelamento/obsolescência, troca de preferências e aplicação em andamento, modo de prévia e tooltip sem dialog.
- Chrome real com inferência nativa e fixtures sintéticas: substituir sem janela, Ctrl+Z, tooltip visível durante geração, cancelamento/edição, opção Revisar sugestão e configurações. Regressão com alternativa local preparada, sem repetir grandes downloads.
- Verificações completas do projeto aprovadas e relatório com evidências.
