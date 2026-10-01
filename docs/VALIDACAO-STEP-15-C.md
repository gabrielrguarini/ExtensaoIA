# Validação STEP-15-C — Gemma via Transformers.js

[Plano](PLANO.md) · [Progresso](PROGRESSO.md) · [Etapa](steps/STEP-15-C.md) · [Cache e referências Chrome](REFERENCIAS-IA-CHROME.md)

## Entrega e estado

Pacote MV3 **0.15.2**, Gemma 4 E2B selecionável e alternativa ao Chrome, com processamento textual local em WebGPU. Nove ações em pt-BR, revisão explícita, streaming, substituição/desfazer, isolamento, cancelamento, concorrência, troca, idle real, remoção/recuperação do cache e reinício offline passaram no Chrome for Testing. Instalação limpa, regressões Chrome/WebLLM e `npm.cmd run check` aprovados: **STEP-15-C Concluída**. A STEP-15 principal continua **Aguardando validação** pelas avaliações obrigatórias.

STEP-15-D não executada. Os 108 pares históricos e as 191 avaliações Qwen pendentes permanecem intactos. Estes ensaios são integração com fixtures sintéticas, não avaliação reservada nem recomendação de melhor modelo.

## Modelo, dependências e contratos

- **Transformers.js 4.2.0** e ONNX Runtime Web **1.26.0-dev.20260416-b7804b056c** travados. `@types/dom-chromium-ai` **0.0.17** preservado. `adm-zip` **0.6.1** e `sharp` **0.35.4** por overrides corrigem as dependências transitivas de instalação; os executáveis Node não integram a extensão. Auditoria final: zero vulnerabilidades.
- Modelo [onnx-community/gemma-4-E2B-it-ONNX](https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX/tree/9f4bef82ea6e296bc69f8a2f5939f73af81b07a6), revisão **9f4bef82ea6e296bc69f8a2f5939f73af81b07a6**. Tamanho e SHA-256 publicados para pesos LFS; arquivos auxiliares conferidos contra blobs da revisão e SHA-256 fixado no [catálogo](../src/extension/ai/gemma-catalog.ts). [Registro de digests](evidencias/step15c/catalogo-sha256.json).
- `Gemma4ForCausalLM` utiliza o modo textual do runtime com embed_tokens/decoder. A configuração upstream contém modalidades adicionais, mas não baixamos nem instanciamos áudio/visão. Tokenizer JSON, configuração e template são dados.
- q4f16 com shader-f16: **3.130.549.798 bytes**; q4 sem shader-f16: **3.646.892.071 bytes**. Nove arquivos por variante. Ambas quantizam pesos em quatro bits. A inferência real nesta máquina validou **q4f16**; seleção q4 foi testada com adapter simulado nos testes unitários. Não se certifica GPU sem shader-f16 ou outra máquina por esse teste.
- [Cartão oficial Gemma](https://huggingface.co/google/gemma-4-E2B-it) e metadados ONNX declaram **Apache 2.0**. Licenças do modelo, Transformers.js, runtime e dependências/avisos de terceiros acompanham `dist/licenses` e NOTICE.txt. E2B possui cerca de 2,3 bilhões de parâmetros efetivos e 5,1 bilhões incluindo embeddings; não presumir menor memória que Llama 3B.
- Preferências **v5**: `engine: chrome-preferred | local`, `localModel: webllm | gemma`, perfil WebLLM independente. Escolha v4 manual WebLLM migra para local/WebLLM, preservando perfil, ações, tema e opção pt-BR. Instalação nova mantém Chrome preferencial, WebLLM Econômico como alternativa e português experimental desligado.
- Um Worker por runtime, seleção antes da geração e somente um pedido ativo. Troca libera o modelo anterior. `AIEngine` e `ModelRequestRunner` comuns mantêm avisos, texto original, revisão explícita e substituição manual; nenhuma mensagem é enviada.

## Runtime local e compatibilidade

Todo JS/WASM executável é local; ONNX asyncify `.mjs`/`.wasm` são copiados do pacote travado. O adaptador desliga modelos remotos, FS/browser/WASM cache do Transformers.js e armazenamento entre origens. Cache customizado só responde por artefatos registrados e verificados. Arquivos opcionais não causam rede.

Transformers.js 4.2.0 descobre arquivos do tokenizer consultando `main`, sem transmitir a revisão recebida ao helper. Isso inicialmente produziu configuração ausente. A camada pequena de compatibilidade resolve **somente a leitura de metadados de tokenizer_config.json em main** para o arquivo verificado na revisão fixa. Não grava um alias, não carrega pesos de main e não faz requisição remota. [Helper dessa versão](https://github.com/huggingface/transformers.js/blob/4.2.0/src/utils/model_registry/get_tokenizer_files.js).

O template Jinja recebe `enable_thinking: false`, aceito pelo runtime, embora a tipagem 4.2.0 omita esse parâmetro. Não incluir marcador de raciocínio nem executar segunda reescrita. O orçamento conta tokens reais do template e original, reserva saída por tarefa e recusa excesso de 4.096 tokens sem cortar entrada. Saída precisa terminar com EOS; interrupção por limite não vira sugestão final.

TextStreamer produz deltas sem histórico entre pedidos. Cancelamento usa AbortSignal e stopping criteria; tensores e listeners são liberados no finally. Erros de template liberam a ocupação. O Worker é encerrado por cancelamento pendente/perda de contexto quando necessário e após cinco minutos de inatividade. Contadores opcionais distinguem primeiro token, primeiro trecho e total; tokens/s usa tokens observados após o primeiro token, sem incluir prefill nem inventar métrica ausente.

## Cache e privacidade

Cache canônica **local-writing/gemma** por URL/revisão; recibos de tamanho/SHA-256 em **local-writing/gemma-integrity**. Tamanho/digest são calculados em fluxo no download e em cada carregamento, sem materializar outra cópia dos GB para hashing. Consultas de estado leem somente chaves. Presença não certifica integridade. Não existe cópia de pesos em OPFS, IndexedDB ou transformers-cache.

Downloads requerem **Baixar e continuar**. Arquivos válidos são reutilizados; corrupção, truncamento ou ausência exigem nova autorização. Interrupção descarta entrada/recibo incompletos. Apagar variante remove seus pesos e arquivos comuns, preservando entradas alheias, preferências e modelos administrados por outros motores. Arquivos comuns removidos podem tornar a outra variante Gemma incompleta. Persistência depende do navegador.

A auditoria CDP observou os Workers reais do offscreen: executáveis somente da extensão; dados somente da revisão registrada em **huggingface.co**, redirecionados a **us.aws.cdn.hf.co**. Apenas GET, sem corpo de prompt/rascunho. Sem eventos de console na execução auditada. O relatório remove query strings assinadas e registra apenas origem/caminho/método. Chrome Storage manteve exclusivamente preferências v5; caches contêm arquivos do catálogo e recibos, sem texto do usuário. [Rede, remoção e inventário](evidencias/step15c/gemma-cache.json).

## Evidência real e limites

Windows, Node **22.14.0**, npm **10.9.2** para checks; instalação/auditoria de rede executada com npm **11.2.0** no ambiente autorizado. Hardware alvo: i9-13980HX, 16 GB RAM, NVIDIA RTX 4060 Laptop com 8.188 MiB e driver **555.97**; WebGPU expôs `nvidia/lovelace`, shader-f16 e limites de buffer de aproximadamente 2 GiB. Esses limites não informam VRAM livre. Perfis dedicados, sem contas ou conversas reais. A fixture servida no domínio aprovado exercita o content script real; não substitui a validação final da interface atual do WhatsApp na STEP-16.

| Procedimento                                                                                    | Resultado e evidência                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nove ações, reinício offline, Chrome indisponível → Gemma                                       | Aprovado no CfT **154.0.8037.0**, nove prévias legíveis em pt-BR; original preservado, substituição e Ctrl+Z. [Execução](evidencias/step15c/gemma-offline.json).                                                                                                            |
| Prova, revisão JSON, streaming, concorrência, cancelamento, rascunho obsoleto, troca/isolamento | Aprovado; prova respondeu TESTE, revisão não alterou prévia, concorrência recebeu IA ocupada, aplicação obsoleta impedida. [Controles](evidencias/step15c/gemma-controles.json).                                                                                            |
| Idle de cinco minutos e liberação explícita                                                     | Worker liberado em **300.245 ms**, cache preservado. [Controles](evidencias/step15c/gemma-controles.json).                                                                                                                                                                  |
| Remoção, interrupção e restauração                                                              | Aprovado; seis arquivos auxiliares completos após interrupção, nenhum `.onnx_data` parcial disponível; restauração explícita e geração em **150.818 ms**. Cache final: nove artefatos e nove recibos, sem transformers-cache. [Cache](evidencias/step15c/gemma-cache.json). |
| Regressão WebLLM                                                                                | Aprovada no pacote 0.15.2: alternativa offline Llama, prévia, avisos, substituição/desfazer e rascunho obsoleto. [Execução](evidencias/step15c/regressao-webllm.json).                                                                                                      |
| Regressão Chrome nativo                                                                         | Aprovada no Chrome **154.0.8037.93**: nove ações em pt-BR experimental offline, revisão, aplicação manual, streaming e 11 clones destruídos. Idle nativo não repetido; evidência B preservada. [Execução](evidencias/step15c/regressao-chrome.json).                        |
| Instalação reproduzível                                                                         | `npm.cmd ci --cache .cache/npm --no-audit` aprovado; lockfile SHA-256 igual antes/depois. [Auditoria](evidencias/step15c/npm-audit.json).                                                                                                                                   |
| Aviso antes do primeiro download                                                                | Aprovado no código final: Gemma q4f16 e **3,13 GB**, sem identificação Llama nem tráfego remoto antes da confirmação. Fixture removeu/restaurou configuração pública; cache íntegro ao terminar. [Execução](evidencias/step15c/gemma-download-aviso.json).                  |
| Checks finais                                                                                   | `npm.cmd run check` aprovado: tipos, lint sem avisos, formatação, **254 testes em 37 arquivos** e build instalável. [Checks e integridade](evidencias/step15c/checks.json).                                                                                                 |

O carregamento com cache mais primeira correção ficou aproximadamente em **39 segundos**, incluindo verificação integral dos 3,13 GB e inicialização. Oito pedidos subsequentes levaram cerca de **2,3–2,8 segundos** cada. Medidas simples da interface com um rascunho, sem p95/três rodadas. Não comparar com campanhas de outra metodologia. Muitos tons retornaram texto parecido; capitalização de Mariana acionou aviso conservador de nomes. A D deverá separar utilidade, preservação e avisos indevidos.

As tentativas iniciais falharam na descoberta de tokenizer e foram corrigidas. Capturas com caret oculto e um harness que iniciava a ação seguinte antes de encerrar a substituição invalidaram a fixture; o harness passou a manter caret e aguardar fechamento. O painel ampliado também exigiu ativação por teclado do checkbox no roteiro nativo. Não atribuir essas falhas à GPU, ao idioma ou à incompatibilidade do modelo. [Tentativas](evidencias/step15c/tentativas.json).

[Ambiente e versões](evidencias/step15c/ambiente.json), [checks/fontes/executáveis](evidencias/step15c/checks.json) e [SHA-256 das evidências](evidencias/step15c/SHA256SUMS.json) permitem conferir a entrega. Resultados anteriores ao ajuste final do aviso de download mantêm seus dados originais; o ensaio de aviso e os checks finais cobrem esse ajuste. Em parte do registro de controles, Node classificou a origem do esquema da extensão como `null`; os caminhos locais registrados e as execuções posteriores com a origem normalizada confirmam os executáveis empacotados.

## Reprodução e continuidade

```powershell
npm.cmd ci
npm.cmd run check
$env:STEP15C_CHROME = 'CAMINHO/DO/CHROME-FOR-TESTING/chrome.exe'
npm.cmd run test:step15c:browser
$env:STEP15C_OFFLINE = '1'
$env:STEP15C_PREFERRED = '1'
npm.cmd run test:step15c:browser
Remove-Item Env:STEP15C_PREFERRED
npm.cmd run test:step15c:controls
npm.cmd run test:step15c:cache
$env:STEP15C_CONSENT = '1'
npm.cmd run test:step15c:browser
Remove-Item Env:STEP15C_CONSENT
```

Os roteiros utilizam perfil `.cache/step15c-chrome`, porta CDP **9236**, fixtures sintéticas e Chrome com WebGPU real. O teste de cache requer preparação inicial e redownload explícito após remoção; controles incluem espera real de cinco minutos. Não executar dois roteiros simultaneamente no mesmo perfil. Artefatos de teste e pesos não são versionados; somente resultados sintéticos/procedimentos.

Commit próprio `feat(step-15-c): integrar Gemma local via Transformers.js`; hash no histórico Git e no relato final. Próxima etapa **STEP-15-D**, somente mediante solicitação, preservando pendências históricas. STEP-16 segue posterior à D.
