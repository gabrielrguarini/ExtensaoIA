# STEP-16-F — Switches, abertura padrão e avisos de preparo

[Plano](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Escopo autorizado em 09/10/2026

- Preservar comportamento dos downloads, motores, cache e botão IA no WhatsApp.
- Tooltip acessível nos botões de preparo bloqueados, orientando abrir o painel
  quando o bloqueio é por estar no popup; explicar os demais estados corretamente.
- Reutilizar o tooltip do botão IA: um componente compartilhado com os mesmos
  estilos e posicionamento, sem mudar o comportamento/aparência do botão IA.
- Substituir Preservar gírias e Permitir novos emojis pelo Switch shadcn/Base UI,
  com mesmos valores, teclado, foco e guardas de gesto confiável.
- Em Aparência, switch Abrir configurações no painel lateral, padrão ligado;
  desligado abre popup. Preferência de apresentação separada da escrita, salva e
  aplicada ao próximo clique no ícone, sem reiniciar motores.
- Aviso de cancelamento visível durante o preparo, sem novo botão de fechar,
  conforme escolha do usuário. Chrome 154 fechou o painel nativo sem
  beforeunload/dialog: não simular proteção sobre o X do navegador.

## Verificação

Check completo, pacote instalável e Chrome real: switches/teclado/sincronização,
dois modos de abertura/reinício, tooltip por hover/foco e fechamento durante
preparo sintético (sem baixar pesos). Distinguir simulação de nova inferência.
Registrar limite do fechamento nativo e validar a alternativa escolhida. Guardas
e execução de download originais preservadas. Pendências da STEP-16/16-A mantidas;
commit próprio e alterações do usuário preservadas; parar neste ajuste.
