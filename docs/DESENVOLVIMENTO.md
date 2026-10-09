# Desenvolvimento e arquitetura

Assistente de escrita em português do Brasil. Por padrão, clique em **IA** no WhatsApp para corrigir e substituir o rascunho diretamente, com um tooltip **Carregando IA** durante o processamento. A ação e o comportamento podem ser alterados nas configurações; **Revisar sugestão** recupera a prévia com **Copiar/Substituir**. Nenhuma mensagem é enviada automaticamente. A IA do navegador já preparada tem preferência; também é possível escolher Llama, Qwen ou Gemma para processamento neste computador.

O estado e as evidências ficam em [Progresso](PROGRESSO.md). Consulte o [plano histórico](PLANO.md) e o [README de produto](../README.md). A [STEP-16-C](steps/STEP-16-C.md) corrige o bloqueio de texto simples colado, preservando as configurações da STEP-16-B e o streaming da STEP-16-A.

A entrega local **0.16.7** e o procedimento de atualização estão no [guia de instalação](INSTALACAO.md). Use `npm.cmd run package` para gerar release/ia-local-whatsapp-0.16.7, sem páginas de desenvolvimento, e seu inventário SHA-256. Confira o [relatório da correção de idioma](VALIDACAO-STEP-16-G.md), o [relatório dos switches e abertura](VALIDACAO-STEP-16-F.md), o [relatório da interface](VALIDACAO-STEP-16-D.md), o [relatório do texto colado](VALIDACAO-STEP-16-C.md), o [relatório das configurações](VALIDACAO-STEP-16-B.md), o [relatório de streaming](VALIDACAO-STEP-16-A.md) e o [relatório STEP-16](VALIDACAO-STEP-16.md) para saber quais validações passaram e quais permanecem pendentes.

A [STEP-16-D](steps/STEP-16-D.md) refatora somente a apresentação das configurações. `npm.cmd run test:step16d:browser` confere popup/painel reais, persistência/teclado e uma matriz visual com 32 combinações de modo, tema e largura. As páginas de layout em abas são identificadas separadamente das superfícies nativas do Chrome; não há download ou inferência.

A [STEP-16-E](steps/STEP-16-E.md) move o acesso ao painel para depois dos campos. `npm.cmd run test:step16e:browser` confere posição, clique real no popup e download habilitado no painel para os quatro modelos, sem baixar pesos. [Relatório E](VALIDACAO-STEP-16-E.md).

## Requisitos e instalação

Node.js 22.13+ na linha 22, ou versão compatível 24/26+, e npm 10.9.2+. Ambiente validado: Windows, Node 22.14.0 e npm 10.9.2. Chrome 116 é o mínimo das APIs de extensão; a compatibilidade efetiva da IA depende da versão e do equipamento. Modelos próprios exigem WebGPU; a IA do Chrome pode usar CPU administrada pelo navegador.

Na pasta do projeto, execute:

```sh
npm ci
npm run check
```

No PowerShell, use npm.cmd se a política local bloquear npm.ps1. Em chrome://extensions, habilite o modo do desenvolvedor, escolha **Carregar sem compactação** e selecione **dist**. Após atualizar, recarregue a extensão e a aba do WhatsApp.

## Como usar

1. Abra o ícone da extensão e escolha a **Ação do botão IA**: Corrigir, Melhorar, Formal, Profissional, Amigável, Natural, Conciso, Engraçado ou Reescrever.
2. Em **Tipo de IA**, escolha IA Nativa ou Modelo. Somente Modelo exibe a lista Llama/Qwen/Gemma. Cada opção mostra seus próprios controles de preparo; use **Abrir painel lateral** para preparar/baixar. Alternar os modos conserva o modelo salvo, usado como alternativa antes da geração se a IA nativa não estiver pronta. Ajuste gírias, novos emojis e tema se desejar.
3. Escreva o rascunho no WhatsApp e clique em **IA**. Esse gesto captura somente o rascunho atual e inicia a ação salva, sem menu intermediário.
4. No padrão **Substituir diretamente**, a resposta chega ao campo em streaming, sem janela. O primeiro trecho substitui o texto presente naquele momento; os próximos acrescentam somente o sufixo ao final e preservam edições nos trechos recebidos. O cursor pode ir ao final a cada escrita. **Ctrl+Z** usa o histórico nativo, com possíveis operações separadas por trecho. Clicar novamente em IA, Escape ou clique fora cancela o pedido; troca de conversa/editor impede novas escritas. Em **Ao clicar em IA → Revisar sugestão**, confira o resultado e escolha Copiar/Substituir.

