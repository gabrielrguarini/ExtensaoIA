# Plano de execução — Extensão de IA local para WhatsApp Web

Plano aprovado em 24/09/2026. Este documento e os arquivos de etapas são a especificação de execução; não representam funcionalidades já implementadas.

## Navegação

Os documentos STEP registram o escopo e os critérios de cada etapa; o status e as evidências ficam em [PROGRESSO.md](PROGRESSO.md). Instruções operacionais do repositório ficam em [AGENTS.md](../AGENTS.md) e no [guia de desenvolvimento](DESENVOLVIMENTO.md).

## Entregas funcionais, commits e contato de teste

Decisão adicional confirmada pelo usuário: manter as etapas atuais e entregar o escopo acumulado de cada uma completo e funcionando. A STEP-01 é documental, a STEP-02 precisa executar sua página de base e a partir da STEP-03 a extensão deve poder ser instalada e validada no escopo vigente. Não confundir etapas de simulação previstas com IA real.

Cada etapa concluída deve ser registrada em um commit próprio depois das verificações. Quando houver código, executar npm run check e comprovar o comportamento real exigido. Incluir os arquivos necessários e o lockfile, revisar o diff, preservar trabalho alheio e informar o hash na entrega. Sem validação ou commit, a etapa não está encerrada. Não realizar push ou publicação automaticamente.

O contato exclusivo para eventuais testes necessários de mensagens é **@gabrielrguarini**. Priorizar fixtures e rascunhos; se for necessário envio manual, usar texto sintético claramente marcado como teste, depois de verificar a identidade da conversa. Não adivinhar contato, usar outras conversas ou expor dados reais. Essa autorização de teste não permite envio automático pela extensão.

As regras duráveis estão em [AGENTS.md](../AGENTS.md).

## Objetivo

Construir uma extensão Chrome instalável localmente que corrija e reescreva o rascunho do WhatsApp Web usando IA local, nativa do Chrome quando idioma/ação forem suportados, com alternativas WebGPU. A interface será em português brasileiro e a sugestão aparecerá **junto ao campo de mensagem**.

Fluxo padrão: configurar na extensão → escrever → clicar em IA → tooltip de carregamento → substituir o rascunho. Corrigir é a ação inicial. A opção Revisar sugestão recupera a prévia com Copiar/Substituir.

A extensão nunca envia a mensagem. O clique em IA autoriza a substituição em streaming no modo direto; no modo Revisar sugestão, Copiar/Substituir exigem novo clique. O primeiro trecho substitui o conteúdo presente naquele instante; depois, os novos trechos são acrescentados ao final e preservam edições humanas. O original fica em memória para recuperação em falha/cancelamento, automática quando não houve edição após a primeira escrita e explícita caso contrário. Mudança de conversa/editor impede novas escritas ou restauração em outro contexto. O usuário continua decidindo o conteúdo e quando enviar.

## Streaming direto autorizado — STEP-16-A

A [STEP-16-A](steps/STEP-16-A.md), solicitada em 08/10/2026, retira a exigência de revisão por múltiplas linhas e aplica trechos diretamente no campo. Substitui a aplicação somente ao final e a invalidação por edição no modo direto da STEP-15-H. A chegada de um trecho pode deixar o cursor no final, conforme autorização do usuário. A prévia continua opcional e conserva suas guardas de rascunho; estruturas especiais permanecem protegidas. Streaming não amplia limites de contexto/saída dos modelos.

## Interface vigente — ajuste STEP-15-F

A [STEP-16-B](steps/STEP-16-B.md), solicitada em 08/10/2026, mostra **Tipo de IA → IA Nativa / Modelo** no início das configurações. O seletor Llama/Qwen/Gemma e seus controles aparecem somente em Modelo; IA Nativa mostra seu preparo. Preferências e alternativa automática antes da geração são preservadas. Substitui a escolha misturada e a seção recolhida descritas abaixo, sem alterar motores ou downloads explícitos.

A [STEP-15-F](steps/STEP-15-F.md) simplifica o produto antes da STEP-16: o botão IA executa diretamente a ação salva; preferências ficam apenas no popup/painel lateral. Português brasileiro e escolha de variante são automáticos. Nomes de frameworks, provas sintéticas, simulação e diagnóstico não aparecem na interface. A compatibilidade nativa por instrução passa a ser automática quando a configuração específica não está pronta, sempre antes da geração e sem download silencioso. Essa decisão substitui os controles manuais descritos nas etapas históricas.

## Correção vigente de idioma — STEP-15-G

A [STEP-15-G](steps/STEP-15-G.md) corrige o aviso relatado sobre saída sem idioma. O usuário autorizou a configuração en com resposta pt-BR por instrução, após verificação real. Preferir idioma real/API especializada quando prontos; a compatibilidade usa saída en e entrada textual sem declarar idioma. As opções são iguais na consulta/criação; se também recusadas, usar o modelo local selecionado antes da geração. Substitui a omissão de saída da compatibilidade B/F e a restrição anterior à declaração en, sem certificar suporte formal ao português. A situação da entrega final está em PROGRESSO.md.

