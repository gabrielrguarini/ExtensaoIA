# Extensão de IA local para WhatsApp Web

Base incremental com React, TypeScript strict e pacote Manifest V3. O menu **IA** oferece nove ações com Chrome nativo quando disponível, Gemma 4 E2B via Transformers.js e perfis locais Econômico (Llama 3.2 3B), Equilibrado (Qwen3 4B) e Qualidade (Qwen3 8B) via WebGPU, além de revisão semântica opcional. Português por prompt no Chrome é uma opção experimental validada no navegador instalado. A geração mostra trechos provisórios e pode ser cancelada. As ações usam o original e apresentam respostas legíveis com avisos antes de Copiar ou Substituir mesmo assim. A prova sintética e a prévia simulada continuam identificadas. Nenhuma mensagem é enviada. O diagnóstico da STEP-03 permanece disponível.

O estado e as evidências ficam em [docs/PROGRESSO.md](docs/PROGRESSO.md). Consulte o [plano](docs/PLANO.md) e execute somente a etapa solicitada. A conclusão depende das verificações automatizadas e da validação correspondente no Chrome.

## Requisitos e instalação

- Node.js 22.13+ na linha 22, ou versão compatível das linhas 24/26+; npm 10.9.2+ compatível com o Node instalado.
- Ambiente usado: Windows, Node 22.14.0 e npm 10.9.2. Nenhuma atualização global é necessária.
- Chrome 116+ para runtime.getContexts, offscreen e identificação de documentos. O mínimo declarado é um requisito das APIs, não certificação de todas as versões ou de WebGPU.
- Internet para instalar dependências e, por ação explícita, baixar os dados do modelo de uma revisão fixa. Após o download completo, a inferência pode usar o cache local.

Na pasta do projeto:

```sh
npm ci
npm run check
```

No PowerShell, use npm.cmd se a política local bloquear npm.ps1; não altere a política do sistema.

Abra chrome://extensions, habilite o modo do desenvolvedor, escolha **Carregar sem compactação** e selecione a pasta **dist**. Recarregue as abas do WhatsApp após instalar ou atualizar. O ícone da extensão abre o popup de configurações. Clique em **Abrir painel lateral** para manter as preferências e informações visíveis. O link **Diagnóstico da comunicação simulada** continua disponível no rodapé dessas interfaces.

Siga o [roteiro completo da STEP-03](docs/VALIDACAO-STEP-03.md), que cobre circuito, duas abas, concorrência, cancelamento, desconexão e reinício. Não é necessário abrir conversas ou enviar mensagens.

Para testar a escrita, consulte [validação e limites da STEP-05](docs/VALIDACAO-STEP-05.md). Escreva um rascunho sintético, clique em **IA → Criar prévia simulada** e revise o resultado. Abrir o menu não lê o texto; solicitar a prévia o captura em memória e o encaminha ao Worker local. **Substituir** confirma a edição nativa, que pode ser desfeita com Ctrl+Z. **Copiar** grava a sugestão na área de transferência somente pelo clique. **Cancelar**, Escape e clique fora descartam a prévia; edição ou troca de contexto invalidam sugestões anteriores.

Para usar a IA, escreva um rascunho e escolha **Corrigir**, **Melhorar**, **Formal**, **Profissional**, **Amigável**, **Natural**, **Conciso**, **Engraçado** ou **Reescrever** no menu **IA**. O motor padrão é **Chrome preferencial**, quando a ação e pt-BR estiverem disponíveis no documento de inferência. **Modelo local e alternativa** escolhe WebLLM com seu perfil ou **Gemma 4 E2B via Transformers.js** antes da geração. **Modelo local selecionado** usa essa escolha manualmente. Prepare a IA nativa no painel lateral por clique em **Verificar IA do Chrome** e, quando elegível, **Preparar**. Downloads próprios exigem **Baixar e continuar**. Os textos são processados localmente, sem ler a conversa.