Português brasileiro é automático. A extensão consulta as APIs especializadas com idioma declarado; se não estiverem prontas, consulta a Prompt API com a instrução de responder em português do Brasil. Essa compatibilidade foi validada nas versões registradas, sem promessa de qualidade universal. Consulte as [referências de idioma/cache](REFERENCIAS-IA-CHROME.md).

Downloads sempre exigem ação explícita: **Preparar IA** no painel lateral para o navegador e **Baixar modelo** para o modelo escolhido, com tamanho informado, progresso e cancelamento. No modo de prévia, Baixar e continuar também permanece disponível. No modo direto, cache ausente é informado no tooltip; o rascunho permanece intacto até preparar o modelo nas configurações. A inferência preparada funciona offline; o WhatsApp ainda depende da própria conexão. A variante compatível é escolhida automaticamente, sem controles técnicos na interface.

Cada pedido faz uma única geração com o original, sem repetição automática após falha. A [STEP-15-E](steps/STEP-15-E.md) retirou a avaliação automática de conteúdo; o usuário decide o conteúdo e quando enviar. Saídas vazias ou tecnicamente inutilizáveis são erros. Várias linhas e emojis permitem aplicação direta; estruturas especiais continuam protegidas, com cópia disponível na prévia. O original fica em memória até o fim: falha/cancelamento restaura automaticamente se não houve edição humana após a primeira escrita; com edição, oferece recuperação explícita sem apagá-la. Ação manual de envio encerra o pedido sem restauração.

## Configurações e privacidade

Preferências ficam somente no popup e painel lateral. Padrões: Substituir diretamente, Corrigir, IA Nativa, Llama 3.2 3B como alternativa, tema do sistema, preservar gírias e não adicionar novos emojis. O esquema v8 preserva escolhas anteriores de ação/modelo/opções e adota o modo direto na migração; Revisar sugestão é uma seleção explícita. Os antigos interruptores de idioma e avaliação semântica são descartados.

Em **Tipo de IA → Modelo → Armazenamento e memória**, **Liberar memória** cancela pedidos ativos e mantém o download; **Remover download** pede confirmação e remove os artefatos selecionados. A memória também é liberada após cinco minutos sem uso. O navegador administra separadamente os próprios recursos de IA. Os recibos de integridade descrevem apenas artefatos públicos, sem hashes de mensagens; integridade completa é conferida ao carregar, sem recalcular pesos nas consultas da interface. Apenas o componente da opção selecionada fica montado; alternar o tipo encerra preparações/downloads da interface.

Somente preferências são persistidas. Rascunhos, prompts, respostas, contatos e histórico não são gravados nem enviados a serviços de IA. Bibliotecas JavaScript/WASM são locais; apenas dados de modelos podem ser baixados das origens restritas do Manifest. [Licenças](../NOTICE.txt) acompanham o pacote. Simulações e provas continuam restritas às ferramentas de desenvolvimento e aos registros históricos, sem atalhos na interface.

## Comandos

Os roteiros de navegador STEP-06 até STEP-16 preservam os contratos históricos e devem ser executados no commit da etapa correspondente. Para os ajustes vigentes, use `check`, `test:step16a:browser` (streaming) e `test:step16b:browser` (configurações); as evidências anteriores continuam disponíveis nos relatórios.

