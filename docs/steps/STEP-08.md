# STEP-08 — Proteger entidades e validar o resultado

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Objetivo

Implementar a proteção determinística obrigatória antes de liberar qualquer resultado para aplicação ou cópia.

## Pré-requisitos

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
