# Validação STEP-15-E — Revisão e substituição pelo usuário

[Plano](PLANO.md) · [Progresso](PROGRESSO.md) · [Escopo E](steps/STEP-15-E.md)

## Ajuste solicitado

Em 02/10/2026, o usuário pediu a remoção da verificação de alterações antes da STEP-16. A frase sintética “fazendo o teste da extensao apra ver se funciona de verdade” recebia uma correção útil com indicação de possível erro. As comparações anteriores de entidades e intenção podiam gerar avisos indevidos, inclusive por capitalização, conforme a [avaliação D](VALIDACAO-STEP-15-D.md).

O pacote **0.15.4** apresenta respostas legíveis para revisão pelo usuário, com **Copiar**, **Substituir** e **Cancelar**. Não avalia mudanças de conteúdo nem indica aprovação, risco ou equivalência. Removeu os avisos de conteúdo, o botão Analisar sentido, a preferência de revisão semântica e seus pedidos/resultados no protocolo. Preferências **v6** descartam o campo antigo, preservando motor, modelo, perfil e demais escolhas válidas.

O resultado comum contém texto, identidade do motor e somente a indicação de resposta idêntica. O executor compartilhado Chrome/WebLLM/Gemma usa validação técnica de vazio, caracteres inválidos e tamanho. Limites de contexto, quotas e resposta truncada continuam tratados pelos adaptadores. Os prompts e modelos de escrita não foram alterados. Há uma geração por pedido, sem retry ou troca após falha. Não foi realizado novo benchmark de latência ou qualidade; a remoção da avaliação não comprova melhora na precisão do modelo.

Cancelamento, desconexão, eventos atrasados e alteração do rascunho continuam impedindo aplicação. A extensão permanece sem envio automático. Multilinha e estruturas especiais continuam somente para cópia. Os avaliadores e contratos internos de análise usados no benchmark histórico permanecem nas fontes, sem chamada pelo fluxo do produto; os relatórios e evidências A–D não foram modificados.

## Verificações automatizadas

`npm.cmd run check` aprovado: TypeScript strict, ESLint sem avisos, Prettier, **265 testes em 39 arquivos** e build Manifest V3. Os testes pertinentes cobrem:

- A frase e a resposta exatas fornecidas pelo usuário, sem avaliação ou avisos, com cópia/substituição disponíveis.
- Respostas legíveis com troca de nomes, valores e negação, oferecidas para decisão do usuário sem julgamento automático.
- Resposta idêntica com Sem alterações; vazio, caracteres invisíveis isolados, Unicode inválido e excesso de tamanho como falhas técnicas.
- Uma geração por pedido, cancelamento e exclusão de resultados obsoletos.
- Migração v1–v5, preservação das escolhas v5/v6, persistência somente das preferências e rejeição da preferência/pedidos de análise removidos.
- Ausência dos rótulos e avisos de conteúdo removidos nos executáveis de produção.

Tipos, lint e formatação identificaram ajustes necessários nos testes durante a implementação; foram corrigidos antes do check final. Não houve falha nos três ensaios reais finais.

## Chrome e inferência reais

Windows 10.0.26200, Intel i9-13980HX, aproximadamente 16 GB de RAM, RTX 4060 Laptop/8.188 MiB e driver 555.97, mesmo equipamento registrado na D. Node 22.14.0/npm 10.9.2. Ensaios em perfis de teste dedicados, com modelos previamente preparados, pacote carregado sem servidor de desenvolvimento e rede offline durante inferência.

| Candidato                                        | Navegador                       | Resposta real à frase sintética                                |
| ------------------------------------------------ | ------------------------------- | -------------------------------------------------------------- |
| Chrome Prompt, português por prompt experimental | Chrome instalado 154.0.8037.93  | Fazendo o teste da extensão pra ver se funciona de verdade.    |
| Llama 3.2 3B, WebLLM/q4f16_1                     | Chrome for Testing 154.0.8037.0 | fazendo o teste da extensão, à para ver se funciona de verdade |
| Gemma 4 E2B, Transformers.js/q4f16               | Chrome for Testing 154.0.8037.0 | Fazendo o teste da extensão para ver se funciona de verdade.   |

Chrome reproduziu exatamente a correção relatada pelo usuário. A saída do Llama contém um trecho inadequado; este ajuste deixa a avaliação para o usuário e não certifica a resposta. A amostra confirma o funcionamento do fluxo, sem substituir o benchmark D ou comprovar qualidade geral.

Nos **três** ensaios passaram migração real de v5 com análise ligada para v6 sem o campo, prévia sem avisos, cópia pelo clique com conteúdo conferido na área de transferência, rascunho preservado antes da escolha, substituição pelo clique sem confirmação adicional, Ctrl+Z e bloqueio depois de editar o rascunho durante outro pedido. Nenhuma mensagem enviada, autenticação ou conversa real acessada; a página era uma fixture controlada.

A instrumentação CDP de teste observou os Workers próprios e seus executáveis locais: cinco requisições GET no WebLLM e quatro no Gemma, sem dados de corpo, todas na origem da extensão. No ensaio nativo, não registrou requisições do contexto observado. Zero eventos de console, erros de página ou erros do observador. Storage local continha somente writingPreferences v6, sem os textos sintéticos. Isso não é uma auditoria de todo o tráfego do Chrome/sistema operacional; a auditoria final acumulada e o WhatsApp real pertencem à STEP-16.

## Evidências e reprodução

Resultados e capturas exclusivamente sintéticos: [Chrome](evidencias/step15e/chrome.json), [WebLLM](evidencias/step15e/webllm.json), [Gemma](evidencias/step15e/gemma.json), [prévia Chrome](evidencias/step15e/chrome-preview.png), [hashes](evidencias/step15e/SHA256SUMS.json). O [harness](../tests/browser/step15e-manual-review.mjs) foi executado pelo comando test:step15e:browser; usa somente perfis de teste em .cache. Não requer contato no WhatsApp.

```powershell
$env:STEP15E_CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
$env:STEP15E_ENGINE = 'chrome'
$env:STEP15E_REGULAR = '1'
npm.cmd run test:step15e:browser
```

Para WebLLM/Gemma, definir STEP15E_CHROME com o Chrome for Testing disponível, remover STEP15E_REGULAR e escolher STEP15E_ENGINE=webllm ou gemma. Os perfis padrão são step15-isolated e step15c-chrome, respectivamente; STEP15E_PROFILE permite outro nome de perfil dedicado já preparado. O ensaio não baixa modelos automaticamente. Português por prompt é habilitado somente no perfil de teste nativo; o padrão do produto continua desligado. Roteiros históricos anteriores à E devem ser reproduzidos no commit da etapa correspondente.

Para conferir o produto atualizado, recarregar a extensão em chrome://extensions a partir de dist e recarregar a aba do WhatsApp. Pedir Corrigir, revisar a prévia e escolher Copiar/Substituir. Os arquivos de código, configuração, testes, documentação e evidências deste ajuste serão registrados em commit próprio; dist, caches e pesos ficam fora do Git. A **STEP-16 permanece pendente**.
