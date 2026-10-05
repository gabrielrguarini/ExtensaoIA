# STEP-05 — Criar preview e substituição manual

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Objetivo

Validar a experiência de visualizar, copiar, cancelar e aplicar uma sugestão simulada junto ao editor.

## Pré-requisitos

- [STEP-04](STEP-04.md) e todas as etapas anteriores concluídas, com evidências registradas.

## Tarefas

- [x] Criar menu e preview em React com isolamento de estilos, preferencialmente Shadow DOM, sem tratar esse isolamento visual como fronteira de segurança.
- [x] Exibir claramente o estado simulado durante o desenvolvimento; disponibilizar Substituir, Copiar e Cancelar.
- [x] Registrar snapshot, revisão e identidade do editor. Antes de aplicar, confirmar mesma origem, contexto de conversa e texto original inalterado; fechar ou invalidar resultados obsoletos.
- [x] Encapsular Selection/Range e execCommand('insertText') no adaptador. A API é obsoleta: verificar suporte e resultado no Chrome alvo e manter uma saída segura por cópia.
- [x] Preservar quebras de linha, Unicode e edição/desfazer nativos. Não substituir o editor inteiro com innerHTML ou forçar mudanças em seu estado interno.
- [x] Detectar estruturas que não possam ser preservadas, incluindo chips de menção. Para essas estruturas, oferecer somente cópia do texto representável.
- [x] Implementar cópia em gesto explícito e tratamento de falha da área de transferência. Nenhuma ação deve clicar em Enviar ou simular Enter.
- [x] Implementar foco, Escape e rótulos acessíveis.

## Limites

- Usar resultados simulados; não apresentar esta etapa como correção por IA.
- Texto do preview deve ser renderizado como texto, sem HTML interpretado.
- Falhas ou contexto ambíguo devem preservar o rascunho; nunca reaplicar silenciosamente.

## Critérios de conclusão e verificação

- [x] Uma sugestão é aplicada somente após confirmação e pode ser desfeita no editor compatível.
- [x] Editar o rascunho, trocar de conversa ou substituir o elemento invalida a sugestão, mesmo quando duas conversas têm textos idênticos.
- [x] Menções estruturadas e editor não suportado não recebem substituição automática.
- [x] Testar texto multilinha, emojis, falha de cópia, navegação por teclado e cancelamento.

Quando uma verificação não puder ser realizada, registrar exatamente o procedimento pendente e usar Aguardando validação ou Bloqueada no progresso, conforme o motivo. Não substituir evidência real por suposição.

## Entrega esperada

Evidências de execução: [VALIDACAO-STEP-05.md](../VALIDACAO-STEP-05.md). No editor real testado, insertText não preservou múltiplas linhas; a entrega usa o fallback somente para cópia nesses textos, mantendo as quebras e o rascunho intactos. Aplicação/desfazer foram confirmados para texto simples de uma linha com Unicode. O status permanece centralizado em PROGRESSO.md.

- Preview utilizável com motor simulado e adaptador de escrita isolado.
- Testes de edição e evidência de aplicação/desfazer no Chrome com editor real.
