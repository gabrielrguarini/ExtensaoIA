# STEP-15-G — Idioma declarado na Prompt API

[Plano](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Escopo autorizado em 02/10/2026

Corrigir o aviso de LanguageModel sem idioma de saída informado. Ajuste anterior à STEP-16, sem iniciar a entrega final. A STEP-15-F continua como registro histórico da interface.

O usuário autorizou declarar en na sessão e pedir pt-BR no prompt, desde que verificado primeiro. Experimento no Chrome instalado: 12/12 respostas em português, incluindo a correção exata da frase relatada, sem aviso no candidato. Incorporar essa compatibilidade; não confundir idioma configurado com suporte formal ao idioma produzido.

## Tarefas e aceite

- Declarar saída em toda sessão Prompt e usar as mesmas opções na consulta e criação. Preferir o idioma real/API especializada quando disponíveis.
- Quando pt-BR declarado não estiver pronto, usar a compatibilidade autorizada: expectedOutputs en, entrada textual sem idioma declarado e sistema pedindo português brasileiro. Não suprimir logs nem modificar o idioma do rascunho.
- Se essa configuração também estiver indisponível, escolher o modelo local configurado antes de gerar. Manter downloads explícitos, uma geração, cancelamento e substituição manual.
- Testar opções equivalentes em availability/create, APIs especializadas indisponíveis e alternativa local. Reproduzir o aviso antigo e verificar sua ausência nos logs nativos do Chrome real, além do console JavaScript.
- Fluxo validado com fixture sintética offline, sem envio, verificações completas do projeto aprovadas e evidências registradas.
