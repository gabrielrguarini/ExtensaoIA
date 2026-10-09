# Validação STEP-16-E — Acesso ao painel e preparo

[Plano](PLANO.md) · [Progresso](PROGRESSO.md) · [Escopo](steps/STEP-16-E.md) · [Instalação](INSTALACAO.md)

## Entrega em 09/10/2026

Abrir painel lateral agora fica abaixo de Aparência, antes do aviso de privacidade.
Foi escolhida a primeira alternativa solicitada; o ícone da extensão continua
abrindo as configurações no popup. O aviso de preparo indica explicitamente o
botão no final. Estilos e todos os callbacks/guardas permanecem intactos.

## Diagnóstico do download desativado

A skill diagnosing-bugs foi aplicada com um roteiro real de Chrome, sem baixar
modelos. Hipóteses verificadas: guarda do popup, hardware indisponível e operação
em andamento. O mesmo perfil, sem operação em andamento, mostrou o download
desativado no popup e habilitado no painel para Llama 3B, Qwen 4B/8B e Gemma.
Logo, o bloqueio observado no popup decorre da regra visiblePanel; não houve
evidência de bloqueio permanente no painel compatível.

SelectedModelControls exige painel visível, hardware verificado e ausência de
operação em andamento. O preparo também exige document.visibilityState visible.
Essa regra foi mantida. Abrir painel lateral permite preparar o modelo num local
que permanece aberto; WebGPU indisponível continua impedindo modelos próprios.

O roteiro `node tests/browser/step16e-panel.mjs` foi executado antes da alteração,
com STEP16E_OUTPUT=.cache/step16e/before. Confirmou os quatro estados de download
e falhou especificamente por buttonBelowFields false. Após a alteração, o mesmo
roteiro passou com buttonBelowFields true. Não foi necessário bissecar uma guarda
explícita e reproduzível; o ajuste é de posição e orientação, sem retirar proteção.

## Verificações

Chrome **154.0.8037.98**, pacote **0.16.5** instalado em perfil isolado. Oito
verificações: clique confiável no botão do popup real após rolagem, abertura do
painel real, seleção por teclado dos quatro modelos, downloads habilitados apenas
no painel, alternância IA Nativa/Modelo, foco, sincronização e persistência após
reiniciar. Sem rolagem horizontal; capturas conferidas. Zero erros/exceções nas
interfaces e nenhuma requisição de modelo observada nas páginas. Nenhum download,
conversa ou envio.

`npm.cmd run check` aprovado: tipos, lint, formatação, **303 testes/42 arquivos** e
build. 50 arquivos instaláveis, ZIP com Manifest na raiz e inventário SHA-256;
todos correspondem ao build final.

Comparação com 0.16.4: content.js idêntico byte a byte, estilos e fontes fora dos
três componentes de apresentação intactos. Revisão do diff desses componentes
mostra somente movimentação do bloco existente e dois avisos. 46 arquivos do
pacote preservados; mudanças em Manifest, HTMLs popup/painel e JS das
configurações. Manifest e lockfile mudaram somente versão do projeto. Botão IA,
motores, streaming, cache, dependências e preferências sem mudanças.

## Evidências e conclusão

- [Antes — diagnóstico e posição](evidencias/step16e/before.json).
- [Depois — Chrome](evidencias/step16e/settings.json).
- [Botão abaixo de Aparência](evidencias/step16e/popup-panel-access.png).
- [Painel com download habilitado](evidencias/step16e/sidepanel-model.png).
- [Preservação](evidencias/step16e/preservation.json).
- [Pacote](evidencias/step16e/package.json) · [Checks](evidencias/step16e/checks.json).

**Concluída** após verificações e commit próprio com identidade humana configurada.
Alterações do usuário em .gitignore e skills-lock.json preservadas fora do commit.
Pendência de inferência completa da STEP-16/16-A mantida. Sem push, publicação ou
início de etapa seguinte.
