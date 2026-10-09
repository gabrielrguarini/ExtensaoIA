# Validação STEP-16-D — Interface das configurações

[Plano](PLANO.md) · [Progresso](PROGRESSO.md) · [Escopo](steps/STEP-16-D.md) · [Instalação](INSTALACAO.md)

## Entrega em 09/10/2026

Refatoração visual solicitada com a skill refactoring-ui. Somente as configurações
do popup/painel receberam marcação, classes e estilos: três grupos, rótulos
secundários, valores destacados, espaçamento consistente e superfícies distintas
nos temas claro e escuro. Os controles, opções, textos explicativos, ações e
condições de exibição anteriores permanecem.

O botão IA no WhatsApp conserva integralmente aparência e comportamento. Não
houve alteração em motores, prompts, streaming, editor, prévia, cache, permissões
ou dependências. Versão de entrega 0.16.4; nenhuma publicação ou push.

## Avaliação visual da skill

Primeiro foi capturada a versão 0.16.3 instalada no Chrome, depois o novo layout
em cinza e finalmente a aplicação das cores. As capturas foram conferidas
visualmente, incluindo a interface completa e o armazenamento expandido.

| Critério da skill                             | Antes | Depois | Evidência/decisão                                                                                          |
| --------------------------------------------- | ----- | ------ | ---------------------------------------------------------------------------------------------------------- |
| Hierarquia perceptível ao semicerrar os olhos | Não   | Sim    | Título 24 px, grupos 16 px, valores 14 px e descrições 12 px.                                              |
| Funciona em cinza                             | Sim   | Sim    | Capturas intermediárias sem cores; grupos e valores continuam distinguíveis.                               |
| Espaço suficiente entre grupos                | Não   | Sim    | 24 px entre cartões, 16 px internos e entre campos, 8 px entre rótulo/valor.                               |
| Rótulos secundários aos valores               | Não   | Sim    | Rótulos menores e atenuados; valores mantêm contraste e destaque.                                          |
| Escala consistente de espaçamento             | Não   | Sim    | Tokens 4/8/16/24 px, dentro da escala 4/8/16/24/32/48/64.                                                  |
| Largura do texto contida                      | Sim   | Sim    | Coluna limitada a 480 px; popup mantém corpo de 360 px.                                                    |
| Contraste suficiente                          | Sim   | Sim    | Texto mínimo 5,46:1; contornos/superfície dos controles ativos mínimo 3,56:1.                              |
| Elevação apropriada                           | Sim   | Sim    | Formulário estático sem sombras flutuantes; cartões e áreas de preparo distinguíveis por superfície/borda. |

Pontuação do checklist: **4/8 = 5/10 antes; 8/8 = 10/10 depois**.

## Preservação do funcionamento

Comparação com o commit c9a8be96534dab66bae3b1ed10ba360da9d8e230:

- AST dos quatro componentes: preâmbulos, 50 funções/callbacks e atributos
  funcionais de 19 controles preservados; normalização somente de espaços e
  vírgulas finais da formatação.
- Fontes fora dos cinco arquivos de apresentação das configurações intactas.
- Manifest mudou somente versão; lockfile mudou somente versão do projeto.
- content.js é idêntico byte a byte ao pacote 0.16.3, SHA-256
  225359bb15ad2486bccd2b8730d85a31b708fb2b5a13531a16b4794f2c4a0774.
- 45 dos 50 arquivos instaláveis idênticos. Cinco arquivos lógicos mudaram:
  Manifest, popup/sidepanel HTML e assets de CSS/JS das configurações.

O roteiro reproduzível `test:step16d:browser` inclui essa comparação, o roteiro B
e as verificações visuais. Ele pressupõe o pacote 0.16.3 preservado para comparação
e o pacote 0.16.4 gerado, conforme esta etapa.

## Chrome e verificações

Chrome instalado **154.0.8037.98**, extensão release carregada em perfis isolados.
Seis verificações abriram o popup da ação e o painel lateral reais: seleção dos
quatro modelos por teclado, alternância IA Nativa/Modelo, foco, sincronização e
persistência após reiniciar o navegador. Mesmos resultados antes/depois.

Uma matriz adicional usou as páginas instaladas em abas para variar a viewport:
32 combinações de IA Nativa/Modelo, Claro/Escuro/Sistema e 320/360/480/800 px.
A preferência de cor do sistema foi emulada nas duas variantes; ambas coincidem
com os respectivos temas explícitos. Todas sem rolagem horizontal, grupos e
controles legíveis. Texto mínimo 5,46:1 no claro e 5,97:1 no escuro; controles
ativos mínimo 3,56:1/4,36:1. Medição exclui botões ocultos em detalhes recolhidos;
botões desabilitados não entram no mínimo exigido para controles ativos.

Tema, gírias e emojis operados por teclado; foco visível de 3 px mantido após
salvar. Detalhes abrem/fecham com Enter. Rodapé de privacidade/licenças conferido
no popup. Zero erros de página/exceções nas superfícies observadas e nenhuma
requisição de modelo observada nas páginas. Nenhum download, conversa ou envio.

`npm.cmd run check`: tipos, lint, formatação, **303 testes em 42 arquivos** e build
aprovados. Pacote instalável com 50 arquivos, Manifest na raiz, ZIP e inventário
SHA-256 conferidos; todos os arquivos correspondem ao build final.

## Artefatos e conclusão

- [Preservação e pacote](evidencias/step16d/preservation.json).
- [Popup/painel reais](evidencias/step16d/settings.json).
- [Matriz visual](evidencias/step16d/layout.json).
- [Antes — popup](evidencias/step16d/before-popup.png) · [Antes — painel](evidencias/step16d/before-panel.png).
- [Cinza — popup](evidencias/step16d/grayscale-popup.png) · [Cinza — painel](evidencias/step16d/grayscale-panel.png).
- [Depois — popup](evidencias/step16d/popup-native.png) · [Depois — painel real](evidencias/step16d/sidepanel-model.png).
- [Painel completo claro](evidencias/step16d/panel-light.png) · [Painel completo escuro](evidencias/step16d/panel-dark.png).
- [Armazenamento expandido](evidencias/step16d/storage-light.png) · [Rodapé do popup](evidencias/step16d/popup-footer.png).
- [Inventário do pacote](evidencias/step16d/package.json).
- [Verificações completas](evidencias/step16d/checks.json).

**Concluída** após as verificações e commit próprio com a identidade humana
configurada. Alterações do usuário em .gitignore e skills-lock.json preservadas
fora do commit. Inferência completa em perfil preparado da STEP-16/16-A permanece
pendente; este ajuste exclusivamente visual não exige nova inferência ou WhatsApp.
Nenhuma etapa seguinte iniciada.
