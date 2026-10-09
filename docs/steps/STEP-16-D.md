# STEP-16-D — Refatoração visual das configurações

[Plano](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Escopo autorizado em 09/10/2026

Aplicar a skill refactoring-ui somente à interface das configurações no popup e
painel lateral. Preservar integralmente o comportamento e a aparência do botão IA
no WhatsApp e o funcionamento da extensão.

- Melhorar hierarquia, agrupamento, espaçamento, tipografia, contraste e superfícies.
- Manter todos os controles, valores, rótulos, ações e condições de exibição existentes.
- Alterar apenas marcação/classes/estilos das configurações; preservar callbacks,
  guardas de eventos confiáveis, estados, persistência, foco e APIs.
- Não alterar motores, prompts, modelos, downloads, cache, permissões, preferências,
  adaptador, streaming, botão IA ou prévia no WhatsApp.
- Conferir popup/painel reais, temas claro/escuro/sistema, teclado, foco, sincronização,
  persistência e ausência de rolagem horizontal.
- Avaliar os oito critérios da skill, primeiro em cinza, e registrar antes/depois.

## Aceite

Check completo, pacote instalável e validação visual no Chrome. Comparar fontes e
hash do content.js com a versão 0.16.3 para comprovar preservação do botão/fluxo.
Não exige conversas, inferência ou downloads: a mudança é exclusivamente visual.
Preservar alterações locais do usuário relacionadas à instalação da skill fora do
commit da interface. Pendências da STEP-16/16-A permanecem; parar neste ajuste.