Cada pedido faz uma geração com o texto original. Trechos provisórios não podem ser aplicados. Após validar a saída técnica, a prévia legível oferece aviso geral de revisão e riscos detectados, **Copiar** e **Substituir mesmo assim**, sem confirmação adicional. A resposta idêntica aparece como sem alterações; saída vazia ou tecnicamente inutilizável é erro. **Cancelar**, desconexão e rascunho alterado impedem aplicação. Não se garante equivalência semântica pela ausência de avisos.

A preferência **Revisão semântica adicional** habilita **Analisar sentido** na prévia. A análise só começa por essa ação explícita e acrescenta avisos, sem gerar outra reescrita automaticamente. O histórico de placeholders e bloqueios está preservado nos relatórios anteriores; o fluxo vigente está documentado nas [STEP-15-A](docs/VALIDACAO-STEP-15-A.md) e [STEP-15-B](docs/VALIDACAO-STEP-15-B.md).

Os perfis usam variantes q4f16_1 com `shader-f16` e q4f32_1 sem esse recurso. A variante f32 pede mais memória; o navegador informa limites de buffer, mas não a VRAM livre. A troca cancela pedidos ativos e libera o modelo anterior. Uma falha de recursos mantém a escolha e indica um perfil menor. Os pesos vêm apenas das revisões fixadas do Hugging Face; os seis WASM compatíveis com WebLLM 0.2.82 já estão no pacote.

Gemma usa Transformers.js **4.2.0**, modelo ONNX textual e tokenizer fixados por revisão/SHA-256. Baixa cerca de **3,13 GB** em q4f16, ou **3,65 GB** em q4 quando shader-f16 não estiver disponível; não baixa áudio/visão. Ambas as variantes quantizam pesos em quatro bits. Contexto do produto: 4.096 tokens. O nome E2B não comprova menor memória que Llama 3B. Os controles **Atualizar estado do Gemma**, **Liberar Gemma** e **Apagar arquivos do Gemma** administram somente seus artefatos. A integridade é conferida ao carregar; cache íntegro permite reinício e inferência offline, sem garantia de persistência. [Validação C e limites de hardware](docs/VALIDACAO-STEP-15-C.md).

Para conferir a inferência, clique em **IA → Testar IA local**. Se o perfil escolhido ainda não estiver no cache, use **Baixar e continuar** após revisar o tamanho e a variante. O teste usa somente a frase sintética fixa; o resultado aparece separado da prévia e não oferece Substituir ou Copiar. O download aceita apenas `huggingface.co` e o redirecionamento observado `us.aws.cdn.hf.co`, sem JavaScript remoto. As bibliotecas WASM já estão no pacote. Se o redirecionamento mudar para outra origem, o download falhará de forma segura até que a configuração seja revista. Consulte [a matriz, os artefatos e a prova real dos perfis](docs/VALIDACAO-STEP-12.md).

O menu oferece **Remover cache da variante selecionada**. Essa ação cancela o pedido ativo, encerra o Worker e remove somente arquivos e recibos sob a revisão fixa daquela variante; preserva preferências, outros modelos e dados de outros sites. No WebLLM, antes de uma inicialização fria, todos os shards passam pela conferência de tamanho e MD5 publicado no índice; JSONs passam por conferência estrutural, e recibos SHA-256 locais detectam mudanças posteriores em todos os arquivos. Gemma confere tamanho/SHA-256 fixados no catálogo. Os recibos descrevem somente artefatos públicos, sem hashes de mensagens. Cache ausente, interrompido ou inconsistente exige **Baixar e continuar**; o reparo reaproveita arquivos válidos. A persistência depende do navegador, espaço e políticas de armazenamento. Limpeza ou remoção pode exigir novo download. A disponibilidade offline refere-se à inferência após preparação completa, não ao WhatsApp. Veja [a validação da STEP-13](docs/VALIDACAO-STEP-13.md).
Textos com várias linhas, menções estruturadas, formatação especial e editores sem suporte oferecem **somente cópia**. O teste real encontrou perda de quebras de linha na inserção nativa do WhatsApp; o rascunho multilinha permanece intacto e a cópia preserva suas linhas. Confira menções e formatação ao colar. Nenhuma API interna do site é utilizada para contornar esse limite.

