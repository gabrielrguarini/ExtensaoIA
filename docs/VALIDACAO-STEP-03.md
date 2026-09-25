# Validação da STEP-03 no Chrome

O motor é **simulado**: devolve uma frase sintética fixa. Não lê campos, conversas ou contatos e não corrige, substitui ou envia mensagens. Não é necessário estar conectado a uma conta do WhatsApp para testar este circuito.

## Instalar o pacote

1. Na pasta do projeto, execute `npm.cmd ci` e `npm.cmd run check` (ou `npm` fora do PowerShell).
2. Abra `chrome://extensions` no Chrome 116 ou superior e habilite o modo do desenvolvedor.
3. Clique em **Carregar sem compactação** e selecione `C:\Users\Transmissão\Documents\Guarini\Code\ExtensaoIA\dist`.
4. Confira a extensão **IA local — WhatsApp Web (desenvolvimento)**, versão **0.2.0**, habilitada e sem erros de Manifest, CSP ou Service Worker.
5. Abra duas abas de `https://web.whatsapp.com/`. Se já estavam abertas antes da instalação, recarregue-as. Não abra conversas nem digite mensagens para este teste.
6. No menu de extensões do Chrome, clique no ícone desta extensão para abrir **Diagnóstico de comunicação**. Essa página precisa estar no endereço `chrome-extension://…/diagnostic.html`; o preview em localhost não tem as APIs de extensão.

## Conferir o circuito

1. Clique em **Atualizar abas do WhatsApp**. A lista deve mostrar somente os números das abas do WhatsApp, sem nomes ou conteúdo de conversas.
2. Selecione a primeira aba e clique em **Testar circuito simulado**. O relatório deve terminar em **Circuito completo — SIMULAÇÃO**, contendo o mesmo número de aba selecionado, documento, pedido e eco sintético. Deve incluir progresso e fragmento recebidos pelo content script.
3. Repita na segunda aba. A aba e o documento devem corresponder à segunda origem; os identificadores dos pedidos devem ser diferentes.
4. Clique em **Testar duas abas simultaneamente**. Somente uma recebe o resultado; a outra recebe **IA ocupada**. Não há fila ou reexecução automática.
5. Inicie um teste individual e clique imediatamente em **Cancelar teste da aba selecionada**. O relatório deve terminar em cancelamento, sem resultado final. Se o resultado já terminou antes do clique, repita: a simulação dura cerca de 1,2 segundo.
6. Durante outro teste, recarregue ou feche a aba selecionada. O teste deve terminar em interrupção/desconexão, nunca em resultado na outra aba. Atualize a lista e inicie um novo teste na aba restante para confirmar a recuperação.
7. Feche a página de diagnóstico. No gerenciador do Chrome, confirme ausência de erros da extensão. Não mantenha o inspetor do Service Worker aberto para testar inatividade, pois isso modifica seu ciclo de vida.

## Reinício e reconexão

1. Para conferir término forçado, abra `chrome://serviceworker-internals`, localize o Service Worker pelo ID desta extensão e use **Stop** durante um teste. Não altere workers de outros produtos. O pedido deve encerrar como interrompido, sem replay.
2. Volte ao diagnóstico e solicite um novo teste. O coordenador deve reutilizar o documento offscreen existente, iniciar um Worker limpo e concluir o novo pedido. Também é válido conferir a recuperação após a suspensão normal por inatividade do navegador.
3. Se a interface interna não oferecer o controle Stop, registre essa verificação como pendente; não trate recarregar toda a extensão como equivalente a reiniciar somente o Service Worker.

## Registrar o resultado

Informe a versão do Chrome e se passaram: instalação sem erros; circuito em cada aba; concorrência; cancelamento; desconexão; reconexão. Caso algo falhe, copie somente a mensagem de erro ou o relatório **sintético** do diagnóstico.

O relatório existe apenas na memória da página. Não exporte telas do WhatsApp, conversas reais ou conteúdo de armazenamento pessoal. Os testes automatizados e o preview local não substituem esta validação de execução da extensão.

## Resultado de execução — 25/09/2026

