# Validação da STEP-14

[Progresso](PROGRESSO.md) · [Etapa](steps/STEP-14.md) · [Plano](PLANO.md)

## Ambiente e procedimento

- Windows, Node 22.14.0, npm 10.9.2; pacote/Manifest 0.13.0.
- Chrome for Testing 154.0.8037.0. GPU informada pelo navegador: NVIDIA, arquitetura `lovelace`, `shader-f16` disponível; Econômico/Llama 3.2 3B, q4f16_1. VRAM livre não é informada pela API.
- Perfil exclusivo `.cache/step14-isolated`, sem autenticação. Todas as navegações ao WhatsApp foram atendidas por HTML sintético local. Não se abriram conversas reais, enviaram mensagens ou capturaram dados de contatos.
- Playwright usa a conexão de depuração por pipe; não foi aberta porta TCP. Capturas visuais contêm apenas a interface de configurações e permanecem no cache ignorado, fora do commit.
- A [API oficial do Chrome](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) exige gesto para `sidePanel.open`. A implementação chama a API diretamente no clique do popup, com o identificador da janela preparado previamente.

## Entrega

Popup e painel lateral compartilham o componente de preferências com o menu do editor. A prévia, Copiar e Substituir continuam junto ao campo do WhatsApp. O diagnóstico simulado anterior permanece acessível por link nas interfaces auxiliares.

O esquema v3 contém somente versão, idioma pt-BR, tema, ação padrão, perfil, preservação de gírias, adição de emojis e revisão semântica. Os padrões são Sistema, Corrigir, Econômico, preservar gírias, não adicionar emojis e revisão semântica desligada. Emojis originais sempre são protegidos; Formal pode adaptar gírias. A privacidade local é obrigatória e informativa, sem controle para nuvem.

Migração de v1/v2 preserva campos válidos. Versões desconhecidas e campos inválidos recebem padrões seguros; campos desconhecidos são descartados. Gravações passam por uma fila no coordenador para preservar alterações concorrentes. As opções de escrita vêm das preferências autorizadas no coordenador; o content script não pode injetá-las no pedido.

As interfaces mostram modelo, licença local, bytes de download, contexto, estimativa de GPU e variante. **Atualizar estado do modelo** confere os artefatos localmente e mostra um retrato do cache e do Worker. **Liberar memória da GPU** cancela pedidos e encerra o Worker, conservando artefatos. **Apagar arquivos do modelo** pede confirmação, encerra o Worker e remove somente a revisão/variante escolhida. Preferências permanecem; o uso seguinte requer novo download confirmado.

## Verificações reais

| Procedimento                                                                                    | Resultado                                                                      |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Abrir o popup nativo pela Action API; clicar em Abrir painel lateral com evento nativo de mouse | Painel lateral real, visível, com título e quatro seletores renderizados.      |
| Alterar tema/ação/emojis usando teclado; consultar popup, painel real e menu no Shadow DOM      | Mesmas preferências nas três interfaces, sem recarregar a aba do editor.       |
| Injetar registro v2 com campos válidos e um campo sintético de prompt; reabrir interface        | v3 preservou perfil/revisão e removeu o campo desconhecido.                    |
| Injetar v3 com tema/perfil inválidos e um campo sintético de texto                              | Padrões seguros; somente `writingPreferences` no storage.                      |
| Fechar e reiniciar completamente o Chrome                                                       | Tema Escuro, ação Formal e adição de emojis desligada permaneceram.            |
| Abrir menu por Enter, navegar por Tab e fechar por Escape                                       | Ação padrão recebe foco; Tab alcança Corrigir; Escape devolve foco ao textbox. |
| Confirmar remoção usando Enter                                                                  | Confirmação recebe foco; finalização devolve foco ao controle de remoção.      |

Temas Claro/Escuro/Sistema foram conferidos nas três interfaces. Claro explicitamente escolhido permaneceu claro com o sistema simulado em escuro; Sistema acompanhou o sistema. Contraste calculado de texto, links, botões e seletores habilitados amostrados: popup/painel 10,53:1 no escuro e 7,67:1 no claro; editor 7,67:1 nos dois temas. Capturas locais foram inspecionadas visualmente: rótulos, quebra de linhas, controles e foco visíveis, sem sobreposição. Não se declara auditoria completa de leitores de tela.

Na rodada final WebGPU, a prova sintética retornou TESTE (com variação de pontuação). Corrigir preservou a gíria, a pergunta e o emoji original; Formal adaptou a gíria e conservou pergunta/emoji, com o rascunho intacto nas duas ações. O popup mostrou cache completo/verificado e modelo carregado. Liberar GPU eliminou o Worker e manteve arquivos, recibos e preferências idênticos; outra prova recriou um Worker e gerou sem pedir download. Apagar o modelo removeu arquivos/configuração/recibos da variante e encerrou o Worker, preservando as preferências. A próxima ação pediu Baixar e continuar, e foi cancelada. Zero erros de página nos dois roteiros finais.

O roteiro inicial de compositor foi corrigido para declarar UTF-8 antes da rodada final: sem charset, o Chrome decodificava o emoji da fixture incorretamente. A investigação separada do motor usou strings Unicode sintéticas diretamente e não dependia dessa fixture.

## Verificações automatizadas

`npm.cmd run check`: tipos, ESLint sem avisos, Prettier, 178 testes em 24 arquivos e build da extensão. Cobertura nova: migração e recuperação por campo, remoção de conteúdo desconhecido, gravações concorrentes, resposta atrasada sem regressão de interface, fronteiras de opções/remetentes, instruções de gírias/emojis e guarda que mantém todos os emojis originais enquanto permite adição somente quando explicitamente habilitada. Estados de Worker/GPU e preparação cancelada também foram conferidos.

## Automatização reproduzível

```powershell
npm.cmd ci
npm.cmd run check
$env:STEP14_CHROME = 'caminho/para/Chrome-for-Testing/chrome.exe'
npm.cmd run test:step14:browser
npm.cmd run test:step14:model
```

O primeiro roteiro reinicializa somente preferências no perfil sintético e verifica interfaces, migração, temas, teclado e reinício. O segundo usa uma fixture de rascunho, pede confirmação explícita quando o modelo não está disponível, executa inferência real e confere GPU/cache. A remoção faz parte da prova; repetir o roteiro pode exigir baixar novamente os pesos.

## Limites observados

A GPU é uma única máquina física; não há nova certificação de todos os modelos, variante f32 ou versões antigas do Chrome. O WhatsApp real e sua inserção nativa continuam cobertos pelas evidências anteriores; nesta etapa somente o compositor sintético foi usado. Estado do modelo é uma consulta explícita, não monitoramento contínuo.

O modelo pode recusar ou produzir uma sugestão ruim. Na investigação inicial, perguntas foram convertidas em afirmação ou dados protegidos foram omitidos, provocando recusa sem alterar o rascunho. Também houve uma saída sintética com todos os identificadores presentes, mas relação semântica inadequada: a conferência determinística não prova equivalência geral. A instrução de preservar perguntas foi reforçada, sem relaxar as guardas. A revisão manual permanece necessária e a revisão semântica opcional não fornece garantia geral. Isso não foi tratado como benchmark; a STEP-15 não foi iniciada.