| Comando                                       | Finalidade                                                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| npm run dev                                   | Servir as páginas auxiliares em http://127.0.0.1:5173.                                                         |
| npm run typecheck                             | Conferir tipos do navegador e das ferramentas sem emitir arquivos.                                             |
| npm run lint                                  | Conferir código com informação de tipos, sem aceitar avisos.                                                   |
| npm run format:check                          | Conferir formatação.                                                                                           |
| npm run format                                | Aplicar formatação.                                                                                            |
| npm test                                      | Executar testes, incluindo um build completo temporário.                                                       |
| npm run test:step06:browser -- online         | Executar a prova WebGPU em Chrome for Testing; requer `STEP06_CHROME`.                                         |
| npm run test:step07:browser -- corrections    | Exercitar correção real em Chrome com fixture sintética; requer `STEP07_CHROME`.                               |
| npm run test:step07:browser -- context        | Conferir vazio e orçamento de contexto no Chrome; requer `STEP07_CHROME`.                                      |
| npm run test:step07:browser -- regression     | Conferir a prévia simulada no Chrome; requer `STEP07_CHROME`.                                                  |
| npm run test:step08:browser -- corrections    | Exercitar proteção e rejeições seguras no Chrome; requer `STEP08_CHROME`.                                      |
| npm run test:step08:browser -- context        | Conferir vazio e limite de contexto no Chrome; requer `STEP08_CHROME`.                                         |
| npm run test:step08:browser -- regression     | Conferir a prévia simulada no Chrome; requer `STEP08_CHROME`.                                                  |
| npm run test:step09:browser -- fixture        | Exercitar os nove modos em fixture no Chrome; requer `STEP09_CHROME`.                                          |
| npm run test:step09:browser -- whatsapp       | Exercitar rascunhos sintéticos no grupo de teste autorizado; requer perfil logado.                             |
| npm run test:step10:browser                   | Conferir streaming e cancelamento no Chrome/WebGPU com fixture sintética.                                      |
| npm run test:step11:browser                   | Avaliar o verificador e a preferência no Chrome/WebGPU; requer `STEP11_CHROME`.                                |
| npm run test:step12:browser -- qualidade      | Validar o perfil no Chrome/WebGPU com fixture sintética; requer `STEP12_CHROME`.                               |
| npm run test:step12:switch                    | Conferir troca durante geração e liberação do Worker; requer os perfis em cache.                               |
| npm run test:step14:browser                   | Validar popup/painel, migração, sincronização, temas, teclado e reinício; requer `STEP14_CHROME`.              |
| npm run test:step14:model                     | Validar escrita WebGPU e liberar/apagar modelo com fixture; requer `STEP14_CHROME`.                            |
| npm run test:step15b:browser                  | Painel/offscreen reais offline; Chrome instalado ou CfT, conforme o relatório B.                               |
| npm run test:step15b:portuguese               | Doze fixtures pt-BR por prompt; requer `STEP15B_REGULAR_CHROME`.                                               |
| npm run test:step15b:specialized              | Rewriter/Proofreader reais em inglês; requer Chrome instalado, usa flags no perfil de teste.                   |
| npm run test:step15c:browser                  | Nove ações Gemma reais; requer `STEP15C_CHROME`. Com `STEP15C_OFFLINE=1`, reinicia com cache offline.          |
| npm run test:step15c:controls                 | Streaming, prova, revisão, concorrência, cancelamento, troca e idle de cinco minutos.                          |
| npm run test:step15c:cache                    | Remoção real, interrupção, reparo autorizado e auditoria de rede; exige cache inicial preparado.               |
| npm run benchmark:step15d                     | Comparar cinco motores em blocos retomáveis, com conjunto reservado e fontes congeladas.                       |
| npm run benchmark:step15d:report -- diretório | Validar anotações/hashes e resumir qualidade, avisos e latência da campanha.                                   |
| npm run test:step15e:browser                  | Validar revisão manual, migração, cópia/substituição, desfazer e obsolescência com Chrome/WebLLM/Gemma reais.  |
| npm run test:step15f:browser                  | Validar configurações simples e ação salva por um clique com Chrome/WebLLM/Gemma reais.                        |
| npm run test:step15f:popup                    | Conferir o popup nativo real do Chrome, sua largura, título e ausência de rolagem horizontal.                  |
| npm run test:step15h:browser                  | Validar modo direto, tooltip, Ctrl+Z, cancelamento e prévia opcional; requer STEP15H_CHROME e STEP15H_ENGINE.  |
| npm run test:watch                            | Reexecutar testes durante a edição.                                                                            |
| npm run build                                 | Conferir tipos e gerar a extensão completa em dist.                                                            |
| npm run package                               | Gerar pacote instalável em release e inventário SHA-256; exclui páginas de desenvolvimento.                    |
| npm run test:step16:browser                   | Validar instalação limpa ou motor preparado; requer STEP16_CHROME e STEP16_MODE.                               |
| npm run test:step16a:browser                  | Validar streaming do adaptador/sessão no Chrome real com geração e editor sintéticos; aceita STEP16A_CHROME.   |
| npm run test:step16a:installed                | Instalar release em perfil dedicado e conferir padrões/cache ausente/storage; aceita STEP16A_CHROME.           |
| npm run test:step16a:whatsapp                 | Conferir edição com geração sintética no WhatsApp autenticado; exige conversa confirmada e STEP16A_CDP.        |
| npm run test:step16b:browser                  | Conferir IA Nativa/Modelo no popup/painel reais, teclado, sincronização e persistência; aceita STEP16B_CHROME. |
| npm run preview                               | Servir as páginas construídas em http://127.0.0.1:4173.                                                        |
| npm run check                                 | Executar tipos, lint, formatação, testes e build; parar na primeira falha.                                     |