## Preferências e interfaces auxiliares

O popup, o painel lateral e o menu junto ao editor compartilham motor, idioma pt-BR, tema Sistema/Claro/Escuro, ação padrão, perfil local, preservação de gírias, permissão de novos emojis e revisão semântica. Os padrões são Chrome preferencial, Sistema, Corrigir, Econômico, preservar gírias, sem novos emojis, sem revisão adicional e português por prompt experimental desligado. Os emojis originais são solicitados na geração e conferidos com avisos; Formal pode adaptar gírias. **Usar ação padrão** executa a escolha salva. Copiar e Substituir permanecem na prévia.

Privacidade local é obrigatória e informativa. Somente `writingPreferences`, no esquema v5, vai para `chrome.storage.local`; migrações de v1/v2/v3/v4 preservam valores válidos e descartam campos desconhecidos. Dados inválidos recebem padrões seguros. Não se armazenam textos, prompts, respostas, contatos ou histórico. As interfaces oferecem licença local, presença dos arquivos por **Atualizar estado do modelo** (integridade completa conferida ao carregar) e controles separados: **Liberar memória da GPU** encerra o Worker, cancela pedidos e conserva os artefatos; **Apagar arquivos do modelo** pede confirmação e apaga apenas a revisão/variante selecionada, preservando preferências. Gemma possui controles próprios. O estado exibido corresponde à última consulta; atualize depois de usar a IA. Veja o [relatório da STEP-14](docs/VALIDACAO-STEP-14.md).

## Comandos

| Comando                                       | Finalidade                                                                                            |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| npm run dev                                   | Servir as páginas auxiliares em http://127.0.0.1:5173.                                                |
| npm run typecheck                             | Conferir tipos do navegador e das ferramentas sem emitir arquivos.                                    |
| npm run lint                                  | Conferir código com informação de tipos, sem aceitar avisos.                                          |
| npm run format:check                          | Conferir formatação.                                                                                  |
| npm run format                                | Aplicar formatação.                                                                                   |
| npm test                                      | Executar testes, incluindo um build completo temporário.                                              |
| npm run test:step06:browser -- online         | Executar a prova WebGPU em Chrome for Testing; requer `STEP06_CHROME`.                                |
| npm run test:step07:browser -- corrections    | Exercitar correção real em Chrome com fixture sintética; requer `STEP07_CHROME`.                      |
| npm run test:step07:browser -- context        | Conferir vazio e orçamento de contexto no Chrome; requer `STEP07_CHROME`.                             |
| npm run test:step07:browser -- regression     | Conferir a prévia simulada no Chrome; requer `STEP07_CHROME`.                                         |
| npm run test:step08:browser -- corrections    | Exercitar proteção e rejeições seguras no Chrome; requer `STEP08_CHROME`.                             |
| npm run test:step08:browser -- context        | Conferir vazio e limite de contexto no Chrome; requer `STEP08_CHROME`.                                |
| npm run test:step08:browser -- regression     | Conferir a prévia simulada no Chrome; requer `STEP08_CHROME`.                                         |
| npm run test:step09:browser -- fixture        | Exercitar os nove modos em fixture no Chrome; requer `STEP09_CHROME`.                                 |
| npm run test:step09:browser -- whatsapp       | Exercitar rascunhos sintéticos no grupo de teste autorizado; requer perfil logado.                    |
| npm run test:step10:browser                   | Conferir streaming e cancelamento no Chrome/WebGPU com fixture sintética.                             |
| npm run test:step11:browser                   | Avaliar o verificador e a preferência no Chrome/WebGPU; requer `STEP11_CHROME`.                       |
| npm run test:step12:browser -- qualidade      | Validar o perfil no Chrome/WebGPU com fixture sintética; requer `STEP12_CHROME`.                      |
| npm run test:step12:switch                    | Conferir troca durante geração e liberação do Worker; requer os perfis em cache.                      |
| npm run test:step14:browser                   | Validar popup/painel, migração, sincronização, temas, teclado e reinício; requer `STEP14_CHROME`.     |
| npm run test:step14:model                     | Validar escrita WebGPU e liberar/apagar modelo com fixture; requer `STEP14_CHROME`.                   |
| npm run test:step15b:browser                  | Painel/offscreen reais offline; Chrome instalado ou CfT, conforme o relatório B.                      |
| npm run test:step15b:portuguese               | Doze fixtures pt-BR por prompt; requer `STEP15B_REGULAR_CHROME`.                                      |
| npm run test:step15b:specialized              | Rewriter/Proofreader reais em inglês; requer Chrome instalado, usa flags no perfil de teste.          |
| npm run test:step15c:browser                  | Nove ações Gemma reais; requer `STEP15C_CHROME`. Com `STEP15C_OFFLINE=1`, reinicia com cache offline. |
| npm run test:step15c:controls                 | Streaming, prova, revisão, concorrência, cancelamento, troca e idle de cinco minutos.                 |
| npm run test:step15c:cache                    | Remoção real, interrupção, reparo autorizado e auditoria de rede; exige cache inicial preparado.      |
| npm run benchmark:step15d                     | Comparar cinco motores em blocos retomáveis, com conjunto reservado e fontes congeladas.              |
| npm run benchmark:step15d:report -- diretório | Validar anotações/hashes e resumir qualidade, avisos e latência da campanha.                          |
| npm run test:watch                            | Reexecutar testes durante a edição.                                                                   |
| npm run build                                 | Conferir tipos e gerar a extensão completa em dist.                                                   |
| npm run preview                               | Servir as páginas construídas em http://127.0.0.1:4173.                                               |
| npm run check                                 | Executar tipos, lint, formatação, testes e build; parar na primeira falha.                            |

