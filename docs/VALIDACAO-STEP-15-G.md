# Validação STEP-15-G — Idioma de saída na Prompt API

[Plano](PLANO.md) · [Progresso](PROGRESSO.md) · [Etapa](steps/STEP-15-G.md)

## Correção em 02/10/2026

Pacote/Manifest/lockfile **0.15.6**, dependências exatas preservadas, preferências v7 sem alteração. A compatibilidade automática de português passa a declarar expectedOutputs com en, manter entrada textual sem idioma declarado e solicitar português brasileiro na instrução de sistema. O usuário autorizou essa abordagem após verificação; substitui a omissão de saída B/F e a restrição anterior à declaração en. Não foi incorporado provedor remoto.

O seletor continua preferindo idioma real/API especializada quando prontos. Consulta, preparação visível e criação no offscreen recebem a mesma configuração. Se a configuração de compatibilidade estiver indisponível ou a inicialização falhar, selecionar a alternativa local antes de gerar. Sem download silencioso, repetição de geração, tradução intermediária ou alteração do idioma do rascunho. Interface e aplicação manual permanecem como na F.

## Diagnóstico reproduzido

No Chrome instalado **154.0.8037.93**, em perfil dedicado step15b-chrome e cache preparado:

| Configuração de entrada/saída                        | Disponibilidade               |
| ---------------------------------------------------- | ----------------------------- |
| Inglês declarado                                     | available                     |
| pt declarado                                         | unavailable                   |
| pt-BR declarado                                      | unavailable                   |
| Sem declarações, sistema solicitando pt-BR           | available, com aviso ao criar |
| Entrada textual, saída en, sistema solicitando pt-BR | available, sem o aviso        |

O aviso relatado foi reproduzido como **warning** no domínio **Log do Chrome**, ao criar a configuração antiga. Não era exceção de inferência. A observação anterior de console JavaScript vazio não cobria esses logs nativos; o roteiro agora observa os dois domínios. Nenhum log do navegador foi suprimido.

Referência consultada: [Prompt API — expected inputs/outputs](https://developer.chrome.com/docs/ai/prompt-api#add_expected_input_and_output). A documentação lista en, ja, es, de e fr; pt-BR por instrução continua uma capacidade empírica dessa versão. Declarar en não comprova suporte formal ou atestação de segurança para português.

## Experimento antes da implementação

Após autorização, comparar 12 fixtures sintéticas nas nove ações, um clone por pedido, entre configuração en e configuração antiga sem idiomas. **24/24 respostas legíveis em português**. O candidato en devolveu exatamente “Fazendo o teste da extensão pra ver se funciona de verdade.” para a frase fornecida. Não houve exceção de inferência. O experimento registrou o aviso antigo; a validação isolada do candidato não o registrou.

Nomes Ana/Bruno, quantidade 2, data 12/10, valor R$ 125,50, negação e condição foram mantidos nos respectivos exemplos. Há limitações: pedidos de tom profissional podem ficar informais, novos emojis apareceram apesar da preferência e Engraçado não acrescentou humor nesse exemplo. Não afirmar correção universal, segurança atestada ou ganho de desempenho. A amostra não substitui as campanhas reservadas D; prompts e parâmetros de geração do produto não foram otimizados nesta correção.

## Validação do pacote atualizado

`npm.cmd run check` aprovado: TypeScript strict, ESLint sem avisos, formatação, **274 testes em 40 arquivos** e build MV3 instalável. Os dois testes novos cobrem saída declarada nas ações Prompt e configuração recusada sem criar sessão sem idioma. A regressão existente verifica opções iguais em availability/create, instrução pt-BR, clone/liberação e seleção anterior à única geração, incluindo alternativa local.

`npm.cmd run test:step15g:browser`, Chrome 154.0.8037.93, cache já preparado, inferência offline, sem novo download:

- Controle inglês gerou “You can check the text.”, com saída en declarada, clone/base liberados e sem aviso.
- Novo ensaio de 12 fixtures/nove ações com a configuração en produziu português em todos os casos. A frase relatada voltou a receber a correção exata com “pra”. Doze clones e sessão-base destruídos.
- Produto real no documento offscreen: nove ações disponíveis pela compatibilidade, Corrigir e Conciso executados pelo botão IA, cópia, substituição/Ctrl+Z, cancelamento por edição e preferências v7 preservadas. Rascunho intacto antes da escolha. A correção no produto usou “para”, equivalente neste exemplo. A ação Conciso ainda apresentou reformulação informal, registrada para revisão.
- **Zero avisos de idioma de saída ausente** nos logs nativos observados das configurações/offscreen; zero eventos de console, erros de página ou exceções observadas. Sessão nativa pronta após o pedido, nenhum Worker de modelo próprio nem requisição de rede no contexto observado do offscreen. Storage somente com preferências.

Fixtures locais na origem WhatsApp, sem autenticação, conversa real ou envio. A observação de rede limita-se aos contextos da extensão; não é auditoria global do navegador. O ensaio inglês/português ocorreu no documento visível, além do fluxo real de produto no offscreen.

## Evidências e reprodução

[Reprodução do aviso](evidencias/step15g/language-probe.json) · [Experimento comparativo](evidencias/step15g/en-experiment.json) · [Validação dos idiomas](evidencias/step15g/language-corrected.json) · [Produto no offscreen](evidencias/step15g/chrome.json) · [Checks](evidencias/step15g/checks.json) · [SHA-256](evidencias/step15g/SHA256SUMS.json). Capturas sintéticas: [configurações](evidencias/step15g/chrome-settings.png), [modelos](evidencias/step15g/chrome-models.png) e [sugestão](evidencias/step15g/chrome-preview.png).

Definir STEP15G_CHROME com o executável do Chrome instalado e executar npm.cmd run test:step15g:browser após build. O roteiro usa apenas .cache/step15b-chrome, exige o cache nativo preparado e não baixa modelos. Testa idiomas/controle/12 fixtures e reutiliza o roteiro F com saída em .cache/step15g e observação adicional de Log. Os modelos e perfis pessoais não são alterados. Dados/evidências C/D/E/F preservados por conferência SHA-256.

## Encerramento

Correção validada nessa versão de Chrome/equipamento. Não repetidos benchmarks, downloads, instalação limpa ou WhatsApp real, pois o ajuste está restrito às opções da API nativa. **STEP-16 Pendente**, incluindo instalação limpa, auditoria e validação final no WhatsApp. Outras versões/configurações poderão recusar a compatibilidade e seguirão para a alternativa local antes da geração.

Commit próprio: fix(step-15-g): declarar idioma de saída na Prompt API, identidade humana configurada; hash no histórico Git e relato final. Sem push.