O roteiro H aceita STEP15H_ENGINE=chrome, webllm ou gemma, usa os perfis de teste dedicados e exige cache preparado. Reutiliza o roteiro F para a regressão da prévia; não acessa o perfil pessoal nem envia mensagens. [Evidências H](VALIDACAO-STEP-15-H.md). Benchmarks e registros históricos permanecem disponíveis.

Os servidores escutam apenas no computador local e falham se a porta estiver ocupada. Encerre com Ctrl+C. O preview valida React e estilos; **localhost não executa APIs de extensão**. O diagnóstico nesse endereço informa que precisa ser aberto pela extensão instalada.

## Componentes implementados

| Local                    | Responsabilidade                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| manifest.json            | MV3, permissões, CSP e entradas do pacote.                                                            |
| src/extension/background | Coordenador, remetentes, roteador e criação idempotente do offscreen.                                 |
| src/extension/offscreen  | Seleção de motor, adaptador nativo e Worker; comunicação por chrome.runtime.                          |
| src/extension/ai         | Chrome/WebLLM/Gemma, ciclo de vida, prompts, streaming, saída técnica, orçamento e simulador.         |
| src/extension/content    | Botão e sugestão React com Shadow DOM, sessão em memória e clientes de comunicação.                   |
| src/integration/whatsapp | Seletores, detecção, leitura de blocos, revisão e substituição nativa do editor.                      |
| src/extension/diagnostic | Página de comunicação simulada para desenvolvimento, sem link na interface.                           |
| src/shared               | Contratos, validação dos payloads/remetentes e fixture sintética.                                     |
| src/development          | Página React auxiliar da STEP-02, preservada.                                                         |
| tests                    | Contratos, remetentes, roteamento, cancelamento, recuperação, simulador, pacote e fixtures do editor. |

WebLLM 0.2.82 executa a prova sintética e as nove ações na mesma instância do perfil selecionado. A versão foi fixada devido à falha de GPU observada com 0.2.85; as bibliotecas WASM locais são compatíveis com o catálogo `v0_2_80`. Popup e painel lateral guardam as preferências; o editor executa a ação salva (STEP-15-F).

## Detecção e revisão do editor

O adaptador procura um único textbox contenteditable visível no footer de #main. Recusa campos de busca, diálogo, ocultos, desativados, somente leitura e seleções ambíguas. Os seletores ficam centralizados e não dependem de classes ofuscadas, idioma ou placeholder. Uma mudança estrutural do WhatsApp pode exigir atualização do adaptador; na ausência de um editor reconhecido, o botão desaparece.

MutationObserver acompanha o campo editável, a estrutura direta do compositor e o título da conversa, além dos filhos diretos dos ancestrais. Mudanças transitórias nos demais controles do rodapé ou no status do grupo não invalidam o rascunho. Não observa profundamente body nem o histórico. Uma descoberta estrutural a cada segundo cobre contêineres novos e mudanças externas de CSS; atualizações são agrupadas por frame. O host da extensão é ignorado e o Shadow DOM isola os estilos. ResizeObserver e eventos de scroll/resize atualizam a posição; os listeners, observadores e timers são encerrados ao sair da página. O retorno pelo cache de navegação remonta a integração.

Capturas têm UUIDs aleatórios e revisão, sem identidade de contato. Edição e composição IME invalidam a revisão usada pela prévia. O modo direto confere uma revisão separada do contexto: documento, editor e título devem permanecer os mesmos, inclusive quando outra conversa contém texto idêntico. A escrita aguarda o término da composição IME. Não se lê o conteúdo do cabeçalho. A conferência drena mutações pendentes antes de decidir se ela ainda é atual. Cliques sintéticos disparados pela página são ignorados.

Copiar e Substituir conferem novamente o texto, documento, editor e revisão capturados. O módulo `native-edit` aguarda foco/seleção do editor controlado, confere texto/contexto antes da mutação e usa edição nativa. Para várias linhas, oferece um evento público de colagem com texto simples, sem ler/escrever o clipboard do sistema; se não tratado, usa insertText/insertLineBreak. Não escreve innerHTML nem usa APIs internas do WhatsApp. O resultado é conferido após a reconciliação da página. As operações mantêm o histórico de desfazer do campo; não há promessa de uma única transação para todo o streaming. A API execCommand é obsoleta e o suporte foi validado no Chrome indicado no relatório, sem garantia para versões futuras.

