# Validação STEP-15-F — Interface simplificada

[Plano](PLANO.md) · [Progresso](PROGRESSO.md) · [Etapa](steps/STEP-15-F.md)

## Entrega em 02/10/2026

Pacote/Manifest/lockfile **0.15.5**, com dependências exatas preservadas. O botão IA captura o rascunho no clique e executa uma vez a ação salva nas configurações. No editor ficam progresso, cancelamento, sugestão, Copiar e Substituir. A decisão sobre o conteúdo continua pertencendo ao usuário, sem análise automática de alterações ou envio de mensagens.

Popup e painel lateral concentram ação, gírias, novos emojis e tema. **IA e modelos** é uma seção recolhida com seleção automática/manual e um único campo para Llama 3.2 3B, Qwen3 4B, Qwen3 8B ou Gemma 4 E2B. **Armazenamento e memória** reúne manutenção do modelo selecionado. Foram retirados da interface o interruptor pt-BR, nomes de frameworks, variantes, buffers, quotas, VRAM, identificação do motor, testes sintéticos, simulação e link de diagnóstico. Provas e simulações históricas permanecem como ferramentas internas de desenvolvimento, sem entrada na interface do produto.

Os rótulos descrevem a ação, a preparação e o estado necessário para o uso. Downloads informam tamanho e exigem consentimento explícito. A interface mantém foco visível, campos rotulados, navegação por teclado, estados de progresso/erro e temas. Consultas de estado verificam presença dos artefatos; a integridade dos pesos continua no carregamento.

## Correção do popup real relatado pelo usuário

O primeiro teste de layout em uma aba com viewport definida não revelou o defeito de dimensionamento do popup. O relato com imagem foi reproduzido usando **chrome.action.openPopup** e confirmando a janela por **chrome.extension.getViews({type: 'popup'})**, sem emulação de viewport. Antes da correção, o popup tinha **71 × 600 px**, corpo de 56 px e título de 240 px de altura.

A regra max-width: 100vw limitava a largura intrínseca à viewport inicial pequena usada pelo Chrome. A largura do corpo permanece 360 px, agora com min-width: 360px e sem esse limite dependente da viewport. No mesmo teste real, o popup passou a **375 × 600 px**, incluindo a barra vertical, corpo de 360 px e título de **30 px**, em uma linha. Sem rolagem horizontal. O painel lateral continua com largura fluida.

[Antes](evidencias/step15f/popup-real-baseline.png) · [Depois](evidencias/step15f/popup-real-corrected.png) · [Medição antes](evidencias/step15f/popup-real-baseline.json) · [Medição depois](evidencias/step15f/popup-real-corrected.json). Reprodução: npm.cmd run test:step15f:popup com STEP15F_CHROME apontando para Chrome instalado; usa apenas o perfil dedicado step15b-chrome. Essa verificação integra o aceite adicional da etapa.

## Português e migração

Preferências **v7** migram v1–v6, preservando modelo, perfil, ação, tema, gírias e emojis válidos. Descartam os interruptores antigos de idioma e análise semântica.

O seletor compartilhado consulta primeiro a configuração com idioma declarado e API especializada. Quando ela não está pronta, consulta Prompt com instrução de responder em português brasileiro e sem declarar um idioma recusado pelo navegador. Prefere um caminho pronto; se nenhum estiver pronto, usa o modelo selecionado antes da geração. A preparação visível usa as opções previamente consultadas; o offscreen confirma sua própria disponibilidade antes de criar a sessão. Não baixa silenciosamente nem troca de motor após iniciar a geração. A disponibilidade genérica não certifica qualidade ou suporte formal ao idioma.

Captura imediata e leitura assíncrona das preferências são protegidas contra cancelamento e edição do rascunho. Alterações novas de preferências prevalecem sobre leituras atrasadas; mudar ação/modelo/opções de escrita durante a geração cancela o pedido. Trocas de tema preservam o pedido. Guardas de origem, editor, revisão, desconexão, resultado completo e aplicação manual foram mantidas.

## Verificações automatizadas

`npm.cmd run check` aprovado: TypeScript strict, ESLint sem avisos, Prettier, **272 testes em 40 arquivos** e build MV3 instalável. Os testes novos cobrem ação salva por um clique, captura antes da leitura, cancelamento/edição durante essa leitura, preferência concorrente, mudança de ação durante geração, ausência de controles técnicos no editor/configurações, quatro modelos/nove ações e migração do interruptor removido. As suites anteriores continuam cobrindo saída técnica, quotas, APIs ausentes, streaming, sessões, cancelamento e aplicação.

## Chrome real e alternativas locais

