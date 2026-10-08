# STEP-16-B — Escolha clara de IA nas configurações

[Plano](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Escopo autorizado em 08/10/2026

Separar a escolha entre **IA Nativa** e **Modelo**. O seletor do modelo aparece
somente quando Modelo está selecionado. Mostrar apenas os controles de preparo,
download e manutenção correspondentes à opção atual, no popup e painel lateral.

- Mostrar a escolha de IA diretamente nas configurações, antes das opções de escrita.
- Manter os quatro modelos atuais: Llama 3.2 3B, Qwen3 4B/8B e Gemma 4 E2B.
- Preservar modelo, ação, tema e demais preferências salvas ao alternar os modos.
- Manter o contrato existente: IA Nativa prefere o Chrome preparado e usa o modelo
  salvo como alternativa antes da geração se necessário. Explicar isso na interface.
- Não alterar motores, prompts, streaming, permissões ou iniciar downloads pela troca.
- Verificar persistência, sincronização, teclado, tema e largura do popup real no Chrome.

## Aceite

`npm.cmd run check`, pacote instalável e Chrome com popup/painel reais. Conferir
os dois rótulos, exibição condicional do seletor/controles, quatro escolhas, retorno
ao último modelo, sincronização e persistência após reiniciar. Não exige conversas
ou nova inferência: a alteração é de configuração e apresentação, com motores
preservados. Pendências da STEP-16/16-A continuam registradas, sem declarar o
plano completo nem iniciar outra etapa.