`StreamingDraft` serializa escritas e agrega prefixos cumulativos rápidos. Depois da primeira substituição, calcula somente o sufixo do modelo e o acrescenta ao conteúdo atual, preservando edições humanas. Espaços finais e surrogate Unicode incompleto são retidos até o próximo trecho. Cada escrita confere contexto e cancelamento antes da mutação; eventos atrasados são descartados. Recuperação automática exige conteúdo igual ao último escrito e ausência de edições observadas; caso contrário, o original permanece disponível em memória para restauração por clique. Mudança de contexto nunca restaura na outra conversa.

## Geração e revisão opcional

O modelo recebe o rascunho original e gera uma vez. No padrão direto, a resposta chega ao campo em streaming após o clique em IA; a conclusão acrescenta apenas o trecho faltante, sem reaplicar o resultado inteiro. Na opção Revisar sugestão, **Copiar/Substituir** são escolhas explícitas, sem confirmação adicional ou avisos automáticos de conteúdo, e edição do original invalida a sugestão. Cancelamento/desconexão encerra o pedido e usa a recuperação descrita acima. A extensão nunca envia mensagens. Streaming não aumenta o limite do protocolo ou o orçamento de contexto/saída de cada modelo.

Correções de capitalização e ortografia não recebem julgamento automático. A análise de sentido e sua preferência foram removidas; preferências v8 preservam as demais escolhas e incluem o modo direto/prévia. Os dados de avaliação dos benchmarks e relatórios anteriores permanecem históricos.

O pacote atual inclui [STEP-15-B](steps/STEP-15-B.md): **Chrome preferencial** e escolha manual de WebLLM, com modelo local preservado como alternativa. A seleção consulta ação e pt-BR no documento offscreen; Chrome só é escolhido se estiver disponível e sua sessão puder ser criada sem download. Uma falha após começar a geração encerra o pedido, sem repetição ou troca de motor.

Nas configurações, **Tipo de IA → IA Nativa** mostra o estado da ação selecionada. **Preparar IA** chama a API no clique visível e acompanha o download, confirmado no offscreen. APIs especializadas têm preferência quando disponíveis para o idioma e ação; as demais ações usam Prompt. O Chrome administra CPU/GPU e seus próprios artefatos, separadamente dos modelos selecionáveis.

A compatibilidade de idioma é automática: tenta idioma declarado/API especializada, depois a abordagem autorizada e verificada na [STEP-15-G](VALIDACAO-STEP-15-G.md), com sessão en e resposta pt-BR por instrução. Não há interruptor de idioma. Se essa configuração não estiver pronta, o modelo local selecionado é escolhido antes da geração. Os resultados B/D continuam históricos; a compatibilidade não garante qualidade universal.

As tipagens `@types/dom-chromium-ai` **0.0.17** estão fixadas. Português declarado nas opções segue indisponível no Chrome testado, mas 12 fixtures e o fluxo nativo/offscreen offline passaram pelo modo por prompt. STEP-15-B **Concluída**, conforme [evidências e limitações](VALIDACAO-STEP-15-B.md). [Gemma/STEP-15-C](VALIDACAO-STEP-15-C.md) concluída; [STEP-15-D](VALIDACAO-STEP-15-D.md) concluída, com campanhas reservadas e revisão independente de qualidade/desempenho. Casos históricos pendentes cobertos em novas campanhas, preservando os arquivos antigos. A validação final STEP-16 está registrada em [seu relatório](VALIDACAO-STEP-16.md).

Para validar a entrega com fixtures sintéticas e inferência real offline, use `STEP16_CHROME`, `STEP16_MODE=clean|chrome|webllm|gemma` e `npm.cmd run test:step16:browser`. Os modos de inferência exigem perfil dedicado com o candidato completamente preparado; clean usa o pacote release em perfil novo. Os harnesses A–D retratam contratos históricos anteriores ao ajuste E; suas evidências canônicas permanecem intactas.

## Comparação de IA — STEP-15-D