**Aprovado.** Extensão 0.2.0 executada no Chrome for Testing **154.0.8037.0**, Chromium revisão **1246**, por Playwright MCP **0.0.82** / Playwright **1.64.0-alpha-1789764292000**, no Windows. Perfil de teste separado em .cache/step03-browser, sem conta do WhatsApp conectada. O motor permaneceu simulado.

O pacote dist foi carregado em um contexto persistente, com channel chromium, headless e os argumentos disable-extensions-except/load-extension apontando para a pasta dist. Esse é o procedimento de [teste de extensões documentado pelo Playwright](https://playwright.dev/docs/chrome-extensions). O Chrome comercial removeu os argumentos de carregamento de extensões; os comandos do roteiro manual acima continuam sendo a alternativa no navegador normal.

| Verificação                 | Evidência observada                                                                                                                                                                                                                                            | Resultado |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Instalação MV3              | Service Worker ativado, Manifest 0.2.0 lido no navegador e diagnóstico renderizado. Gerenciador mostrou extensão descompactada e ativada, sem indicação de erros.                                                                                              | Passou    |
| Circuito na primeira aba    | Progresso 0/25/75, fragmento e eco sintético devolvidos pelo Worker ao content script e ao diagnóstico. Resultado identificou a aba solicitante.                                                                                                               | Passou    |
| Circuito na segunda aba     | Mesmo circuito completo, com aba, documento e pedido distintos dos da primeira.                                                                                                                                                                                | Passou    |
| Concorrência entre abas     | Dois pedidos simultâneos produziram exatamente um resultado e um aviso IA ocupada.                                                                                                                                                                             | Passou    |
| Cancelamento                | Os controles reais de iniciar/cancelar foram acionados com intervalo de 80 ms. Chegaram progresso e confirmação de cancelamento; nenhum resultado foi liberado.                                                                                                | Passou    |
| Desconexão                  | Uma aba de teste foi fechada após o estado busy e progresso confirmarem pedido ativo. O pedido terminou em DISCONNECTED.                                                                                                                                       | Passou    |
| Recuperação após desconexão | Novo pedido explícito na aba restante completou o circuito com vínculo próprio.                                                                                                                                                                                | Passou    |
| Reinício do Service Worker  | ServiceWorker.stopWorker foi aplicado exclusivamente à extensão de teste, com pedido busy. O protocolo do navegador registrou stopping, stopped, starting e running; a solicitação em andamento foi interrompida.                                              | Passou    |
| Reutilização do offscreen   | Havia exatamente um documento offscreen. Seu documentId permaneceu igual antes da parada, após a parada e após a recuperação. Um novo pedido explícito completou o circuito.                                                                                   | Passou    |
| Fronteiras da comunicação   | Comando de diagnóstico com campo extra recebeu Comando inválido. Uma página da extensão tentando usar a conexão reservada ao content script foi desconectada. Casos adicionais de IDs/revisões inválidos e respostas atrasadas estão nos testes automatizados. | Passou    |
| Armazenamento               | chrome.storage.local, sync e session permaneceram vazios após os testes.                                                                                                                                                                                       | Passou    |
| Erros de execução           | Nenhum erro não tratado capturado nas páginas da extensão; gerenciador sem indicação de erros de Manifest/CSP/runtime ao final.                                                                                                                                | Passou    |

Os testes de instalação e comunicação usaram as APIs reais de extensão, offscreen, Worker e duas páginas reais do WhatsApp Web. Não houve interceptação ou substituição dessas APIs por mocks. A parada forçada utilizou o [protocolo de depuração do navegador](https://chromedevtools.github.io/devtools-protocol/tot/ServiceWorker/) apenas no ambiente de teste; esse código não integra a extensão.

As verificações automatizadas também passaram: npm run check, com tipos, lint, formatação, **45 testes em quatro arquivos** e build. Os artefatos temporários do navegador ficam fora do Git.

Limites: a execução comprova o escopo simulado da STEP-03 neste navegador. Não comprova IA real, WebGPU, detecção/substituição do editor, funcionamento em todas as versões do Chrome nem a auditoria completa da STEP-16. Nenhum contato, conversa ou mensagem enviada foi necessário.