Os roteiros de navegador das STEP-06 a STEP-11 reproduzem as versões registradas nos respectivos commits. Para o pacote atual, use os roteiros da STEP-15-A/B/C, o benchmark D e os checks; os testes automatizados continuam cobrindo as funcionalidades acumuladas.

Os servidores escutam apenas no computador local e falham se a porta estiver ocupada. Encerre com Ctrl+C. O preview valida React e estilos; **localhost não executa APIs de extensão**. O diagnóstico nesse endereço informa que precisa ser aberto pela extensão instalada.

## Componentes implementados

| Local                    | Responsabilidade                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| manifest.json            | MV3, permissões, CSP e entradas do pacote.                                                            |
| src/extension/background | Coordenador, remetentes, roteador e criação idempotente do offscreen.                                 |
| src/extension/offscreen  | Seleção de motor, adaptador nativo e Worker; comunicação por chrome.runtime.                          |
| src/extension/ai         | Chrome/WebLLM/Gemma, ciclo de vida, prompts, streaming, avisos, orçamento e simulador.                |
| src/extension/content    | Botão, menu/prévia React com Shadow DOM, sessão em memória e clientes de comunicação.                 |
| src/integration/whatsapp | Seletores, detecção, leitura de blocos, revisão e substituição nativa do editor.                      |
| src/extension/diagnostic | Página de comunicação simulada acessível pelo link no popup/painel.                                   |
| src/shared               | Contratos, validação dos payloads/remetentes e fixture sintética.                                     |
| src/development          | Página React auxiliar da STEP-02, preservada.                                                         |
| tests                    | Contratos, remetentes, roteamento, cancelamento, recuperação, simulador, pacote e fixtures do editor. |