Na RTX 4060 Laptop testada, Chrome Prompt experimental foi o mais rápido para Corrigir, Melhorar e Reescrever. Gemma foi a recomendação local geral, com menos mudanças de conteúdo e ganhos de utilidade em Formal, Natural e Conciso, à custa de maior latência. Os três tons Profissional, Amigável e Engraçado continuam com resultados fracos; o nome Qualidade do perfil Qwen 8B não comprova superioridade. Veja a [comparação por ação, métricas e limites](VALIDACAO-STEP-15-D.md) antes de escolher.

O WebLLM recebe o texto original delimitado como string JSON, com orçamento para a mensagem completa. A delimitação reduziu alguns problemas no piloto, mas continua permitindo aspas externas e execução de instruções citadas. Chrome e Gemma mantêm os prompts anteriores. Toda resposta exige revisão pelo usuário; a avaliação automática de conteúdo foi removida na E.

As campanhas possuem [procedimento reproduzível](benchmark/STEP-15-D.md) e [evidências sintéticas](benchmark/step15d/README.md). A escolha de modelo permanece configurável; Chrome preferencial e a compatibilidade pt-BR por instrução são automáticos, conforme os ajustes F/G. Os resultados D não certificam suporte formal ao idioma.

Para seguir a recomendação local nesta GPU, selecione **Tipo de IA → Modelo**, escolha **Gemma 4 E2B** e prepare o modelo pelo fluxo explícito de download. O perfil WebLLM anterior permanece preservado para uma futura troca manual.

## Protocolo e ciclo de vida

O adaptador aceita white-space:pre-wrap mesmo quando o Chrome o enumera pelas
propriedades white-space-collapse/text-wrap-mode; a combinação precisa continuar
equivalente a pre-wrap. Em BR, data-lexical-managed-linebreak=true é metadado neutro
do editor. A guarda de menções/decoradores/atributos ou estilos especiais permanece.
O roteiro `test:step16c:browser` é a regressão para a serialização CSS do Chrome real,
que o jsdom não reproduz igualmente. `test:step16c:whatsapp` confere colagem text/plain
no perfil vinculado e exige contato confirmado, campo vazio e fixture.js gerado.

O diagnóstico solicita ao coordenador um teste em uma aba permitida. O coordenador encaminha a fixture ao content script; este prepara o documento offscreen e abre um canal direto com ele. A resposta faz o caminho Worker → offscreen → content script. Só então o content script devolve o relatório ao diagnóstico. A página não pode substituir o texto sintético por dados arbitrários.

Uniões discriminadas e validação em tempo de execução cobrem start, cancel, status, progress, fragmentos de ação, result, cancelled, error e rejected. As nove ações usam o rascunho com o modelo real. `simular`, `prova-modelo` e `revisar-sentido` permanecem contratos de diagnóstico/testes internos, sem controles no produto; a entrega exclui suas páginas de desenvolvimento. O modo é vinculado ao pedido, a cada trecho e à resposta, evitando aplicar uma saída de outro modo. A preferência antiga nunca inicia uma segunda geração automática. Payloads têm campos fechados, IDs limitados e texto de até 8.000 unidades UTF-16. O tokenizer compatível com o modelo inclui template, instruções e reserva de saída no limite de 4.096 tokens; excedê-lo gera aviso sem truncar o rascunho.

Cada pedido carrega requestId, editorId, snapshotId e revisão. O roteador no offscreen acrescenta aba, frame, documento e conexão com base no remetente do Chrome. O diagnóstico usa identidades fictícias; a prévia usa o snapshot real solicitado explicitamente. Respostas só são aceitas quando todos os campos do vínculo conferem. O cliente da prévia também fixa o vínculo recebido e descarta eventos divergentes ou posteriores ao cancelamento.

Há um pedido ativo por vez, inclusive durante a preparação do motor. Pedidos concorrentes recebem **IA ocupada**, sem fila. Cancelar envia o comando ao Worker e espera a confirmação; se não houver resposta, a desconexão após dois segundos encerra o Worker. Fragmentos e resultados tardios são descartados. A espera de prontidão é limitada a cinco segundos; a simulação dura no máximo quinze segundos e as ações reais podem levar até uma hora para download/inferência, sem replay. O Worker e seus recursos de GPU são encerrados após cinco minutos contados a partir do término da última operação; pedidos ativos suspendem esse temporizador. O encerramento não remove artefatos.

