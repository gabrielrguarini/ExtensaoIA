# Validação STEP-16-B — IA Nativa e Modelo

[Plano](PLANO.md) · [Progresso](PROGRESSO.md) · [Escopo](steps/STEP-16-B.md) · [Instalação](INSTALACAO.md)

## Entrega em 08/10/2026

Configurações do pacote **0.16.2** separadas em **Tipo de IA → IA Nativa / Modelo**,
no início do popup e painel lateral. O seletor dos quatro modelos aparece somente
em Modelo, seguido dos controles do escolhido. IA Nativa mostra somente o preparo
do Chrome. As opções de escrita ficam no grupo Como escrever.

Preferências v8 e os valores internos existentes foram preservados. Alternar os
modos mantém modelo/perfil, ação, comportamento, gírias, emojis e tema. O contrato
de alternativa automática antes da geração continua explicado na interface: a IA
nativa preparada tem preferência; caso não esteja pronta, tenta o modelo salvo.
Nenhum download é iniciado por escolher uma opção. Desmontar o componente de
preparo ao alternar o tipo encerra sua preparação/download em andamento.

## Chrome real

Windows, Chrome instalado **154.0.8037.98**, perfil dedicado sem contas/conversas.
O pacote release foi instalado por Extensions.loadUnpacked; foram usados o popup
real de chrome.action.openPopup e o painel real de chrome.sidePanel.open.
Interações por teclado usam eventos nativos, não eventos sintéticos de change.

Seis verificações aprovadas em `npm.cmd run test:step16b:browser`:

- IA Nativa/Modelo visíveis no início do popup; IA Nativa sem seletor/controles de modelos.
- Painel lateral mostra quatro modelos e seus controles ao escolher Modelo.
- Llama 3.2 3B, Qwen3 4B/8B e Gemma 4 E2B selecionáveis por teclado, sincronizados.
- Troca no popup oculta/reexibe o seletor, conserva foco e o último modelo, em tema escuro.
- Outras preferências permanecem iguais; storage contém somente writingPreferences.
- Modo, modelo e ação permanecem após encerrar/reiniciar o Chrome e recarregar o pacote.

Popup medido em **375 px**, corpo/scrollWidth em **360 px**, sem rolagem horizontal;
escolha da IA visível antes de rolar. Telas claras/escuras conferidas visualmente.
Zero erros de página/exceções observadas no popup/painel e zero pedidos às origens dos modelos observados nas páginas
do perfil. Nenhum download acionado, nova inferência, WhatsApp ou mensagem.

Evidências: [resultado](evidencias/step16b/settings.json),
[popup IA Nativa](evidencias/step16b/popup-native.png),
[popup Modelo](evidencias/step16b/popup-model.png) e
[painel Modelo](evidencias/step16b/sidepanel-model.png).

## Verificações e limites

`npm.cmd run check` aprovado: **300 testes em 42 arquivos**, tipos, lint, formatação
e build. A execução dos workers Vitest exigiu sair do sandbox, como no ajuste anterior.
Pacote **50 arquivos / 95.543.241 bytes**, ZIP **21.170.441 bytes**, com Manifest na raiz,
ícones conferidos e inventário SHA-256. [Checks](evidencias/step16b/checks.json) e
[inventário](evidencias/step16b/package.json).

Executar `npm.cmd run check`, `npm.cmd run package` e
`npm.cmd run test:step16b:browser`. O roteiro aceita STEP16B_CHROME e STEP16B_PORT
(porta padrão 9260), usa somente o perfil .cache/step16b/chrome e exige pacote
release gerado. Não acessar perfil pessoal para reproduzir.

Motores/prompts, seleção no offscreen, streaming, preferências, permissões e cache
não foram alterados. Testes acumulados e verificação dessas fontes complementam
o ensaio real de configuração; não representam nova inferência. Este ajuste não
necessita editar rascunhos no WhatsApp. As pendências anteriores da
[STEP-16-A](VALIDACAO-STEP-16-A.md) e [STEP-16](VALIDACAO-STEP-16.md) permanecem.

Não houve publicação à loja/página pública, atualização de dependências ou download
de pesos. A política local apenas passou a indicar a versão 0.16.2. Pacote e
inventário SHA-256 ficam em release; arquivos gerados, caches e perfis não são versionados.