## Decisões de produto

O ajuste vigente [STEP-15-H](steps/STEP-15-H.md) torna a substituição direta padrão e mantém a prévia como opção explícita nas configurações. Substitui os requisitos históricos de prévia/confirmação obrigatória, preservando guardas técnicas, cancelamento e undo.

- Priorizar computadores comuns; na STEP-15-B adotar Chrome preferencial, preservando o perfil local atual como alternativa.
- Oferecer Corrigir, Melhorar, Formal, Profissional, Amigável, Natural, Conciso, Engraçado e Reescrever.
- Tradução, expansão e publicação na loja ficam fora desta versão. Aceitar CPU administrada pelo Chrome; runtimes próprios seguem WebGPU.
- Não avaliar automaticamente alterações de conteúdo nem oferecer análise semântica na prévia (ajuste STEP-15-E). No modo direto, o clique autoriza substituir o rascunho; Revisar sugestão oferece Copiar/Substituir (ajuste STEP-15-H).
- Preservar gírias e emojis existentes por padrão. A escolha explícita de formalização permite adaptar gírias sem alterar o significado.
- Antecipar preview, cache básico e testes para acompanhar o MVP.
- Manter a prévia opcional no editor; popup e painel lateral concentram as configurações.
- Não estabelecer uma promessa universal de desempenho ou equivalência semântica. Medir qualidade em um conjunto conhecido; o usuário decide o conteúdo e quando enviar.

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
- Vincular resultados à solicitação, origem e editor/conversa. A prévia exige também a revisão do rascunho. No modo direto, a primeira escrita autoriza substituir digitação posterior ao clique; depois, acrescentar apenas os novos trechos sem reaplicar o resultado sobre edições humanas.
- Ao perder contexto ou conexão, encerrar o pedido; não repetir automaticamente uma geração sobre o rascunho.
- A promessa de uso offline se refere à inferência após preparação completa e cache íntegro, não à disponibilidade do WhatsApp sem rede.

## Stack e organização

Usar TypeScript strict, React, Vite, CSS, Manifest V3, npm, Vitest, ESLint e Prettier. Fixar as versões efetivamente utilizadas no lockfile e documentar os requisitos de Node.js. Não usar any sem justificativa nem dependências sem necessidade concreta.

Separar os módulos: extensão e seus contextos, adaptação ao WhatsApp, interface, comunicação, runtime de IA, catálogo de modelos, prompts, parsing, preservação, validação e armazenamento. Adaptar a estrutura física a esses limites sem antecipar componentes vazios.

A IA implementadora deve criar arquivos completos, sem marcadores como “resto do código”. Ao informar arquivos na resposta ao usuário, usar caminhos completos. Manter comentários somente quando acrescentarem contexto útil.

## Arquitetura

| Componente            | Responsabilidade                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------- |
| Content Script        | Detectar o editor e apresentar botão e sugestão; capturar somente o rascunho solicitado.     |
| Adaptador do WhatsApp | Isolar seletores, snapshot do editor, leitura, inserção e validação da edição.               |
| Service Worker        | Validar remetentes e mensagens, coordenar configurações e criar o contexto da IA.            |
| Documento offscreen   | Validar e rotear pedidos da aba e hospedar um Worker com finalidade WORKERS.                 |
| Worker de IA          | Executar WebLLM ou Transformers.js e manter uma única instância do modelo local selecionado. |
| Núcleo de reescrita   | Produzir prompts com texto original e conferir apenas a validade técnica da resposta.        |
| Armazenamento         | Guardar preferências e artefatos dos modelos; mensagens ficam somente em memória temporária. |

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
- **Resultado:** texto, identidade do motor e indicação de resposta idêntica; trechos aplicáveis em streaming no modo direto ou sugestão completa por escolha na prévia; falha, cancelamento, resultado obsoleto e resultado inválido são estados distintos.
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

A STEP-15-D compara a delimitação JSON do rascunho original no WebLLM e conserva os prompts anteriores de Chrome/Gemma conforme os pilotos. Contabilizar o envelope real na entrada sem inflar a reserva da saída. Esse formato não garante isolamento de comandos citados; novas otimizações após a avaliação reservada precisam de outro conjunto reservado. Recomendações dependem da ação/hardware e devem registrar a troca entre utilidade, preservação e latência.

## Aplicação e revisão opcional

Pipeline vigente: snapshot → uma geração com texto original → validade técnica → verificação do snapshot → substituir diretamente. No modo Revisar sugestão, a prévia completa aguarda Copiar/Substituir e nova verificação do snapshot. Cancelamento, edição e troca de conversa impedem aplicação; saída idêntica dispensa escrita.

A STEP-15-E remove a comparação automática de conteúdo e a análise semântica da interface. Não classificar qualidade, risco ou equivalência. O usuário revisa e decide se a sugestão atende ao pedido. Os prompts continuam orientados a preservar fatos, intenção, gírias e emojis; isso não certifica o resultado.