A criação do offscreen é compartilhada entre chamadas concorrentes. runtime.getContexts verifica o documento existente e WORKERS justifica sua criação. O coordenador confirma a prontidão do documento; o roteador local espera a prontidão do Worker antes de encaminhar texto. O Service Worker pode encerrar por inatividade durante a geração: ele não hospeda mais o pedido nem sua porta. Não há reconexão periódica, keepalive artificial ou replay. Perder a aba, o canal direto ou o contexto da IA encerra o pedido; uma nova ação explícita pode reutilizar o documento sobrevivente. A [validação da correção](VALIDACAO-STEP-12.md#correção-da-conexão-durante-inferência--30092026) registra o encerramento natural do coordenador durante duas gerações reais.

## Permissões e privacidade

- offscreen hospeda os Workers locais e o adaptador nativo; Chrome Storage local guarda somente `writingPreferences` v8 com os campos descritos acima, WebLLM Econômico como alternativa por padrão.
- Content script restrito a https://web.whatsapp.com/*. A permissão desse host permite listar/verificar apenas suas abas no diagnóstico, sem conceder `tabs` global. O Worker usa permissões adicionais somente para dados fixos do modelo em `huggingface.co` e `us.aws.cdn.hf.co`.
- Não há activeTab, scripting, <all_urls>, externally_connectable, APIs internas do WhatsApp, interceptação de tráfego ou ponte com scripts da página.
- CSP permite scripts/workers locais e WASM empacotado, sem código remoto. `connect-src` aceita o próprio pacote e os dois hosts de dados acima.
- Não há armazenamento de textos, logs de conteúdo ou persistência de pedidos. Cache API guarda somente artefatos do modelo e seus recibos de integridade; Chrome Storage guarda apenas a preferência versionada de escrita, motor e modelo. O relatório sintético permanece em memória até a página fechar.
- O rascunho só é lido ao clicar em IA e conferir a aplicação ou uma ação explícita de cópia/substituição (inclusive ativação por teclado). Detecção, observadores e consulta de revisão não leem o texto. A captura e a resposta permanecem em memória até serem descartadas, sem leitura de histórico/contatos. O clique em IA autoriza a substituição no modo direto; no modo de prévia, exige Substituir. A extensão nunca envia a mensagem.
- Copiar usa a área de transferência do sistema por escolha explícita. Não há leitura dela pelo produto nem nova permissão de extensão. O sistema operacional e outros aplicativos podem acessar o texto copiado conforme suas próprias configurações.

## Build e verificações

A STEP-15 acrescenta [108 casos sintéticos anotados e execução reproduzível](benchmark/README.md), métricas por modelo e revisão independente. O [relatório histórico](VALIDACAO-STEP-15.md) preserva recusas e limitações do pipeline anterior. A STEP-15-A apresentava riscos como avisos; a STEP-15-E remove essa avaliação do produto. A revisão final pertence ao usuário. O produto não persiste textos; somente os harnesses gravam fixtures sintéticas e seus resultados.

Vite gera as páginas HTML, o Service Worker ES module e o Worker local. Uma compilação IIFE separada incorpora o content script em arquivo clássico, sem imports ESM. O Manifest é copiado explicitamente; não há diretório public genérico. A saída contém caminhos relativos, JavaScript/CSS locais e avisos de licença em dist/.vite/license.md.

Variáveis de ambiente não são incorporadas automaticamente; o bundle do content script fixa apenas o modo de produção do React, sem depender de process no navegador. Não coloque segredos nas fontes ou no Manifest. O alvo de sintaxe é chrome116. Após editar, gere dist novamente, recarregue a extensão e as abas do WhatsApp.

Os testes conferem remetentes, campos extras, limites, vínculos divergentes, concorrência, cancelamento, descarte de eventos atrasados, desconexão, timeout, criação única e reconexão. O simulador integrado ao roteador testa eco Unicode/multilinha. O teste de build gera um pacote temporário e verifica Manifest/CSP, contextos locais, sintaxe clássica do content script, ausência de scripts inline, código de desenvolvimento e valores sintéticos de ambiente. A limpeza confirma caminho e prefixo antes de remover o diretório temporário.

Esses testes não certificam a execução das APIs do Chrome. Consulte o progresso e os relatórios para distinguir testes automatizados de evidência real. A STEP-06 acrescentou prova de WebGPU no Chrome, com fixture sintética, teste offline após reinício, falha de download e inspeção de cache/storage. A STEP-07 acrescentou correção real no Chrome, aplicação manual e recusas seguras. A STEP-08 verifica extração e preservação determinística, além do fluxo real no Chrome. Auditoria final de privacidade permanece na STEP-16.

A STEP-05 acrescenta testes de captura explícita, leitura de parágrafos/linhas vazias, estruturas somente para cópia, seleção, desfazer, cancelamento durante a substituição, falhas de cópia e descarte de resultados obsoletos. O relatório registra também execução do pacote instalado no Chrome e aplicação/desfazer no WhatsApp real.

## Versões travadas

| Ferramenta                      | Versão                         |
| ------------------------------- | ------------------------------ |
| React / React DOM               | 19.3.0                         |
| TypeScript                      | 6.0.3                          |
| Vite / plugin React             | 8.3.1 / 6.1.1                  |
| Vitest                          | 5.0.1                          |
| ESLint / @eslint/js             | 10.11.0 / 10.0.1               |
| typescript-eslint               | 8.70.1                         |
| Prettier                        | 3.9.9                          |
| @types/node                     | 22.20.4                        |
| @types/react / @types/react-dom | 19.3.0                         |
| @types/chrome                   | 0.3.0                          |
| @types/dom-chromium-ai          | 0.0.17                         |
| jsdom (somente testes)          | 29.1.1                         |
| Base UI (Switch shadcn)         | 1.9.0                          |
| WebLLM                          | 0.2.82                         |
| Transformers.js                 | 4.2.0                          |
| ONNX Runtime Web                | 1.26.0-dev.20260416-b7804b056c |
| @mlc-ai/web-tokenizers          | 0.1.6                          |
| @webgpu/types (somente tipos)   | 0.1.69                         |
| adm-zip (empacotamento)         | 0.6.1                          |
| playwright-core (prova Chrome)  | 1.55.0                         |

Versões diretas são exatas e transitivas ficam em package-lock.json. Use npm ci, sem --force ou --legacy-peer-deps. TypeScript 6.0.3 foi mantido porque typescript-eslint 8.70.1 requer versão menor que 6.1.0. jsdom 29.1.1 aceita Node 22.13+, enquanto a linha 30 consultada exige Node 22.22.2+; o ambiente permanece em 22.14.0. Tipos do Chrome não substituem a conferência da versão mínima de cada API.

Consulte [português por prompt, localstudio e cache](REFERENCIAS-IA-CHROME.md). O contorno inicial sem declarações de B foi substituído pela saída en com instrução pt-BR em G, sem interruptor na interface. `GpuBlocked` observado no CfT corresponde à classificação padrão dessa build; não impediu o Chrome instalado no mesmo hardware. O fluxo WebLLM offline também passou. As avaliações A–D e ajustes E–H estão concluídos; o status da entrega STEP-16 está em PROGRESSO.md.

## Referências técnicas

- [Chrome Offscreen: WORKERS, documento único e runtime](https://developer.chrome.com/docs/extensions/reference/api/offscreen).
- [Mensagens e conexões](https://developer.chrome.com/docs/extensions/develop/concepts/messaging). Listeners usam return true com sendResponse, compatível com Chrome 116, sem exigir suporte recente a retorno de Promise.
- [Chrome Tabs e permissões de host](https://developer.chrome.com/docs/extensions/reference/api/tabs).
- [Ciclo de vida do Service Worker](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle).
- [CSP de extensões](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy).
- [Content scripts e isolamento](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts).
- [MDN: execCommand, limitações e histórico de edição](https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand).
- [jsdom e versões do Node](https://github.com/jsdom/jsdom/releases).
- [WebLLM 0.2.82](https://github.com/mlc-ai/web-llm/releases/tag/v0.2.82), [catálogo da versão](https://github.com/mlc-ai/web-llm/blob/v0.2.82/src/config.ts), [falha de GPU das versões posteriores](https://github.com/mlc-ai/web-llm/issues/844), [licença Llama 3.2](https://dev.meta.ai/llama/llama3_2/license) e [licenças incluídas](../licenses/LLAMA-3.2-LICENSE).
- [Vite: build](https://vite.dev/guide/build.html), [Vitest](https://vitest.dev/guide/), [ESLint](https://eslint.org/docs/latest/use/getting-started) e [compatibilidade do typescript-eslint](https://typescript-eslint.io/users/dependency-versions/).

## Entrega por etapa

Cada etapa entrega seu escopo completo, com verificações e commit próprio após a validação. Usar Conventional Commits e a identidade humana já configurada no Git. Ver [AGENTS.md](../AGENTS.md) e o estado atual em [PROGRESSO.md](PROGRESSO.md). Não iniciar automaticamente a próxima etapa.
