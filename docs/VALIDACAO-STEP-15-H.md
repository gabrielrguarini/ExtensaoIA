# Validação STEP-15-H — Substituição direta e tooltip

[Plano](PLANO.md) · [Progresso](PROGRESSO.md) · [Etapa](steps/STEP-15-H.md)

## Entrega em 02/10/2026

Pacote/Manifest/lockfile **0.15.7**, preferências **v8**, dependências exatas preservadas. O clique em IA executa a ação salva e aplica somente a resposta final ao rascunho atual. Padrões: **Corrigir** e **Substituir diretamente**. A migração mantém ação, modelo e opções anteriores; adota o modo direto. **Ao clicar em IA → Revisar sugestão**, nas configurações, recupera a prévia com Copiar/Substituir.

Esta autorização do usuário substitui a exigência histórica de um segundo clique para aplicar. AGENTS.md, plano e STEP-16 refletem a decisão. Nenhuma mensagem é enviada pela extensão.

No modo direto não há janela, menu, resposta parcial nem diálogo de erro. O tooltip **Carregando IA** acompanha preparação, geração e aplicação, com indicador no botão. Hover/foco, descrição acessível, Escape, posicionamento dentro da janela e preferência por movimento reduzido foram preservados. A [referência shadcn/Base UI](https://ui.shadcn.com/docs/components/base/tooltip) orientou o componente no Shadow DOM existente, sem acrescentar dependências.

## Aplicação, cancelamento e preparação

Uma geração por pedido; somente texto final tecnicamente válido. O adaptador existente faz inserção nativa com desfazer, revalida o contexto entre operações e impede resultado antigo de sobrescrever uma edição. Cancelar por IA/Escape/clique fora, desconectar, alterar preferências relevantes ou editar/trocar de conversa invalida o pedido. Alterações feitas pela própria aplicação não cancelam a transação em curso. Resposta idêntica mostra **Sem alterações**, sem escrever. Editor incompatível, resposta vazia, falha ou cache ausente preservam o rascunho e apresentam orientação no tooltip.

Modelos próprios podem ser preparados nas configurações visíveis: **Baixar modelo**, tamanho máximo, progresso e cancelamento. O popup orienta abrir o painel; não inicia o download. A preparação descarrega a instância selecionada e reutiliza o cache canônico com verificação de integridade. Chrome mantém seu preparo separado. No modo de prévia, Baixar e continuar permanece disponível. Nenhum download silencioso ou tentativa automática após erro foi introduzido.

## Verificações automatizadas

`npm.cmd run check` aprovado: tipos, lint sem avisos, formatação, **286 testes em 41 arquivos** e build MV3. Os 12 testes novos verificam migração/modos, geração única, resposta final, cancelamento, edição, resultado idêntico/vazio, editor incompatível, cache ausente, desconexão, preferência alterada durante aplicação e ausência de diálogo. Os testes anteriores de aplicação, comunicação, motores e privacidade continuam aprovados.

## Chrome real e modelos preparados

Máquina das campanhas anteriores: Windows, i9-13980HX, 16 GB RAM, RTX 4060 Laptop. Perfis dedicados, fixtures sintéticas na origem WhatsApp, sem autenticação, conversa real ou envio. Inferências offline com cache já preparado. Roteiro H reutiliza a fixture F; a identificação STEP15F nas capturas é a origem do cenário, não um teste simulado.

| Candidato                            | Navegador            | Verificações aprovadas | Resultado direto para a frase fornecida                        |
| ------------------------------------ | -------------------- | ---------------------: | -------------------------------------------------------------- |
| Chrome Prompt API, compatibilidade G | Chrome 154.0.8037.93 |                     16 | Fazendo o teste da extensão pra ver se funciona de verdade.    |
| Llama 3.2 3B/WebLLM q4f16            | CfT 154.0.8037.0     |                     19 | fazendo o teste da extensão, à para ver se funciona de verdade |
| Gemma 4 E2B/Transformers.js q4f16    | CfT 154.0.8037.0     |                     17 | Fazendo o teste da extensão para ver se funciona de verdade.   |

Em todos: modo direto sem dialog, tooltip durante geração, substituição final/Ctrl+Z, Escape sem aplicação e edição durante geração preservada. Depois, seleção de Revisar sugestão por teclado nas configurações, prévia real com streaming, cópia, aplicação/Ctrl+Z, mudança da ação salva para Conciso e bloqueio de resultado obsoleto. Preferências v8 migradas sem o antigo interruptor de português; controles técnicos não reaparecem.

O resultado Llama contém trecho inadequado, também observado nas etapas anteriores. A extensão não tenta avaliar sentido nem repete a geração, conforme autorização E. Essa etapa não altera prompts/modelos, não comprova ganho de precisão ou latência e não substitui os benchmarks D. Ctrl+Z e a prévia opcional permitem ao usuário decidir o texto.

Preparação própria adicional com Llama: abriu-se sidepanel.html em uma aba visível do perfil dedicado, usando o mesmo componente do painel. Um pequeno mlc-chat-config.json foi temporariamente removido do cache, preservando backup e todos os pesos. **Baixar modelo → Cancelar download** apresentou cancelamento; nova ação explícita reparou o arquivo e validou/reutilizou os pesos. A conclusão levou aproximadamente quatro minutos, incluindo integridade; não representa um download completo. O arquivo original foi restaurado no finally do roteiro. Não foi repetido o download multigigabyte de Gemma nem o preparo nativo já validado em B/G.

## Tentativas e limites de observação

Quatro tentativas anteriores do roteiro Llama foram interrompidas: duas aguardando o aviso de edição, uma aguardando o início de um novo pedido e uma recebendo **IA ocupada** antes da prévia. O rascunho sintético editado permaneceu nas capturas. A última identificou que fechar a interface não significa liberação imediata do runtime cancelado; o protocolo pode levar até dois segundos. O roteiro passou a esperar três segundos após cancelamento e usar texto mais longo na edição durante geração. A execução final passou integralmente. As tentativas são preservadas; não foram classificadas como incompatibilidade do modelo.

Zero erros de página, eventos de console, erros de observação ou avisos de idioma de saída ausente nos três ensaios finais. Rede observada na inferência: nenhuma requisição no offscreen nativo; GETs de executáveis locais nos Workers WebLLM/Gemma, sem corpo de pedido. No reparo explícito, três GETs públicos do arquivo de configuração/redirecionamento Hugging Face, sem corpo. Storage da extensão contém somente preferências. A observação é limitada aos contextos testados, não uma auditoria global do navegador.

## Evidências e reprodução

[Chrome](evidencias/step15h/chrome.json) · [Llama](evidencias/step15h/webllm.json) · [Gemma](evidencias/step15h/gemma.json) · [Checks](evidencias/step15h/checks.json) · [SHA-256](evidencias/step15h/SHA256SUMS.json). Tentativas: [1](evidencias/step15h/webllm-attempt-1.json), [2](evidencias/step15h/webllm-attempt-2.json), [3](evidencias/step15h/webllm-attempt-3.json), [4](evidencias/step15h/webllm-attempt-4.json).

Capturas sintéticas: [tooltip Chrome](evidencias/step15h/chrome-loading-tooltip.png), [resultado direto Chrome](evidencias/step15h/chrome-direct-result.png), [configurações](evidencias/step15h/chrome-settings.png), [prévia opcional](evidencias/step15h/chrome-preview.png), [tooltip Llama](evidencias/step15h/webllm-loading-tooltip.png), [tooltip Gemma](evidencias/step15h/gemma-loading-tooltip.png) e [preparo do modelo](evidencias/step15h/webllm-model-prepared.png). Demais capturas dos três candidatos acompanham os relatórios. Evidências C/D/E/F/G conferidas por SHA-256 e preservadas.

Após build, definir STEP15H_CHROME com o executável e STEP15H_ENGINE com chrome, webllm ou gemma; executar `npm.cmd run test:step15h:browser`, uma execução por vez. Perfis usados: .cache/step15b-chrome, .cache/step15-isolated e .cache/step15c-chrome. Requer os respectivos caches preparados; o teste de reparo Llama demanda rede somente durante a ação de preparo. Não usa perfis pessoais. Registros temporários ficam em .cache/step15h; somente evidências sintéticas selecionadas são versionadas.

## Encerramento

Entrega funcional validada nos três motores desta máquina, com commit próprio `feat(step-15-h): substituir rascunho diretamente com tooltip`, identidade humana configurada, sem push. Hash no histórico Git e relato final. **STEP-16 Pendente**, incluindo instalação limpa, auditoria final e os dois modos no WhatsApp autenticado real. Não iniciada nesta etapa.
