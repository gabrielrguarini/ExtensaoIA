# Plano de execução — Extensão de IA local para WhatsApp Web

Plano aprovado em 24/09/2026. Este documento e os arquivos de etapas são a especificação de execução; não representam funcionalidades já implementadas.

## Como começar ou retomar

1. Leia este documento e [PROGRESSO.md](PROGRESSO.md).
2. Abra somente o arquivo da etapa solicitada no índice abaixo.
3. Confirme que as etapas anteriores estão concluídas e que suas evidências continuam aplicáveis.
4. Execute as tarefas e os critérios de conclusão daquela etapa.
5. Atualize o progresso com evidências reais e encerre a execução, sem iniciar a etapa seguinte.

A próxima etapa executável é indicada exclusivamente no registro de progresso. Os arquivos STEP descrevem o trabalho; não são registros independentes de status.

Comando de continuidade: **Execute somente a STEP-XX do plano.**

> Execute somente a etapa indicada. Leia o plano geral e o registro de progresso, confirme os pré-requisitos e implemente integralmente a entrega prevista. Execute as verificações pertinentes e registre os resultados. Não avance para a próxima etapa. Se houver impedimento, registre a causa e o que falta; não marque como concluído algo que não foi validado.

Se uma solicitação apenas mandar continuar o plano, executar a próxima etapa pendente cujos pré-requisitos estejam concluídos e parar ao final dela. Mudanças explícitas de escopo feitas pelo usuário devem ser incorporadas à documentação antes de executar o novo escopo.

## Entregas funcionais, commits e contato de teste

Decisão adicional confirmada pelo usuário: manter as etapas atuais e entregar o escopo acumulado de cada uma completo e funcionando. A STEP-01 é documental, a STEP-02 precisa executar sua página de base e a partir da STEP-03 a extensão deve poder ser instalada e validada no escopo vigente. Não confundir etapas de simulação previstas com IA real.

Cada etapa concluída deve ser registrada em um commit próprio depois das verificações. Quando houver código, executar npm run check e comprovar o comportamento real exigido. Incluir os arquivos necessários e o lockfile, revisar o diff, preservar trabalho alheio e informar o hash na entrega. Sem validação ou commit, a etapa não está encerrada. Não realizar push ou publicação automaticamente.

O contato exclusivo para eventuais testes necessários de mensagens é **@gabrielrguarini**. Priorizar fixtures e rascunhos; se for necessário envio manual, usar texto sintético claramente marcado como teste, depois de verificar a identidade da conversa. Não adivinhar contato, usar outras conversas ou expor dados reais. Essa autorização de teste não permite envio automático pela extensão.

As regras duráveis estão em [AGENTS.md](../AGENTS.md).

## Objetivo

Construir uma extensão Chrome instalável localmente que corrija e reescreva o rascunho do WhatsApp Web usando IA local, nativa do Chrome quando idioma/ação forem suportados, com alternativas WebGPU. A interface será em português brasileiro e a sugestão aparecerá **junto ao campo de mensagem**.

Fluxo: escrever → clicar em IA → escolher uma ação → processar localmente → visualizar a sugestão → confirmar → substituir o rascunho.

A extensão nunca envia a mensagem. Substituir e Copiar são ações explícitas. O campo original deve permanecer intacto em cancelamento, incompatibilidade, erro de inferência ou falha técnica da sugestão. Riscos de conteúdo são avisos.

## Decisões de produto

- Priorizar computadores comuns; na STEP-15-B adotar Chrome preferencial, preservando o perfil local atual como alternativa.
- Oferecer Corrigir, Melhorar, Formal, Profissional, Amigável, Natural, Conciso, Engraçado e Reescrever.
- Tradução, expansão e publicação na loja ficam fora desta versão. Aceitar CPU administrada pelo Chrome; runtimes próprios seguem WebGPU.
- Manter avaliação determinística de riscos sempre ligada. Análise semântica adicional somente sob ação explícita na prévia, desligada por padrão.
- Preservar gírias e emojis existentes por padrão. A escolha explícita de formalização permite adaptar gírias sem alterar o significado.
- Antecipar preview, cache básico e testes para acompanhar o MVP.
- Manter o preview no editor mesmo depois de adicionar popup e painel lateral para configurações.
- Não estabelecer uma promessa universal de desempenho ou equivalência semântica. Medir qualidade em um conjunto conhecido e exigir revisão/confirmação do usuário.