Executado `npm.cmd run test:step15f:browser`, após build, em perfis dedicados com cache preparado. Chrome instalado **154.0.8037.93** para IA nativa; Chrome for Testing **154.0.8037.0** para Llama e Gemma em WebGPU real. Mesmo equipamento das validações D/E: RTX 4060 Laptop, i9-13980HX e 16 GB de RAM. Downloads de pesos não foram repetidos.

| Verificação                                                 | Chrome Prompt | Llama 3B | Gemma 4 E2B |
| ----------------------------------------------------------- | ------------- | -------- | ----------- |
| Migração v6 → v7 e retirada do interruptor de português     | Passou        | Passou   | Passou      |
| Configurações a 360 px, tema escuro, sem controles técnicos | Passou        | Passou   | Passou      |
| Quatro modelos selecionados por teclado nas configurações   | Passou        | Passou   | Passou      |
| Um clique em IA executa Corrigir, sem menu intermediário    | Passou        | Passou   | Passou      |
| Alterar a ação salva para Conciso e executar por um clique  | Passou        | Passou   | Passou      |
| Inferência offline, Copiar e rascunho preservado            | Passou        | Passou   | Passou      |
| Substituir explicitamente e Ctrl+Z restaurar original       | Passou        | Passou   | Passou      |
| Edição durante o pedido impede aplicação de resposta antiga | Passou        | Passou   | Passou      |
| Storage somente com preferências; zero erros de página      | Passou        | Passou   | Passou      |

O Chrome devolveu “Fazendo o teste da extensão pra ver se funciona de verdade.” para a frase sintética fornecida pelo usuário, sem opção manual de idioma. Gemma usou “para”; Llama ainda produziu “à para” na correção e acrescentou um emoji na ação Conciso apesar da preferência. Essas limitações do modelo permanecem visíveis para revisão; a etapa não alterou prompts nem demonstrou ganho de qualidade ou latência. As recomendações D continuam históricas.

Fixtures locais em origem WhatsApp, sem autenticação, conversa real ou envio. Observador CDP no offscreen e Workers: Chrome sem requisições; Llama com cinco GETs de executáveis locais; Gemma com quatro. Sem corpos enviados, eventos de console ou exceções observados. Storage sem rascunhos. Essa observação se restringe aos contextos da extensão, não constitui auditoria de toda a rede do navegador.

## Evidências e reprodução

[Chrome](evidencias/step15f/chrome.json), [Llama](evidencias/step15f/webllm.json), [Gemma](evidencias/step15f/gemma.json), [checks](evidencias/step15f/checks.json) e [SHA-256](evidencias/step15f/SHA256SUMS.json). Nove capturas sintéticas registram configurações recolhidas, modelos expandidos e sugestão; duas capturas adicionais registram o popup real antes/depois. Exemplos: [configurações](evidencias/step15f/chrome-settings.png), [modelos](evidencias/step15f/gemma-models.png), [sugestão](evidencias/step15f/chrome-preview.png).

Harness: `tests/browser/step15f-interface.mjs`. Definir STEP15F_CHROME com o executável, STEP15F_ENGINE como chrome/webllm/gemma e STEP15F_REGULAR=1 para Chrome instalado. Perfis padrão dedicados dentro de .cache: step15b-chrome, step15-isolated e step15c-chrome. STEP15F_PROFILE aceita apenas um nome simples nesse diretório. Requer os modelos já preparados; não manipula perfis pessoais nem artefatos administrados pelo Chrome. Roteiros antigos são reproduzidos nos commits das respectivas etapas.

Uma tentativa adicional de Llama excedeu 240 s aguardando a primeira sugestão, sem resultado. A causa não foi isolada; a nova execução passou, sem download. A tentativa está registrada em [attempts.json](evidencias/step15f/attempts.json), sem convertê-la em incompatibilidade. O roteiro passa a registrar erros/download requerido imediatamente e preservar evidência sintética da falha.

Preservação de evidências históricas confirmada por SHA-256: **65 arquivos D, 11 C e sete E**, sem alterações.

## Limites e encerramento

Não foram repetidos downloads grandes, campanhas de benchmark, idle de cinco minutos, instalação limpa ou testes em conversa real. As alterações deste ajuste foram verificadas com inferência real em fixtures e suites acumuladas; a **STEP-16 permanece Pendente** para a validação final, incluindo WhatsApp real, instalação limpa, auditoria e documentação de distribuição. Outros equipamentos, variantes sem shader-f16 e versões de navegador não foram certificados nesta etapa.

Commit próprio: `feat(step-15-f): simplificar interface e executar ação configurada`, com identidade humana configurada; hash no histórico Git e relato de entrega. Sem push.