Uma geração por pedido, sem retry ou mudança de motor após falha. Saídas vazias, ilegíveis, tecnicamente inutilizáveis ou incompletas são erros. Saída idêntica aparece como sem alterações. Copiar e Substituir dispensam confirmação adicional. Cancelamento, desconexão e rascunho desatualizado continuam impedindo aplicação. Nunca enviar mensagens.

Preservar ENTITY_* e avaliações antigas somente para reprodução histórica do benchmark. As evidências A–D descrevem o produto anterior ao ajuste E; não reescrever seus resultados.

## Interface e preferências

Sugestões aparecem junto ao campo de mensagem, com Substituir, Copiar e Cancelar, sem avisos automáticos de conteúdo. Usar isolamento de estilos e controles acessíveis. Nunca simular envio da mensagem.

Padrões de configuração: pt-BR, tema do sistema, ação Corrigir, perfil Econômico, preservar gírias e emojis existentes, não adicionar emojis. Preferências v7 descartam os interruptores antigos de revisão semântica e compatibilidade de idioma e preservam as escolhas válidas. A privacidade local é informativa e obrigatória.

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

| Etapa                           | Entrega                                                          |
| ------------------------------- | ---------------------------------------------------------------- |
| [STEP-01](steps/STEP-01.md)     | Organizar o plano e o acompanhamento                             |
| [STEP-02](steps/STEP-02.md)     | Criar a base do projeto                                          |
| [STEP-03](steps/STEP-03.md)     | Implementar Manifest V3 e comunicação                            |
| [STEP-04](steps/STEP-04.md)     | Detectar o editor do WhatsApp                                    |
| [STEP-05](steps/STEP-05.md)     | Criar preview e substituição manual                              |
| [STEP-06](steps/STEP-06.md)     | Executar o primeiro modelo local                                 |
| [STEP-07](steps/STEP-07.md)     | Implementar a ação Corrigir                                      |
| [STEP-08](steps/STEP-08.md)     | Proteger entidades e validar o resultado                         |
| [STEP-09](steps/STEP-09.md)     | Adicionar os demais modos                                        |
| [STEP-10](steps/STEP-10.md)     | Exibir geração progressiva e cancelamento                        |
| [STEP-11](steps/STEP-11.md)     | Implementar verificação semântica opcional                       |
| [STEP-12](steps/STEP-12.md)     | Adicionar modelos e perfis de hardware                           |
| [STEP-13](steps/STEP-13.md)     | Consolidar cache, recuperação e desempenho                       |
| [STEP-14](steps/STEP-14.md)     | Finalizar configurações e interfaces auxiliares                  |
| [STEP-15](steps/STEP-15.md)     | Executar STEP-15-A → B → C → D → E antes da entrega final        |
| [STEP-15-E](steps/STEP-15-E.md) | Retirar avaliação de conteúdo e manter revisão manual            |
| [STEP-15-F](steps/STEP-15-F.md) | Simplificar interface e executar ação configurada                |
| [STEP-15-G](steps/STEP-15-G.md) | Corrigir idioma de saída na Prompt API                           |
| [STEP-15-H](steps/STEP-15-H.md) | Substituir diretamente com tooltip e prévia opcional             |
| [STEP-16](steps/STEP-16.md)     | Validar e preparar a entrega instalável                          |
| [STEP-16-A](steps/STEP-16-A.md) | Aplicar streaming diretamente e preservar edições recebidas      |
| [STEP-16-B](steps/STEP-16-B.md) | Separar IA Nativa/Modelo e seleção condicional nas configurações |

Marco de MVP: concluir até STEP-08. Depois, adicionar modos e streaming, revisão opcional, perfis/cache, configurações, benchmark e entrega final.

## Testes e critérios gerais de aceitação

Adicionar testes junto da funcionalidade correspondente. Usar fixtures sintéticas e um motor simulado quando apropriado; distinguir isso da execução real em WebGPU.

- Testar parsing técnico, prompts, orçamento de tokens e prévia sem avaliação de conteúdo. Testes de entidades/restauração/análise semântica permanecem para a comparação histórica do benchmark.
- Cobrir integração entre componentes, validação de remetentes, isolamento de abas, cancelamento e mensagens atrasadas.
- Verificar editor alterado ou recriado, troca de conversa com textos iguais, Unicode, multilinha, menções estruturadas e desfazer.
- Verificar download interrompido, cache incompleto, falta de WebGPU, falta de memória, perda de GPU, reinícios e inferência offline após reiniciar o navegador.
- Criar benchmark com pelo menos 100 casos sintéticos, medir todas as saídas e rejeições e revisar além do julgamento do próprio modelo.
- Avaliar no benchmark mudanças de entidades, fatos e intenção separadamente da disponibilidade de sugestão. As métricas de avisos A–D são históricas; o produto vigente não avalia riscos.
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