## Privacidade, segurança e limites de integração

- Nenhum rascunho, prompt, resposta ou conteúdo da conversa pode sair pela rede por ação da extensão.
- Não coletar histórico, contatos, números de telefone ou mensagens recebidas. Ler apenas o rascunho solicitado.
- Não persistir textos do usuário nem registrá-los em logs; também não persistir hashes ou identificadores derivados deles.
- Não incluir analytics, telemetria de conteúdo, serviços externos de IA ou diagnóstico que capture mensagens.
- A privacidade local é obrigatória; a interface não oferecerá um modo de processamento remoto.
- Utilizar Chrome Storage somente para preferências; cache persistente destina-se aos artefatos dos modelos.
- Tratar todo texto original e gerado como dado não confiável. Renderizar como texto, sem innerHTML, eval, execução de HTML ou código dinâmico.
- Não modificar APIs internas do WhatsApp, acessar seu banco de dados, interceptar tráfego ou contornar mecanismos de segurança.
- Manter permissões restritas ao necessário. Não usar permissões globais ou URLs arbitrárias de modelos.
- Vincular resultados à solicitação, origem, editor e revisão do rascunho. Uma sugestão antiga não pode sobrescrever novo texto nem migrar para outra conversa.
- Ao perder contexto ou conexão, encerrar o pedido; não repetir automaticamente uma geração sobre o rascunho.
- A promessa de uso offline se refere à inferência após preparação completa e cache íntegro, não à disponibilidade do WhatsApp sem rede.

## Stack e organização

Usar TypeScript strict, React, Vite, CSS, Manifest V3, npm, Vitest, ESLint e Prettier. Fixar as versões efetivamente utilizadas no lockfile e documentar os requisitos de Node.js. Não usar any sem justificativa nem dependências sem necessidade concreta.

Separar os módulos: extensão e seus contextos, adaptação ao WhatsApp, interface, comunicação, runtime de IA, catálogo de modelos, prompts, parsing, preservação, validação e armazenamento. Adaptar a estrutura física a esses limites sem antecipar componentes vazios.

A IA implementadora deve criar arquivos completos, sem marcadores como “resto do código”. Ao informar arquivos na resposta ao usuário, usar caminhos completos. Manter comentários somente quando acrescentarem contexto útil.

## Arquitetura

| Componente            | Responsabilidade                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------- |
| Content Script        | Detectar o editor e apresentar botão, menu e preview; capturar somente o rascunho solicitado. |
| Adaptador do WhatsApp | Isolar seletores, snapshot do editor, leitura, inserção e validação da edição.                |
| Service Worker        | Validar remetentes e mensagens, coordenar configurações e criar o contexto da IA.             |
| Documento offscreen   | Validar e rotear pedidos da aba e hospedar um Worker com finalidade WORKERS.                  |
| Worker de IA          | Executar WebLLM ou Transformers.js e manter uma única instância do modelo local selecionado.  |
| Núcleo de reescrita   | Produzir prompts com texto original e comparar entidades/risco após a geração.                |
| Armazenamento         | Guardar preferências e artefatos dos modelos; mensagens ficam somente em memória temporária.  |

