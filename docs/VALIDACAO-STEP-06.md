# Validação da STEP-06 — primeiro modelo local

Data: 28/09/2026. Todos os textos de teste são sintéticos. Nenhuma conversa real foi lida, registrada ou recebeu mensagem.

## Configuração fixada

| Item                      | Valor                                                                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WebLLM                    | `@mlc-ai/web-llm` 0.2.85, dependência exata no lockfile, licença Apache 2.0                                                                                           |
| Catálogo compatível       | `modelVersion` `v0_2_84/base` da versão publicada 0.2.85                                                                                                              |
| Principal                 | `Llama-3.2-3B-Instruct-q4f16_1-MLC`, pesos `1e80abf71e3d17cd564e2d2b63caa15cb226018e`                                                                                 |
| Fallback sem shader-f16   | `Llama-3.2-3B-Instruct-q4f32_1-MLC`, pesos `6083cfdaaf08d2dd4872d7f5b87fb0242aa7d75c`                                                                                 |
| Biblioteca WASM           | Binários `cs1k-webgpu` de `v0_2_84/base`, revisão `025bcaf3780fa8254f5e5efd3bfea0a5397248f4` do repositório `binary-mlc-llm-libs`; ambos empacotados em `dist/assets` |
| Hash SHA-256 do WASM f16  | `79cc2f3794e32d9611675102a91d6ad1c8e869c1d5c3f7e8f8d26564d2f28efb`                                                                                                    |
| Hash SHA-256 do WASM f32  | `fac5f2303c170d8936ffef02498b8f645b17e98f4be83cfe2d081ea7304d0f67`                                                                                                    |
| Dados do modelo           | 1.816.687.044 bytes por variante, soma dos arquivos necessários publicados nas revisões acima; aproximadamente 1,82 GB em unidades decimais                           |
| Estimativa de memória GPU | 2.263,69 MB f16 ou 2.951,51 MB f32 no catálogo. Isto não é tamanho de download nem VRAM livre.                                                                        |
| Licenças                  | Llama 3.2 Community License, texto e aviso em `licenses/` e `NOTICE.txt`; licença Apache 2.0 do WebLLM incluída.                                                      |

