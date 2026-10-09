# STEP-16-G — Evitar consultas com idiomas nativos não suportados

[Plano](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Escopo autorizado em 09/10/2026

Corrigir os erros Unsupported LanguageModel API languages e The requested
language options are not supported em commit separado da interface STEP-16-F.
Reproduzir o fluxo real e capturar os logs nativos antes de alterar o código.
Impedir declarações incompatíveis na consulta/criação, conservando português
por instrução já autorizado e alternativa local antes da geração. Não ocultar
logs, traduzir rascunhos, repetir geração ou iniciar download silencioso.

## Verificação

Teste de regressão que falha nos dois sintomas, consulta e criação equivalentes,
APIs disponíveis/ausentes, cancelamento e alternativa local. Chrome real com
logs de popup/offscreen e, se preparado, inferência sintética offline; check
completo, pacote instalável, evidências e commit próprio. Preservar a interface
F e as alterações do usuário. Registrar pendências sem declarar validação ausente.
