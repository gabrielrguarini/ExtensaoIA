# STEP-08 — Proteger entidades e validar o resultado

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Instrução de execução

> Execute somente a etapa indicada. Leia o plano geral e o registro de progresso, confirme os pré-requisitos e implemente integralmente a entrega prevista. Execute as verificações pertinentes e registre os resultados. Não avance para a próxima etapa. Se houver impedimento, registre a causa e o que falta; não marque como concluído algo que não foi validado.

O status desta etapa é mantido exclusivamente em PROGRESSO.md. Não iniciar outra etapa para resolver uma pendência sem registrar o impedimento e respeitar o escopo solicitado.

## Objetivo

Implementar a proteção determinística obrigatória antes de liberar qualquer resultado para aplicação ou cópia.

## Pré-requisitos

- Ler [PLANO.md](../PLANO.md) e [PROGRESSO.md](../PROGRESSO.md).
- [STEP-07](STEP-07.md) e todas as etapas anteriores concluídas, com evidências registradas.

## Tarefas

- [x] Extrair entidades com resolução de sobreposição: URLs, e-mails, números, valores, datas, horários, CPF/CNPJ, códigos, @menções, hashtags e emojis.
- [x] Identificar nomes e referências temporais detectáveis, incluindo João, Maria, projeto XPTO e sexta. Documentar limitações; não declarar reconhecimento perfeito de nomes.
- [x] Proteger spans com placeholders únicos que não colidam com texto original. Preservar valor exato e contagem de ocorrências sem confundir entidades sobrepostas.
- [x] Restaurar valores após a geração. Rejeitar placeholders desconhecidos, alterados, ausentes ou duplicados e entidades protegidas novas ou removidas.
- [x] Comparar o original e o resultado para números, URLs, datas e demais invariantes. Acrescentar checagens conservadoras de negações, texto vazio, caracteres inesperados e truncamento.
- [x] Reprovar saídas suspeitas com mensagem clara e manter Substituir e Copiar indisponíveis. O texto original continua intacto.
- [x] Testar colisões literais com **ENTITY_001**, entidades repetidas, URL com números, valor monetário, Unicode/emoji composto e múltiplas negações.

## Limites

- A detecção determinística não prova equivalência semântica geral.
- Não remover negações ou mudar fatos para satisfazer o tom.
- Não liberar resultado inválido por conta de uma resposta favorável de qualquer verificador futuro.

## Critérios de conclusão e verificação

- [x] Extração, restauração e comparação passam nos testes de entidades simples, repetidas e sobrepostas.
- [x] Os exemplos de valores, datas, nomes, links e intenção negativa preservam os elementos protegidos.
- [x] Resultados incompletos ou reprovados não permitem copiar ou substituir.
- [x] O fluxo real de correção, validação, preview e confirmação funciona com o modelo inicial.

Quando uma verificação não puder ser realizada, registrar exatamente o procedimento pendente e usar Aguardando validação ou Bloqueada no progresso, conforme o motivo. Não substituir evidência real por suposição.

## Entrega esperada

- Módulos de parsing, preservação e validação determinística, com testes.
- Marco do MVP funcional de correção registrado somente após validação real.

## Entrega funcional e commit obrigatório

Seguir [AGENTS.md](../../AGENTS.md): concluir todo o escopo acumulado da etapa, preservar o que já funciona e validar a execução correspondente. Quando houver código, executar npm run check e a validação real exigida pela etapa antes de encerrar. Cada etapa concluída deve gerar um commit próprio; revisar os arquivos preparados e informar seu hash na resposta final. Não declarar conclusão com validação obrigatória ou commit pendente.

Para testes de mensagens que forem realmente necessários, usar exclusivamente o contato @gabrielrguarini, conforme as regras de teste do projeto. Esta autorização não altera a proibição de envio automático pela extensão.

## Encerramento

Atualizar PROGRESSO.md com status, arquivos, verificações executadas, resultados, evidências e impedimentos. Na resposta final, informar o que foi entregue, como conferir e o que falta.

Próxima etapa: [STEP-09](STEP-09.md). **Não iniciá-la nesta execução.**