WebLLM 0.2.82 executa a prova sintética, as nove ações e a revisão semântica opcional na mesma instância do perfil selecionado. A versão foi fixada devido à falha de GPU observada com 0.2.85; as bibliotecas WASM locais são compatíveis com o catálogo `v0_2_80`. Popup, painel lateral e menu do editor compartilham as preferências da STEP-14.

## Detecção e revisão do editor

O adaptador procura um único textbox contenteditable visível no footer de #main. Recusa campos de busca, diálogo, ocultos, desativados, somente leitura e seleções ambíguas. Os seletores ficam centralizados e não dependem de classes ofuscadas, idioma ou placeholder. Uma mudança estrutural do WhatsApp pode exigir atualização do adaptador; na ausência de um editor reconhecido, o botão desaparece.

MutationObserver acompanha o campo editável, a estrutura direta do compositor e o título da conversa, além dos filhos diretos dos ancestrais. Mudanças transitórias nos demais controles do rodapé ou no status do grupo não invalidam o rascunho. Não observa profundamente body nem o histórico. Uma descoberta estrutural a cada segundo cobre contêineres novos e mudanças externas de CSS; atualizações são agrupadas por frame. O host da extensão é ignorado e o Shadow DOM isola os estilos. ResizeObserver e eventos de scroll/resize atualizam a posição; os listeners, observadores e timers são encerrados ao sair da página. O retorno pelo cache de navegação remonta a integração.

Capturas têm UUIDs aleatórios e revisão, sem identidade de contato. Edição, composição IME, substituição do campo e mudanças no título invalidam a revisão, inclusive quando o texto permanece igual. Não se lê o conteúdo do cabeçalho. A conferência drena mutações pendentes antes de decidir se ela ainda é atual. Cliques sintéticos disparados pela página são ignorados.

Copiar e Substituir conferem novamente o texto, documento, editor e revisão capturados. A substituição aguarda a restauração de foco/seleção do editor controlado, limita a seleção ao campo e usa execCommand('insertText') exclusivamente no adaptador. O resultado é conferido antes e depois da reconciliação da página. Uma inserção incorreta pode ser desfeita sincronamente pela própria transação; não há segunda tentativa automática nem rollback tardio que possa apagar uma edição posterior. Uma falha não confirmada orienta a conferir o rascunho. A API é obsoleta e o suporte foi validado no Chrome indicado no relatório, sem garantia para versões futuras.

## Sugestões com avisos — STEP-15-A

O modelo recebe o rascunho original e gera uma vez. Toda resposta final legível aparece com aviso geral e possíveis mudanças de nomes, valores, datas, emojis, negação e intenção. Riscos não bloqueiam **Copiar** ou **Substituir mesmo assim**, sem confirmação adicional. Resultado idêntico aparece como **Sem alterações**; falhas técnicas, cancelamento, desconexão ou rascunho alterado continuam impedindo aplicação.

Nas preferências, **Mostrar botão Analisar sentido na prévia** habilita uma análise local adicional somente quando você clicar nela. O botão não reescreve a sugestão; retorna avisos e pode falhar. Nenhum risco detectado não garante equivalência de sentido. A extensão continua sem enviar mensagens.

O pacote atual inclui [STEP-15-B](docs/steps/STEP-15-B.md): **Chrome preferencial** e escolha manual de WebLLM, com modelo local preservado como alternativa. A seleção consulta ação e pt-BR no documento offscreen; Chrome só é escolhido se estiver disponível e sua sessão puder ser criada sem download. Uma falha após começar a geração encerra o pedido, sem repetição ou troca de motor.

No painel lateral, **Verificar IA do Chrome** mostra disponibilidade por ação no painel e no contexto de inferência. **Preparar** chama a API diretamente no clique visível e acompanha o download. Corrigir usa Proofreader; Formal/Amigável/Conciso/Melhorar/Reescrever usam Rewriter; Profissional/Natural/Engraçado e análise explícita usam Prompt. O Chrome administra CPU/GPU e seus próprios artefatos; liberar sessões não remove esses modelos.

