# Validação da STEP-12

[Etapa](steps/STEP-12.md) · [Progresso](PROGRESSO.md)

## Artefatos fixados

Projeto/Manifest `0.11.0`, WebLLM `0.2.82` e `@mlc-ai/web-tokenizers` `0.1.6`, sem dependências novas. As seis entradas correspondem ao [catálogo publicado do runtime](https://github.com/mlc-ai/web-llm/blob/v0.2.82/src/config.ts), também conferido no pacote instalado. O catálogo usa bibliotecas `v0_2_80`; todas estão no pacote da extensão, com contexto de 4.096 tokens e prefill de 1.024. Não se usa o catálogo atual de `main` como substituto dessa versão.

Os dados são servidos por `https://huggingface.co/mlc-ai/<model_id>/resolve/<revisão>/`. A revisão é um commit fixo; não há campo para URL arbitrária. A tabela separa bytes de dados, contexto e a estimativa `vram_required_MB` do catálogo. GB na interface significa 1.000.000.000 bytes. As estimativas de GPU não representam memória livre nem garantia de carregamento.

| Perfil            | Modelo/variante                   | Revisão dos dados                          | Download completo em bytes | GPU estimada em MB | Contexto |
| ----------------- | --------------------------------- | ------------------------------------------ | -------------------------: | -----------------: | -------: |
| Econômico, padrão | Llama-3.2-3B-Instruct-q4f16_1-MLC | `1e80abf71e3d17cd564e2d2b63caa15cb226018e` |              1.816.632.516 |           2.263,69 |    4.096 |
| Econômico         | Llama-3.2-3B-Instruct-q4f32_1-MLC | `6083cfdaaf08d2dd4872d7f5b87fb0242aa7d75c` |              1.816.632.516 |           2.951,51 |    4.096 |
| Equilibrado       | Qwen3-4B-q4f16_1-MLC              | `a5c9fab855e3ccbdfed2e7e69683d75f30332161` |              2.274.525.373 |           3.431,59 |    4.096 |
| Equilibrado       | Qwen3-4B-q4f32_1-MLC              | `b7e4eb1ba80728187fb5df44055cc1a7c32310e0` |              2.274.525.372 |           4.327,71 |    4.096 |
| Qualidade         | Qwen3-8B-q4f16_1-MLC              | `b3d55c289eae58f77095f5b68c895eeea358ee09` |              4.619.346.526 |           5.695,78 |    4.096 |
| Qualidade         | Qwen3-8B-q4f32_1-MLC              | `34026572351006ba1865d11319309b151d9ccf16` |              4.619.346.526 |           6.852,55 |    4.096 |

Os tamanhos foram calculados a partir dos metadados oficiais de cada repositório (`/api/models/mlc-ai/<model_id>?blobs=true`), conferindo o SHA da revisão. A soma inclui `params_shard_*.bin`, `tensor-cache.json`, `tokenizer.json` e `mlc-chat-config.json`, os arquivos utilizados pelo WebLLM 0.2.82. Não inclui README, licença, arquivos de Git/LFS, tokenizers alternativos, cabeçalhos HTTP nem o WASM já instalado. Em cache parcial, o tráfego restante pode ser menor.

A constante antiga do Llama incluía também 54.528 bytes de `tokenizer_config.json`, que o carregador dessa versão não usa. Ela foi corrigida de 1.816.687.044 para 1.816.632.516 bytes; o registro histórico da STEP-06 descreve o cálculo usado naquela entrega.

Licenças: [Llama 3.2 Community License](../licenses/LLAMA-3.2-LICENSE), [Qwen3 Apache 2.0](../licenses/QWEN3-LICENSE) e [WebLLM Apache 2.0](../licenses/WEBLLM-LICENSE), copiadas para `dist/licenses`, com avisos em `NOTICE.txt`. Os modelos originais [Qwen3 4B](https://huggingface.co/Qwen/Qwen3-4B) e [Qwen3 8B](https://huggingface.co/Qwen/Qwen3-8B) publicam licença Apache 2.0. SHA-256 do arquivo Qwen incluído: `832dd9e00a68dd83b3c3fb9f5588dad7dcf337a0db50f7d9483f310cd292e92e`.

As bibliotecas vêm do [repositório oficial de binários MLC](https://github.com/mlc-ai/binary-mlc-llm-libs), em `web-llm-models/v0_2_80/<nome>-ctx4k_cs1k-webgpu.wasm`. Seus bytes ficam fixados no Git e nos testes de build:

| Nome do WASM, antes de `-ctx4k_cs1k-webgpu.wasm` |     Bytes | SHA-256                                                            |
| ------------------------------------------------ | --------: | ------------------------------------------------------------------ |
| Llama-3.2-3B-Instruct-q4f16_1                    | 6.131.270 | `34de0d60ab598c6a85ae882b48474f250193076f902057a21070bb2daae96d5b` |
| Llama-3.2-3B-Instruct-q4f32_1                    | 5.935.137 | `224e4cd5c235621684257aad3ebfdaf6e337d50f783614d1e7ed63e78d693ad6` |
| Qwen3-4B-q4f16_1                                 | 6.070.240 | `5ddf44e49b03e53e24fd29a45591850924346140452f60c29280190388571340` |
| Qwen3-4B-q4f32_1                                 | 5.929.497 | `6484148ff499c15433ab85e4d2c376aef453a6d797f48047e6bd6fd495a59e39` |
| Qwen3-8B-q4f16_1                                 | 6.079.574 | `fd0b332c81212e484ba56c15aac5af2548f14f849d3352039ad68d3c4663b6dd` |
| Qwen3-8B-q4f32_1                                 | 5.933.178 | `4705cca63950fca8a8bb50279ccc44a1233b41a75318ec87fd9395f46e77358f` |

## Procedimento reproduzível

1. Execute `npm.cmd run check`. Instale `dist` sem compactação no Chrome for Testing com WebGPU.
2. Defina `STEP12_CHROME` com o executável. Opcionalmente, defina `STEP12_PROFILE` com um perfil exclusivo de teste; o padrão é `.cache/step12-browser`. Preserve espaço para os dados dos perfis escolhidos.
3. Execute `npm.cmd run test:step12:browser -- economico`, depois `-- equilibrado` e `-- qualidade`. Cada execução recarrega a extensão, abre um compositor sintético sob `web.whatsapp.com`, seleciona o perfil por teclado e solicita **Testar IA local**. Quando faltam artefatos, confirma **Baixar e continuar**, após conferir variante e tamanho. Exige resposta sintética e uma prévia de Corrigir, sem blocos de raciocínio expostos ou erros de página.
4. Execute `npm.cmd run test:step12:switch` com o mesmo perfil já preparado. O roteiro usa duas abas sintéticas, espera um trecho real do streaming de Reescrever com Qualidade e troca para Econômico pela segunda aba. Exige cancelamento explícito, rascunho intacto, ausência de prévia antiga, destruição do Worker anterior e prova bem-sucedida com um único Worker novo.
5. Para conferir manualmente, abra IA, escolha um perfil, veja dados/limites/licença, solicite uma ação e confirme somente o download faltante. Fechar a confirmação não baixa os pesos. Após cache completo, a ação não pede novo download. Editar o rascunho durante a confirmação invalida a ação.

Os roteiros usam fixtures e textos sintéticos; não abrem conversa, não requerem login e não enviam mensagem. A integração com o WhatsApp real permanece registrada na STEP-09.

## Resultado observado em 30/09/2026

Windows, Node 22.14.0, npm 10.9.2 e Chrome for Testing 154, Chromium 1246. No mesmo equipamento das provas anteriores, o adaptador WebGPU oferece `shader-f16`, `maxStorageBufferBindingSize` de 2.147.483.644 bytes e `maxBufferSize` de 2.147.483.648 bytes. A interface apresenta esses limites e **VRAM livre: indisponível**. Não usa `navigator.deviceMemory` como VRAM.

| Modelo e variante selecionada no equipamento | Carregamento e prova real                             | Corrigir sintético | Cache/confirmação                                                 | Erros de página |
| -------------------------------------------- | ----------------------------------------------------- | ------------------ | ----------------------------------------------------------------- | --------------: |
| Llama 3.2 3B q4f16_1                         | Carregou; respondeu `TESTE.`                          | Prévia aprovada    | Cache existente, sem nova confirmação                             |               0 |
| Qwen3 4B q4f16_1                             | Carregou; respondeu `TESTE`                           | Prévia aprovada    | Confirmação quando faltavam dados; rodada final reutilizou cache  |               0 |
| Qwen3 8B q4f16_1                             | Carregou; respondeu `TESTE`                           | Prévia aprovada    | Confirmação de 4,62 GB antes de completar os dados                |               0 |
| As três variantes q4f32_1                    | Não selecionadas fisicamente: `shader-f16` disponível | Não executado      | Seleção f32, estimativas maiores e artefatos conferidos em testes |   Não aplicável |

A correção dos três perfis produziu a pergunta sintética com `Você`/`hoje`, preservando a interrogação e o rascunho original. O retorno de Qualidade para Econômico reutilizou cache e voltou a responder ao teste.

Qwen3 usa `extra_body: { enable_thinking: false }`, opção documentada no contrato do pacote 0.2.82. O runtime ainda incluiu o prefixo vazio `<think>\n\n</think>\n\n` na saída. O adaptador remove somente esse prefixo esperado, inclusive dividido entre fragmentos. Um bloco não vazio ou incompleto falha fechado. A prova e a correção finais não expuseram o prefixo.

A primeira tentativa de download Qwen teve falhas `NetworkError` no `Cache.add` do runtime, deixando shards em cache parcial. Uma requisição real ao shard faltante respondeu HTTP 200 com o tamanho publicado; `Cache.add` falhou novamente, enquanto `fetch` seguido de `Cache.put(new Response(bytes))` funcionou. O carregador agora baixa sequencialmente os arquivos fixos, valida nomes e tamanho dos shards, reutiliza o que já existe e limita novas tentativas. O Qwen3 8B foi efetivamente carregado e inferiu após essa correção. As tentativas que falharam não contam como validação aprovada.

A troca durante streaming real nas duas abas mostrou cancelamento explícito, sem sugestão atrasada e sem alterar o rascunho. O protocolo do Chrome mostrou um Worker antes da troca, nenhum após salvar o novo perfil e exatamente um Worker com outro identificador no pedido seguinte. Esse pedido com Econômico respondeu `TESTE.`, com zero erros de página. As preferências abertas em outra aba acompanham a mudança; uma confirmação antiga é invalidada, e o coordenador recusa autorizações de download cujo perfil esperado difere do perfil salvo.

`npm.cmd run check`: 151 testes em 18 arquivos, tipos, lint, formatação e build. Casos novos cobrem fallback f32 dos três perfis, templates/orçamento Qwen, cache parcial e caminhos rejeitados, migração da preferência v1 para v2, gravações concorrentes, cancelamento ao trocar perfil, confirmação desatualizada, orientação em erro de recursos sem trocar a escolha e os hashes das seis bibliotecas. O content script fica abaixo de 1 MB; os WASM são importados apenas pelo Worker.

## Limites da matriz

- A aprovação cobre os três modelos f16 neste equipamento e os textos sintéticos exercitados. Não certifica todos os computadores, latência universal, todos os modos em Qwen ou precisão semântica geral. A avaliação pt-BR mais ampla pertence à STEP-15.
- Não havia uma segunda GPU física sem `shader-f16` ou com recursos insuficientes. Seleção f32, limites mínimos e apresentação dos erros foram conferidos por testes; inferência física f32 e falha física de memória permanecem sem evidência. A matriz registra isso sem declarar essas variantes testadas no hardware.
- A variante f32 é escolhida quando falta `shader-f16`, com aviso de memória maior antes do download. Um erro de recursos sugere Equilibrado ou Econômico conforme a escolha atual, sem trocar o perfil nem baixar outro modelo.
- O cache pode ser eliminado pelo navegador. Ausência de artefatos pede confirmação novamente. As origens permitidas continuam `huggingface.co` e `us.aws.cdn.hf.co`; alterações de CDN precisam ser revistas. A STEP-13 tratará a gestão completa do cache e desempenho.
- A liberação entre perfis encerra o Worker anterior e sua GPU antes da criação da próxima instância. WebGPU não oferece uma leitura confiável de VRAM livre para comprovar números de memória residente.

Não houve conteúdo de conversa nem mensagem real usado como evidência. Somente fontes, bibliotecas, licenças e procedimentos sintéticos entram no commit.