O offscreen comunica-se com a extensão por chrome.runtime; acesso a preferências passa pelo coordenador. O pedido e a resposta usam uma porta direta entre content script e offscreen, com origem validada pelo remetente do Chrome. O encerramento do Service Worker por inatividade não perde esse contexto; perder a aba, a porta ou a IA continua encerrando o pedido sem replay. Essa correção do escopo acumulado da STEP-12 está registrada no [relatório](VALIDACAO-STEP-12.md#correção-da-conexão-durante-inferência--30092026). O Worker deve usar a interface própria AIEngine, deixando APIs WebLLM/Transformers.js restritas aos adaptadores.

Na STEP-15-B, o offscreen também hospeda o adaptador Chrome. Seleção e inicialização precedem a geração: confirmar configuração, ação e estado disponível nesse documento; preparar downloads apenas no painel visível. Runtimes próprios permanecem no Worker. Preferências v4 guardam `engine`, `profile` (modelo local/alternativa) e `chromePortuguesePrompt` (compatibilidade experimental manual, desligada por padrão). Consultas da interface verificam inventário do cache; integridade integral permanece no carregamento.

Na STEP-15-C, preferências v5 separam `engine: chrome-preferred | local`, `localModel: webllm | gemma` e o `profile` WebLLM preservado. A escolha manual v4 migra para `local`/`webllm`; os demais padrões permanecem. Gemma 4 E2B usa Transformers.js 4.2.0 em Worker próprio, `Gemma4ForCausalLM`, apenas tokenizer/embed_tokens/decoder ONNX e revisão fixa. Variante q4f16 com shader-f16, q4 sem esse recurso; ambas quantizam pesos em quatro bits. Contexto do produto de 4.096 tokens, sem raciocínio prolongado. Cache API canônica com tamanho/SHA-256 em fluxo no download e carregamento; executáveis ONNX locais, sem cache paralelo do runtime. [Detalhes e evidências C](VALIDACAO-STEP-15-C.md).

Processar uma solicitação por vez. Pedidos concorrentes recebem “IA ocupada”. Limpar estado de conversa entre solicitações, sem descarregar os pesos a cada chamada.

O ciclo de vida do Service Worker não garante memória permanente. Tratar reinícios, perda de GPU e encerramento do offscreen sem replay automático. Liberar a GPU após cinco minutos sem atividade.

Todo JavaScript e WebAssembly executável acompanha o pacote da extensão. Somente os dados e arquivos auxiliares não executáveis dos modelos podem ser baixados sob demanda, de origens explicitamente previstas. Registrar os redirecionamentos necessários e restringir permissões/CSP.

## Contratos internos a implementar

- **AIEngine:** initialize, isReady, generate retornando AsyncIterable de texto e unload. Opções locais incluem cancelamento, mapeado pelo adaptador para o runtime.
- **Comunicação:** mensagens tipadas para iniciar, cancelar, consultar estado, progresso, fragmentos, resultado e erro, com validação em tempo de execução.
- **Identidade do pedido:** requestId, origem confiável do remetente, documento/frame, snapshot e revisão do editor. Não confiar em aba ou destino arbitrário informado no payload.
- **Resultado:** texto, identidade do motor e avaliação de riscos; sugestão aplicável depois de completa, com avisos; falha, cancelamento, resultado obsoleto e resultado inválido devem ser estados distintos.
- **Verificação semântica:** resposta estruturada com valid, meaningPreserved e issues. Ambas as análises geram avisos; confidence, quando existente, não é probabilidade calibrada.
- **Configurações:** esquema versionado contendo somente preferências. Não adicionar API pública de rede ou endpoint de IA.

## Modelos e compatibilidade

| Perfil             | Modelo                | Variante principal                | Decisão                                                                                   |
| ------------------ | --------------------- | --------------------------------- | ----------------------------------------------------------------------------------------- |
| Econômico, inicial | Llama 3.2 3B Instruct | Llama-3.2-3B-Instruct-q4f16_1-MLC | Menor exigência entre os três; português oficialmente suportado; licença própria da Meta. |
| Equilibrado        | Qwen3 4B              | Qwen3-4B-q4f16_1-MLC              | Alternativa intermediária com licença Apache 2.0; qualidade pt-BR será medida.            |
| Qualidade          | Qwen3 8B              | Qwen3-8B-q4f16_1-MLC              | Candidato para equipamentos com mais recursos; licença Apache 2.0.                        |

As referências consultadas durante o planejamento indicavam aproximadamente 2.264 MB, 3.432 MB e 5.696 MB de memória de GPU para essas variantes. São estimativas do catálogo, não tamanho de download, memória livre disponível ou garantia de execução.

Revalidar o catálogo da versão publicada escolhida antes da implementação. Uma entrada no ramo main não garante que todo pacote já publicado a suporte. Fixar runtime, modelo, variante, revisão dos pesos e biblioteca WASM compatíveis; manter as licenças e avisos exigidos.

Padrões:

- Contexto inicial de 4.096 tokens, incluindo instruções, template, entrada e orçamento da resposta.
- Quantização de 4 bits; variante q4f32_1 quando faltarem recursos exigidos por q4f16_1, informando o consumo maior antes do download.
- Qwen3 sem modo de raciocínio prolongado, conforme API suportada pelo runtime fixado.
- Detecção real de WebGPU, adapter, features e limits. Não deduzir VRAM livre de RAM do sistema.
- Download por ação explícita na interface, exibindo tamanho conhecido e progresso.
- Sem WebGPU utilizável, informar indisponibilidade dos modelos próprios; Chrome pode administrar CPU. Não recorrer a serviços externos.
- Seleção de modelos desacoplada do código de negócio, com catálogo local e origens de artefatos controladas.

## Sugestões, preservação e avisos

Pipeline padrão: snapshot → extração de entidades → uma geração com texto original → comparação e avisos → prévia completa → Copiar/Substituir mesmo assim → nova verificação do snapshot → inserção manual.

Preservar o pipeline ENTITY_* somente para comparação histórica. Nomes, datas, horários, URLs, números, valores, emojis, negações e intenção são conferidos posteriormente. Possíveis alterações produzem avisos específicos, sem ocultar respostas legíveis. O aviso geral exige revisão; nenhum risco detectado não comprova equivalência semântica.

Uma geração por pedido, sem retry ou mudança de motor após falha. Saídas vazias, ilegíveis, tecnicamente inutilizáveis ou incompletas são erros. Saída idêntica aparece como sem alterações. Copiar e Substituir mesmo assim dispensam confirmação adicional; cancelamento, desconexão e rascunho desatualizado continuam impedindo aplicação. Nunca enviar mensagens.

A análise adicional de sentido é uma ação explícita na prévia, com a mesma infraestrutura de isolamento/cancelamento; retorna avisos e não reescreve a sugestão. Durante streaming/análise, cópia e substituição aguardam conclusão. A preferência opcional apenas mostra o botão de análise, sem disparar geração automática.

As intenções de preservação e as nove ações continuam definidas na [STEP-09](steps/STEP-09.md). Seus critérios históricos de bloqueio não descrevem o novo fluxo.

## Interface e preferências

Sugestões aparecem junto ao campo de mensagem, com Substituir (ou Substituir mesmo assim quando houver avisos), Copiar, análise de sentido opcional e Cancelar. Usar isolamento de estilos e controles acessíveis. Nunca simular envio da mensagem.

Padrões de configuração: pt-BR, tema do sistema, ação Corrigir, perfil Econômico, preservar gírias e emojis existentes, não adicionar emojis, revisão semântica desligada. A privacidade local é informativa e obrigatória.

A inserção nativa por Selection/Range e execCommand('insertText') ficará isolada no adaptador. Por ser uma API obsoleta, validar suporte, resultado e desfazer no Chrome alvo. Estruturas não preserváveis, como chips de menção, terão somente cópia.

Mensagens esperadas, contextualizadas conforme o erro real:

- “Preparando IA local...”, “Baixando modelo...”, “Carregando GPU...”, “IA pronta.”
- “Gerando...”, “Validando...”, “IA ocupada.”
- “A IA local precisa de suporte a WebGPU neste navegador/computador. Seu texto não foi enviado para nenhum servidor.”
- “Não foi possível processar o texto localmente. Seu texto original permanece intacto.”
- “Mensagem muito longa para o modelo selecionado.” Orientar a reduzir o texto ou escolher um contexto maior, somente quando essa opção existir.
- “O rascunho mudou. Gere uma nova sugestão.”

## Sequência de etapas

Cada etapa depende das anteriores. A conclusão de implementação sem validação obrigatória não permite marcar uma etapa como Concluída.

| Etapa                       | Entrega                                               |
| --------------------------- | ----------------------------------------------------- |
| [STEP-01](steps/STEP-01.md) | Organizar o plano e o acompanhamento                  |
| [STEP-02](steps/STEP-02.md) | Criar a base do projeto                               |
| [STEP-03](steps/STEP-03.md) | Implementar Manifest V3 e comunicação                 |
| [STEP-04](steps/STEP-04.md) | Detectar o editor do WhatsApp                         |
| [STEP-05](steps/STEP-05.md) | Criar preview e substituição manual                   |
| [STEP-06](steps/STEP-06.md) | Executar o primeiro modelo local                      |
| [STEP-07](steps/STEP-07.md) | Implementar a ação Corrigir                           |
| [STEP-08](steps/STEP-08.md) | Proteger entidades e validar o resultado              |
| [STEP-09](steps/STEP-09.md) | Adicionar os demais modos                             |
| [STEP-10](steps/STEP-10.md) | Exibir geração progressiva e cancelamento             |
| [STEP-11](steps/STEP-11.md) | Implementar verificação semântica opcional            |
| [STEP-12](steps/STEP-12.md) | Adicionar modelos e perfis de hardware                |
| [STEP-13](steps/STEP-13.md) | Consolidar cache, recuperação e desempenho            |
| [STEP-14](steps/STEP-14.md) | Finalizar configurações e interfaces auxiliares       |
| [STEP-15](steps/STEP-15.md) | Executar STEP-15-A → B → C → D antes da entrega final |
| [STEP-16](steps/STEP-16.md) | Validar e preparar a entrega instalável               |

Marco de MVP: concluir até STEP-08. Depois, adicionar modos e streaming, revisão opcional, perfis/cache, configurações, benchmark e entrega final.

## Testes e critérios gerais de aceitação

Adicionar testes junto da funcionalidade correspondente. Usar fixtures sintéticas e um motor simulado quando apropriado; distinguir isso da execução real em WebGPU.

- Testar parsing, entidades, restauração, colisões, URLs, números, datas, negações, prompts, orçamento de tokens e verificação semântica.
- Cobrir integração entre componentes, validação de remetentes, isolamento de abas, cancelamento e mensagens atrasadas.
- Verificar editor alterado ou recriado, troca de conversa com textos iguais, Unicode, multilinha, menções estruturadas e desfazer.
- Verificar download interrompido, cache incompleto, falta de WebGPU, falta de memória, perda de GPU, reinícios e inferência offline após reiniciar o navegador.
- Criar benchmark com pelo menos 100 casos sintéticos, medir todas as saídas e rejeições e revisar além do julgamento do próprio modelo.
- Avaliar mudanças de entidades, fatos e intenção separadamente da disponibilidade de sugestão; medir avisos corretos, indevidos e riscos não sinalizados.
- Auditar requisições originadas pela extensão, logs e armazenamento em ambiente de teste; não adicionar interceptação de tráfego ao produto.
- Gerar e testar pasta instalável por “Carregar sem compactação”, sem servidor de desenvolvimento.

As STEP-06, STEP-08 e STEP-16 exigem evidência real do fluxo pertinente. Testes simulados não substituem GPU/Chrome/WhatsApp quando o critério exigir esses ambientes. Caso indisponíveis, registrar Aguardando validação e o procedimento restante.

## Relato obrigatório ao concluir uma execução

1. O que foi entregue.
2. Arquivos criados ou alterados.
3. Verificações executadas, resultados e pendências.
4. Como conferir a entrega.
5. Hash do commit que registra a etapa e eventuais mudanças fora dele.
6. Próxima etapa, sem iniciá-la.

Atualizar PROGRESSO.md sem armazenar conteúdo de mensagens reais. Não marcar uma etapa como concluída com evidência ausente. Não iniciar automaticamente a etapa seguinte.

## Referências técnicas

Referências usadas no planejamento aprovado; revalidar APIs e compatibilidade na etapa que introduzir a dependência.

- [Chrome Offscreen](https://developer.chrome.com/docs/extensions/reference/api/offscreen)
- [Ciclo de vida do Service Worker](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- [CSP de extensões](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy)
- [Código hospedado remotamente no Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code)
- [Chrome Side Panel](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
- [WebLLM: workers, extensões e cache](https://webllm.mlc.ai/docs/user/advanced_usage.html)
- [Catálogo WebLLM — ramo main, conferir versão publicada](https://github.com/mlc-ai/web-llm/blob/main/src/config.ts)
- [Llama 3.2 3B Instruct](https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct)
- [Qwen3 4B](https://huggingface.co/Qwen/Qwen3-4B)
- [Qwen3 8B](https://huggingface.co/Qwen/Qwen3-8B)
- [Document.execCommand](https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand)

## Integração nativa e comparação aprovadas em 01/10/2026

Consultar [subetapas STEP-15](steps/STEP-15.md). O [localstudio no commit 6512a521](https://github.com/ErickWendel/localstudio/tree/6512a521947077977d1d14df58f656e13675c227/apps/editor/src/services) prefere Chrome e oferece Gemma via Transformers.js, mas seu serviço nativo cria/destrói sessão por geração. Nossa infraestrutura mantém pesos, streaming, cancelamento e pedidos isolados. Preservá-la; superioridade de velocidade/qualidade dependerá de benchmark na mesma máquina.

Adotar obrigatoriamente na STEP-15-B [@types/dom-chromium-ai 0.0.17](https://registry.npmjs.org/@types%2fdom-chromium-ai/0.0.17) como dependência de desenvolvimento e types explícitos. [Writing Assistance APIs dd37ddd2b85972def88bc5bd0779c0968ec549bf](https://github.com/webmachinelearning/writing-assistance-apis/tree/dd37ddd2b85972def88bc5bd0779c0968ec549bf) fundamenta o Rewriter; Writer/Summarizer fora do escopo. Prompt/Proofreader seguem documentação própria e testes Chrome reais; existência de tipos/proposta não comprova suporte a pt-BR.

As [referências de português, localstudio e cache](REFERENCIAS-IA-CHROME.md) registram a estratégia sem declarações de idioma, com idioma solicitado no prompt. B confirmou pt-BR real no Chrome instalado e incorporou a opção experimental manual; a Prompt API pede português do Brasil explicitamente. O caminho declarado e a capacidade empírica são verificações distintas. A comparação de utilidade/latência permanece na D; o guia de cache orienta os modelos próprios em C/D, sem copiar ou gerenciar pesos nativos.

Prompt: sessão-base sem rascunhos, clone/destroy por pedido. Rewriter: instância sem histórico reutilizada apenas com configuração igual de criação. Proofreader: adaptar correctedInput sem assumir clone ou streaming. Preparação/download explícitos em painel visível com gesto; confirmar disponibilidade e gerar no offscreen. Cancelamento por AbortSignal, destroy e liberação após cinco minutos. Consultar quotas quando implementadas, sem inventar tokens. Só implementação local, sem provedores/polyfills remotos.

Gemma 4 E2B ONNX/q4 e Transformers.js 4.2.0 entram na STEP-15-C, executáveis locais e cache controlado. [Cartão oficial Gemma](https://huggingface.co/google/gemma-4-E2B-it): aproximadamente 2,3 bilhões de parâmetros efetivos e 5,1 bilhões incluindo embeddings; o nome não prova menor memória que Llama3B.

Benchmark D preserva 108 pares históricos e adiciona 108 rascunhos distintos reservados (12 por ação), anotados antes da avaliação, blocos de 12/checkpoints, três rodadas quentes, preparação/cache/primeiro trecho/resultado com mediana/p95. Tokens/s somente reais. Comparar disponibilidade, utilidade, preservação, alterações e precisão dos avisos. Sem meta percentual arbitrária; recomendar ganho de qualidade sem piora de latência ou ganho de velocidade sem perda de utilidade, explicitando trocas. Interrupções continuam pendências.