Para usar o contorno de idioma validado no Chrome instalado 154.0.8037.92, ative **Português por prompt no Chrome (experimental)** nas preferências, depois **Verificar IA do Chrome → Preparar Corrigir** no painel lateral. Nesse modo, as nove ações e a revisão usam Prompt sem declarações de idioma, com instrução explícita de português do Brasil. A prévia identifica o caminho experimental; revise os textos e avisos. Essa opção fica desligada por padrão. Se o navegador estiver indisponível, a alternativa local continua sendo escolhida antes de gerar.

As tipagens `@types/dom-chromium-ai` **0.0.17** estão fixadas. Português declarado nas opções segue indisponível no Chrome testado, mas 12 fixtures e o fluxo nativo/offscreen offline passaram pelo modo por prompt. STEP-15-B **Concluída**, conforme [evidências e limitações](docs/VALIDACAO-STEP-15-B.md). [Gemma/STEP-15-C](docs/VALIDACAO-STEP-15-C.md) concluída; [STEP-15-D](docs/VALIDACAO-STEP-15-D.md) concluída, com campanhas reservadas e revisão independente de qualidade/desempenho. Casos históricos pendentes cobertos em novas campanhas, preservando os arquivos antigos. STEP-16 ainda não iniciada.

Reproduza o fluxo em perfil isolado com `STEP15B_REGULAR_CHROME` apontando para Chrome instalado, `STEP15B_PORTUGUESE_PROMPT=1` e `npm.cmd run test:step15b:browser`. Para a alternativa, use `STEP15B_CHROME`/CfT sem essas duas variáveis. O roteiro usa fixtures sintéticas, painel real e inferência offline; não acessa conversas nem envia mensagens. Os [controles especializados](tests/browser/step15b-specialized.mjs) usam inglês e flags somente no perfil de teste; não alegam pt-BR dessas APIs.

## Comparação de IA — STEP-15-D

Na RTX 4060 Laptop testada, Chrome Prompt experimental foi o mais rápido para Corrigir, Melhorar e Reescrever. Gemma foi a recomendação local geral, com menos mudanças de conteúdo e ganhos de utilidade em Formal, Natural e Conciso, à custa de maior latência. Os três tons Profissional, Amigável e Engraçado continuam com resultados fracos; o nome Qualidade do perfil Qwen 8B não comprova superioridade. Veja a [comparação por ação, métricas e limites](docs/VALIDACAO-STEP-15-D.md) antes de escolher.

O WebLLM recebe o texto original delimitado como string JSON, com orçamento para a mensagem completa. A delimitação reduziu alguns problemas no piloto, mas continua permitindo aspas externas e execução de instruções citadas. Chrome e Gemma mantêm os prompts anteriores. Toda resposta exige revisão; os avisos também podem ser indevidos ou deixar de apontar uma mudança.

As campanhas possuem [procedimento reproduzível](docs/benchmark/STEP-15-D.md) e [evidências sintéticas](docs/benchmark/step15d/README.md). A escolha de motor/modelo e os padrões atuais permanecem manuais/configuráveis; português por prompt no Chrome continua experimental e desligado por padrão.

Para seguir a recomendação local nesta GPU, selecione **Gemma 4 E2B** em **Modelo local e alternativa** e prepare o modelo pelo fluxo explícito de download. O perfil WebLLM anterior permanece preservado para uma futura troca manual.

## Protocolo e ciclo de vida

O diagnóstico solicita ao coordenador um teste em uma aba permitida. O coordenador encaminha a fixture ao content script; este prepara o documento offscreen e abre um canal direto com ele. A resposta faz o caminho Worker → offscreen → content script. Só então o content script devolve o relatório ao diagnóstico. A página não pode substituir o texto sintético por dados arbitrários.