Fontes verificadas: [release 0.2.85](https://github.com/mlc-ai/web-llm/releases/tag/v0.2.85), [catálogo dessa tag](https://github.com/mlc-ai/web-llm/blob/v0.2.85/src/config.ts), [modelo f16](https://huggingface.co/mlc-ai/Llama-3.2-3B-Instruct-q4f16_1-MLC), [modelo f32](https://huggingface.co/mlc-ai/Llama-3.2-3B-Instruct-q4f32_1-MLC), [bibliotecas MLC](https://github.com/mlc-ai/binary-mlc-llm-libs/tree/025bcaf3780fa8254f5e5efd3bfea0a5397248f4/web-llm-models/v0_2_84/base) e [licença Meta](https://dev.meta.ai/llama/llama3_2/license). Os metadados de tamanho e SHA dos pesos foram obtidos na API pública do Hugging Face em 28/09/2026.

## Procedimento reproduzível

1. Execute `npm ci` e `npm run check`; confira `dist/manifest.json`, os dois WASM em `dist/assets`, `NOTICE.txt` e `dist/licenses`.
2. Use Chrome for Testing com WebGPU e defina `STEP06_CHROME` como o caminho absoluto do executável. Opcionalmente, defina `STEP06_PROFILE` para uma pasta de perfil de teste. O perfil padrão fica em `.cache/step06-browser` e preserva apenas o cache necessário entre comandos.
3. Execute `npm run test:step06:browser -- online`. O roteiro carrega `dist` sem compactação em perfil isolado, serve uma fixture HTML sintética sob `https://web.whatsapp.com/`, clica na ação explícita de download e aguarda a resposta. A fixture não abre uma conta nem envia mensagens.
4. Feche o Chrome e execute `npm run test:step06:browser -- offline` no mesmo perfil. O roteiro desativa a rede da sessão e configura um proxy local indisponível (`127.0.0.1:9`) antes de abrir o navegador, bloqueando também as requisições do Worker. Ele exige nova resposta do cache.
5. Execute `npm run test:step06:browser -- cache` para conferir as origens dos artefatos e as três áreas do Chrome Storage.
6. Execute `npm run test:step06:browser -- download-failure` para usar um perfil distinto, sem cache, com rede desativada e o mesmo proxy bloqueado; a mensagem de falha deve aparecer e o rascunho sintético permanecer intacto.
7. Execute `npm run test:step06:browser -- regression` para conferir que a prévia simulada da STEP-05 ainda abre e cancela sem alterar o editor.

No PowerShell deste ambiente, o navegador usado foi `C:\Users\Transmissão\AppData\Local\ms-playwright\chromium-1246\chrome-win64\chrome.exe`. O roteiro faz a verificação por interface da extensão instalada. Ele não substitui testes futuros no WhatsApp real para a ação Corrigir.

## Resultados observados

- Windows, Node 22.14.0, npm 10.9.2 e Chrome for Testing da família 154 (Chromium 1246). O `navigator.gpu.requestAdapter({ powerPreference: 'high-performance' })` retornou adapter Intel `gen-12lp`, com `shader-f16`, `maxStorageBufferBindingSize` de 2.147.483.644 bytes e `maxBufferSize` de 2.147.483.648 bytes. Nenhuma inferência de VRAM livre foi feita.
- A primeira execução baixou os dados da revisão f16, carregou a GPU e gerou `TESTE.` para a frase fixa “Responda somente com a palavra TESTE.” dentro do Worker da extensão. A digitação em um campo independente respondeu durante a preparação; a fixture manteve `Rascunho sintético` intacto. O resultado apareceu como prova de modelo, sem ação de substituição/cópia. Nenhum erro de página foi observado.
- A URL inicial dos dados foi `huggingface.co`. Uma requisição de shard redirecionou para `us.aws.cdn.hf.co`; o teste `HEAD` confirmou o mesmo host para f16 e f32. São as duas únicas origens de rede permitidas no Manifest/CSP final. JS e WASM são arquivos locais do pacote. O teste de build confere os hashes dos WASM empacotados.
- Após fechar e reiniciar o Chrome com proxy bloqueado, o modo `offline` gerou novamente `TESTE.` com o mesmo rascunho intacto e sem erros de página. O cache da origem da extensão continha `webllm/config` (1 entrada) e `webllm/model` (60 entradas), todas com URL de `huggingface.co`; `storage.local`, `sync` e `session` estavam vazios.
- O modo `download-failure`, em perfil sem cache e sem rede, mostrou a falha compreensível de download e manteve `Rascunho sintético`. O modo `regression` apresentou `[Simulação] Rascunho sintético`, cancelou e manteve o original.
- `npm run check` final: tipos, lint, formatação, 102 testes em 9 arquivos e build aprovados. O build produziu Worker, WebLLM JS, dois WASM, interfaces e licenças locais.

## Limites da evidência

- O hardware disponível tinha `shader-f16`; a seleção q4f32_1 foi conferida por teste automatizado e pelo catálogo fixado, sem uma segunda GPU real sem esse recurso.
- Ausência de WebGPU e limites de adapter abaixo do mínimo foram exercitados em testes do seletor e da apresentação dos erros. Não havia, neste ambiente, um segundo computador sem WebGPU ou com GPU insuficiente para uma prova física desses ramos. A tentativa de desativar WebGPU por flag do Chrome manteve um adapter disponível e não foi contada como validação desse caso.
- O teste de UI usou compositor sintético servido no Chrome com a extensão instalada. Não foi necessário abrir contato, ler conversa ou enviar mensagem. A validação anterior da prévia no WhatsApp real permanece registrada na STEP-05.
- Outros redirecionamentos regionais do Hugging Face não foram observados. Se a origem mudar, a CSP bloqueia o download e a configuração precisa de revisão explícita.
