# Validação da STEP-13 — Cache, recuperação e desempenho

[Plano](PLANO.md) · [Etapa](steps/STEP-13.md) · [Progresso](PROGRESSO.md)

## Implementação

Pacote 0.12.0, WebLLM 0.2.82 e catálogo/revisões da STEP-12 preservados. O cache usa as URLs completas do catálogo, que incluem modelo, variante e revisão. Antes de carregar uma sessão fria, confere índice, configuração, tokenizer e todos os shards, sequencialmente. Nenhum arquivo ausente é buscado pela inspeção.

Os shards têm tamanho e `md5sum` publicados em `tensor-cache.json`. Ambos são conferidos, inclusive no cache herdado da STEP-12. A implementação MD5 vem de [@noble/hashes 2.0.1](https://github.com/paulmillr/noble-hashes/tree/2.0.1), fixada no lockfile e empacotada localmente; a licença MIT acompanha `dist/licenses`. MD5 detecta corrupção, sem reivindicar assinatura/autenticidade criptográfica do repositório.

Índice, configuração e tokenizer são JSONs com estrutura mínima esperada. Os recibos SHA-256 em `local-writing/artifact-integrity-v1` detectam alterações posteriores em todos os arquivos. Na primeira migração dos JSONs antigos, a estrutura é a referência inicial; os artefatos não fornecem uma assinatura autenticada desses JSONs. URLs/revisões são fixas, não fornecidas pelo conteúdo da página. Os recibos contêm somente hashes de artefatos públicos, sem texto ou identificador de rascunho.

Cache ausente, incompleto ou inconsistente exige confirmação em **Baixar e continuar**. O reparo reaproveita arquivos válidos, remove a entrada inválida e seu recibo e baixa somente o que falta. Cancelamento interrompe o pedido e nunca repete a geração. Falha de rede, tamanho/checksum, quota ou persistência não libera prévia. O usuário pode tentar novamente por nova ação.

**Remover cache da variante selecionada** encerra o Worker, cancela a solicitação ativa e bloqueia novas gerações durante a remoção. Somente entradas dos três caches próprios sob a revisão selecionada são removidas, inclusive resíduos parciais. Preferências, outras variantes/revisões/modelos e caches de outros sites permanecem. O comando exige remetente Chrome do content script no frame principal do WhatsApp, perfil atual e variante do catálogo; campos extras ou URLs arbitrárias são recusados.

O temporizador de cinco minutos pertence ao host no offscreen. Iniciar um pedido suspende a contagem; cada resultado, cancelamento ou erro terminal reinicia a contagem. A expiração termina o Worker e seus recursos GPU sem apagar cache. A sessão carregada é reutilizada entre pedidos independentes e o runtime limpa a conversa a cada geração. Falha ao limpar a sessão também bloqueia o resultado. Perda de dispositivo, Worker, offscreen ou porta encerra pedidos afetados; reconexão exige nova ação, sem aplicação nem replay de texto antigo. O Service Worker continua podendo suspender naturalmente.

## Procedimento reproduzível

1. Execute `npm.cmd ci` e `npm.cmd run check`.
2. Defina `STEP13_CHROME` com Chrome for Testing capaz de carregar extensões MV3 e WebGPU.
3. O roteiro usa exclusivamente `.cache/step13-isolated`, criado para fixtures e sem autenticação. Não use perfil pessoal ou autenticado. O site é substituído por HTML sintético; não abre conversa nem envia mensagem. Os modos de recuperação usam CDP ligado a `127.0.0.1` para capturar e destruir o dispositivo real do Worker de teste. Esse mecanismo pertence apenas ao roteiro de validação.
4. Execute `npm.cmd run test:step13:browser -- recovery` para preparar o modelo por clique, reutilizar a sessão e exercitar falhas de GPU/offscreen.
5. Execute `npm.cmd run test:step13:browser -- offline`. O Chrome é encerrado e reiniciado; proxy local sem servidor torna a rede indisponível. A fixture é fornecida pelo roteiro. Só o modelo íntegro previamente preparado deve gerar.
6. Execute `npm.cmd run test:step13:browser -- lifecycle` para aguardar cinco minutos reais, conferir término do Worker e gerar novamente pelo cache.
7. Execute `npm.cmd run test:step13:browser -- repair` para corrupção, download interrompido, reparo confirmado e remoção restrita. Esse último modo remove os artefatos selecionados do perfil de teste; o próximo uso exige novo download.

Não recompilar `dist` enquanto o roteiro usa seus chunks. Recarregar a extensão e as abas após atualizar o pacote. Os testes são distintos do WhatsApp real já validado nas etapas anteriores e não afirmam precisão geral de escrita.

## Resultados

Chrome for Testing **154.0.8037.0**, Windows, adapter reportado **NVIDIA / lovelace**, com `shader-f16`; modelo Llama 3.2 3B `q4f16_1` na revisão fixa do catálogo. Extensão instalada a partir de `dist`, sem servidor de desenvolvimento. Somente fixtures sintéticas, sem autenticação/conversa/envio.

| Roteiro     | Resultado observado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `recovery`  | Sessão fria pelo cache em 31,4 s; pedido seguinte em 0,96 s, mesmo Worker. Dispositivo real capturado por CDP no Worker filho do offscreen e destruído durante streaming: sugestão bloqueada e original intacto. Nova prova explícita aprovada. Offscreen encerrado durante outro streaming: conexão perdida, nenhuma prévia antiga, original intacto; nova prova explícita aprovada. Zero erros de página.                                                                                                          |
| `offline`   | Chrome encerrado e reiniciado com proxy indisponível. Prova `TESTE` aprovada usando os artefatos previamente preparados, sem download adicional, em 32,7 s. Pedido seguinte em 0,91 s, mesmo Worker. Zero erros de página.                                                                                                                                                                                                                                                                                           |
| `lifecycle` | Sessão fria em 32,8 s e reutilização em 0,92 s. Após a última conclusão, o Worker desapareceu em **301.020 ms**. Nova ação recarregou pelo cache e gerou em **118,1 s**; arquivos mantidos, sem confirmação/download. Zero erros de página.                                                                                                                                                                                                                                                                          |
| `repair`    | Sessão fria em 31,2 s, reutilização em 0,93 s. Um byte do primeiro shard foi alterado mantendo o tamanho: Corrigir exigiu reparo, sem prévia nem alteração do original. Download confirmado e interrompido; próximo pedido exigiu nova confirmação. Reparo confirmado gerou `TESTE`. Remoção deixou somente a entrada sintética alheia no cache de modelo e preservou outro cache e `{version: 2, profile: economico, semanticReview: true}` no Chrome Storage. Próximo pedido pediu download. Zero erros de página. |

Os tempos medem desde o clique até a resposta da prova fixa e incluem conferência/carregamento/inferência. São observações deste equipamento, sem promessa universal. A recarga após encerrar o Worker variou de 111 a 118 segundos nas rodadas de recuperação/inatividade, acima da primeira carga pelo cache; a sessão já carregada permaneceu abaixo de um segundo nas provas. Não atribuir essa variação a uma causa específica nem tratá-la como benchmark pt-BR da STEP-15.

Desconexão de abas e descarte de eventos tardios têm cobertura automatizada de roteador/cliente/offscreen, mantida nesta etapa. A perda de contexto foi exercitada fisicamente pelo encerramento do offscreen; reinício do coordenador foi exercitado pelo reinício completo do Chrome, além da evidência de suspensão natural durante inferência já registrada na STEP-12. Nenhum keepalive ou replay foi adicionado.

Verificação automatizada: 171 testes em 23 arquivos, tipos, lint sem avisos, Prettier e build aprovados. Os testes novos cobrem cache completo/parcial, JSON e caminhos inválidos, shard truncado, corrupção de mesmo tamanho antes/depois dos recibos, reparo seletivo, remoção por revisão, cancelamento, bloqueio durante manutenção, remetentes e temporizador sem expiração durante pedido ativo. O pacote confere os seis WASM e inclui a licença da dependência nova.

## Limites

Persistência depende do navegador, espaço e políticas de armazenamento. A expiração da sessão não remove arquivos; limpeza/evicção ou remoção explícita podem exigir novo download. A inferência preparada funciona offline; o WhatsApp não recebe promessa de disponibilidade sem rede. Os testes físicos usam a GPU com `shader-f16` disponível neste computador, sem certificar variantes f32 em outro equipamento ou esgotamento físico de VRAM. As guardas determinísticas e semânticas continuam sujeitas aos limites das etapas anteriores.

A primeira instrumentação CDP não respondeu no canal aninhado. A revisão automática rejeitou uma tentativa de porta de depuração em perfil preexistente por possível exposição de autenticação; a execução posterior foi autorizada em perfil novo, exclusivo e sem autenticação. Esses ajustes pertencem ao roteiro de teste, sem abrir porta de depuração no produto.

## Arquivos e encerramento

- Runtime/cache: `src/extension/ai/model-cache.ts`, `webllm-engine.ts`, `worker.ts`, `src/extension/offscreen/index.ts`, `worker-host.ts` e `src/extension/background/router.ts`.
- Interface: `src/extension/content/cache-client.ts`, `preview-session.ts` e `PreviewPanel.tsx`.
- Pacote: `manifest.json`, `package.json`, `package-lock.json`, `vite.config.ts`, `NOTICE.txt` e `licenses/NOBLE-HASHES-LICENSE`.
- Verificação: `tests/model-cache.test.ts`, testes existentes de perfis, roteador, offscreen, Worker e build; `tests/browser/step13-cache.mjs` e compatibilidade de versão dos roteiros da STEP-12.
- Documentação: README, progresso, checklist da STEP-13 e este relatório.

Todos os critérios obrigatórios da STEP-13 foram satisfeitos. A pasta `dist` foi gerada para instalação local; perfis/cache de teste, dependências instaladas e arquivos temporários ficam ignorados. Commit da etapa: `feat(step-13): consolidar cache e recuperação local`, com identidade humana configurada. Sem push; STEP-14 não iniciada.