Uniões discriminadas e validação em tempo de execução cobrem start, cancel, status, progress, fragmentos de ação, result, cancelled, error e rejected. `simular`, as nove ações, `prova-modelo` e `revisar-sentido` seguem caminhos distintos; só as ações usam o rascunho com o modelo real. O modo é vinculado ao pedido, a cada trecho e à resposta, evitando aplicar uma saída de outro modo. A revisão de sentido usa um pedido explícito separado, vinculado ao original e à sugestão da prévia. A preferência antiga nunca inicia uma segunda geração automática. Payloads têm campos fechados, IDs limitados e texto de até 8.000 unidades UTF-16. O tokenizer compatível com o modelo inclui template, instruções e reserva de saída no limite de 4.096 tokens; excedê-lo gera aviso sem truncar o rascunho.

Cada pedido carrega requestId, editorId, snapshotId e revisão. O roteador no offscreen acrescenta aba, frame, documento e conexão com base no remetente do Chrome. O diagnóstico usa identidades fictícias; a prévia usa o snapshot real solicitado explicitamente. Respostas só são aceitas quando todos os campos do vínculo conferem. O cliente da prévia também fixa o vínculo recebido e descarta eventos divergentes ou posteriores ao cancelamento.

Há um pedido ativo por vez, inclusive durante a preparação do motor. Pedidos concorrentes recebem **IA ocupada**, sem fila. Cancelar envia o comando ao Worker e espera a confirmação; se não houver resposta, a desconexão após dois segundos encerra o Worker. Fragmentos e resultados tardios são descartados. A espera de prontidão é limitada a cinco segundos; a simulação dura no máximo quinze segundos e as ações reais podem levar até uma hora para download/inferência, sem replay. O Worker e seus recursos de GPU são encerrados após cinco minutos contados a partir do término da última operação; pedidos ativos suspendem esse temporizador. O encerramento não remove artefatos.

