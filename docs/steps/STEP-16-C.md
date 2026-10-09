# STEP-16-C — Corrigir o bloqueio de texto simples colado

[Plano](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Escopo autorizado em 09/10/2026

Corrigir o aviso de estrutura incompatível informado ao usar substituição direta
com texto grande colado, sem links ou formatação. Preservar o streaming da
STEP-16-A, as configurações da STEP-16-B e as guardas de contexto/cancelamento.

- Reproduzir o aviso com dados sintéticos e reduzir a causa antes de implementar.
- Aceitar a representação normal de texto simples do Chrome/WhatsApp; não remover
  indiscriminadamente a guarda de menções, chips ou formatação não representável.
- Testar o caso no Chrome real, com texto curto e longo/multilinha, streaming,
  edição humana, recuperação e prévia opcional.
- Conferir colagem e reconciliação do campo no WhatsApp autenticado, somente com
  rascunhos sintéticos de @gabrielrguarini, sem enviar ou registrar conversas.
- Executar check, empacotar versão instalável e registrar evidências/commit próprio.

## Aceite

O mesmo caso que disparava o aviso aplica o primeiro trecho e os sufixos seguintes,
sem exigir revisão. O original continua recuperável e outro editor/conversa não
recebe escritas. Não ampliar limites de contexto/saída dos modelos ou iniciar
downloads. Manter Aguardando validação caso falte a conferência real obrigatória;
pendências anteriores de inferência da STEP-16/16-A permanecem registradas.
