# Validação STEP-16-F — Switches, abertura padrão e avisos

[Plano](PLANO.md) · [Progresso](PROGRESSO.md) · [Escopo](steps/STEP-16-F.md)

## Entrega em 09/10/2026

Preservar gírias e Permitir novos emojis usam o Switch shadcn/Base UI 1.9.0,
adaptado do registry base-nova com CSS local e licenças no pacote. Aparência
oferece Abrir configurações no painel lateral, ligado por padrão; desligar abre
popup no próximo clique no ícone. Preferência settingsAccess v1 separada da
escrita v8, persistida sem alterar motores. Atualizações são serializadas e uma
falha de configuração/persistência restaura a abertura anterior.

O botão de preparo bloqueado explica o motivo por tooltip, acessível por hover
ou foco. Conforme pedido adicional, o tooltip do botão IA foi extraído para
src/extension/ui: mesma criação de elemento, estilos e posicionamento usados
também em PreparationButton. Aparência e interações do botão IA preservadas;
content.js muda pela extração compartilhada, sem mudanças na geração/aplicação.

Durante preparo/download aparece o aviso para manter o painel aberto. O usuário
escolheu somente aviso visível, sem novo botão de fechar. O X nativo não permite
interceptar a tentativa: o ensaio Chrome fechou sem beforeunload nem diálogo.
O comportamento de cancelamento/download permanece o existente. A
[API sidePanel](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
não oferece evento cancelável antes do fechamento.

## Verificações

Pacote 0.16.6 instalado em Chrome 154.0.8037.98, perfil isolado, sem conversas.
Sete verificações reais: ícone abre painel por padrão; mouse/Space e sincronização
dos switches; troca para popup conservando foco/escrita; tooltip por hover/foco;
aviso durante download e cancelamento; fechamento durante preparo; restauração
da escolha de popup após reiniciar Chrome. Zero erros de página/exceções.

O download foi iniciado pelo botão real com requisições interceptadas antes da
transmissão. Sem pesos baixados, inferência ou mensagens. O ensaio não certifica
um novo download completo. A guarda de gesto foi adaptada ao input oculto do
Base UI: a confiança do evento original é consumida uma vez na tarefa atual;
cliques injetados continuam ignorados.

Regressão do botão IA em quatro fixtures Chrome: pre-wrap, propriedades CSS
expandidas, quebra gerenciada e colagem longa; streaming concluiu sem revisão
obrigatória. Geração sintética, sem WhatsApp real. Preservação compara todos os
fontes de motores/adaptador/preferências com 0.16.5 e confere extração idêntica
do CSS do tooltip e dos demais estilos do botão.

`npm.cmd run check`: tipos, lint, formatação, 308 testes/43 arquivos e build.
Capturas claras/escuras conferidas. Diagnóstico refactoring-ui: 8/8 critérios
satisfeitos (10/10), com hierarquia, escala, largura, contraste e espaço mantidos.
53 arquivos instaláveis, ZIP e inventário SHA-256; licenças Base UI/shadcn incluídas.

## Evidências

- [Chrome](evidencias/step16f/settings.json) · [Preservação](evidencias/step16f/preservation.json).
- [Tooltip claro](evidencias/step16f/popup-tooltip-light.png) · [Escuro](evidencias/step16f/popup-tooltip-dark.png).
- [Switches](evidencias/step16f/sidepanel-switches-light.png) · [Aviso](evidencias/step16f/sidepanel-download-warning.png).
- [Fechamento nativo](evidencias/step16f/native-close.json).
- [Checks](evidencias/step16f/checks.json) · [Pacote](evidencias/step16f/package.json).

Etapa visual concluída após validação e commit próprio. Alterações do usuário em
.gitignore e skills-lock.json preservadas fora dele. A pendência de inferência
completa da STEP-16/16-A permanece. Os erros de idioma relatados serão tratados
em commit separado, sem antecipar sua correção nesta etapa.