A criação do offscreen é compartilhada entre chamadas concorrentes. runtime.getContexts verifica o documento existente e WORKERS justifica sua criação. O coordenador confirma a prontidão do documento; o roteador local espera a prontidão do Worker antes de encaminhar texto. O Service Worker pode encerrar por inatividade durante a geração: ele não hospeda mais o pedido nem sua porta. Não há reconexão periódica, keepalive artificial ou replay. Perder a aba, o canal direto ou o contexto da IA encerra o pedido; uma nova ação explícita pode reutilizar o documento sobrevivente. A [validação da correção](docs/VALIDACAO-STEP-12.md#correção-da-conexão-durante-inferência--30092026) registra o encerramento natural do coordenador durante duas gerações reais.

## Permissões e privacidade

- offscreen hospeda os Workers locais e o adaptador nativo; Chrome Storage local guarda somente `writingPreferences` v5 com os campos descritos acima, revisão desligada e WebLLM Econômico como alternativa por padrão.
- Content script restrito a https://web.whatsapp.com/*. A permissão desse host permite listar/verificar apenas suas abas no diagnóstico, sem conceder `tabs` global. O Worker usa permissões adicionais somente para dados fixos do modelo em `huggingface.co` e `us.aws.cdn.hf.co`.
- Não há activeTab, scripting, <all_urls>, externally_connectable, APIs internas do WhatsApp, interceptação de tráfego ou ponte com scripts da página.
- CSP permite scripts/workers locais e WASM empacotado, sem código remoto. `connect-src` aceita o próprio pacote e os dois hosts de dados acima.
- Não há armazenamento de textos, logs de conteúdo ou persistência de pedidos. Cache API guarda somente artefatos do modelo e seus recibos de integridade; Chrome Storage guarda apenas a preferência versionada de revisão e perfil. O relatório sintético permanece em memória até a página fechar.
- O rascunho só é lido ao solicitar a prévia e conferir uma ação explícita de cópia/substituição (inclusive ativação por teclado). Detecção, observadores e consulta de revisão não leem o texto. A captura e a resposta permanecem em memória até serem descartadas, sem leitura de histórico/contatos. A extensão só altera o rascunho após Substituir e nunca o envia.
- Copiar usa a área de transferência do sistema por escolha explícita. Não há leitura dela pelo produto nem nova permissão de extensão. O sistema operacional e outros aplicativos podem acessar o texto copiado conforme suas próprias configurações.

## Build e verificações

A STEP-15 acrescenta [108 casos sintéticos anotados e execução reproduzível](docs/benchmark/README.md), métricas por modelo e revisão independente. O [relatório histórico](docs/VALIDACAO-STEP-15.md) preserva recusas e limitações do pipeline anterior. A STEP-15-A apresenta respostas legíveis e riscos como avisos; nenhuma verificação certifica equivalência semântica geral. O produto não persiste textos; somente os harnesses gravam fixtures sintéticas e seus resultados.

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
| WebLLM                          | 0.2.82                         |
| Transformers.js                 | 4.2.0                          |
| ONNX Runtime Web                | 1.26.0-dev.20260416-b7804b056c |
| @mlc-ai/web-tokenizers          | 0.1.6                          |
| @webgpu/types (somente tipos)   | 0.1.69                         |
| playwright-core (prova Chrome)  | 1.55.0                         |

Versões diretas são exatas e transitivas ficam em package-lock.json. Use npm ci, sem --force ou --legacy-peer-deps. TypeScript 6.0.3 foi mantido porque typescript-eslint 8.70.1 requer versão menor que 6.1.0. jsdom 29.1.1 aceita Node 22.13+, enquanto a linha 30 consultada exige Node 22.22.2+; o ambiente permanece em 22.14.0. Tipos do Chrome não substituem a conferência da versão mínima de cada API.

Consulte [português por prompt, localstudio e cache](docs/REFERENCIAS-IA-CHROME.md). O contorno sem declarações foi validado no Chrome instalado e incorporado como opção experimental. `GpuBlocked` observado no CfT corresponde à classificação padrão dessa build; não impediu o Chrome instalado no mesmo hardware. O fluxo WebLLM offline também passou. A STEP-15 principal continua **Aguardando validação** do benchmark e subetapas restantes.

## Referências técnicas

- [Chrome Offscreen: WORKERS, documento único e runtime](https://developer.chrome.com/docs/extensions/reference/api/offscreen).
- [Mensagens e conexões](https://developer.chrome.com/docs/extensions/develop/concepts/messaging). Listeners usam return true com sendResponse, compatível com Chrome 116, sem exigir suporte recente a retorno de Promise.
- [Chrome Tabs e permissões de host](https://developer.chrome.com/docs/extensions/reference/api/tabs).
- [Ciclo de vida do Service Worker](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle).
- [CSP de extensões](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy).
- [Content scripts e isolamento](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts).
- [MDN: execCommand, limitações e histórico de edição](https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand).
- [jsdom e versões do Node](https://github.com/jsdom/jsdom/releases).
- [WebLLM 0.2.82](https://github.com/mlc-ai/web-llm/releases/tag/v0.2.82), [catálogo da versão](https://github.com/mlc-ai/web-llm/blob/v0.2.82/src/config.ts), [falha de GPU das versões posteriores](https://github.com/mlc-ai/web-llm/issues/844), [licença Llama 3.2](https://dev.meta.ai/llama/llama3_2/license) e [licenças incluídas](licenses/LLAMA-3.2-LICENSE).
- [Vite: build](https://vite.dev/guide/build.html), [Vitest](https://vitest.dev/guide/), [ESLint](https://eslint.org/docs/latest/use/getting-started) e [compatibilidade do typescript-eslint](https://typescript-eslint.io/users/dependency-versions/).

## Entrega por etapa

Cada etapa entrega seu escopo completo, com verificações e commit próprio após a validação. Usar Conventional Commits e a identidade humana já configurada no Git. Ver [AGENTS.md](AGENTS.md) e o estado atual em [PROGRESSO.md](docs/PROGRESSO.md). Não iniciar automaticamente a próxima etapa.
