# Publicar na Chrome Web Store

[README](../README.md) · [Instalação](INSTALACAO.md) · [Privacidade](PRIVACIDADE.md) · [Validação](VALIDACAO-STEP-16.md)

Roteiro conferido na documentação oficial em **05/10/2026**. A versão local é 0.16.4. Nenhum item foi enviado à loja por este trabalho.

## 1. Concluir a conferência do produto

Instale o pacote local e teste na conversa autorizada @gabrielrguarini, sem enviar mensagens: correção/substituição direta, tooltip, Ctrl+Z, prévia/Copiar/Substituir e cancelamento por Escape, edição ou troca de conversa. Confira preparo explícito, erros e atualização das configurações. Registre somente procedimento/resultado; não publique capturas de conversas reais.

Essa validação final continua pendente em [PROGRESSO.md](PROGRESSO.md). Chrome, Llama e Gemma passaram nas fixtures com inferência real/offline, mas isso não substitui o WhatsApp autenticado. O Chrome recomenda testar localmente antes de carregar a versão para análise. [Preparação oficial](https://developer.chrome.com/docs/webstore/prepare).

## 2. Registrar a conta de desenvolvedor

Entre no [Developer Dashboard](https://chrome.google.com/webstore/devconsole) com a conta Google que será proprietária da extensão. Aceite os termos, pague a taxa única de registro indicada no painel e complete os dados de contato. Ative verificação em duas etapas; ela é obrigatória para publicar/atualizar. Confira também os dados de identificação/status comercial solicitados para os países onde distribuirá. [Registro](https://developer.chrome.com/docs/webstore/register) · [Configuração da conta](https://developer.chrome.com/docs/webstore/set-up-account) · [Verificação em duas etapas](https://developer.chrome.com/docs/webstore/program-policies/two-step-verification).

## 3. Gerar e conferir o ZIP

Na raiz do projeto:

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd run package
```

O resultado é **release/ia-local-whatsapp-0.16.4.zip**. O script inclui apenas o produto e confere os hashes de todos os arquivos dentro do ZIP. O Manifest fica na raiz; ícones PNG 16/32/48/128 e licenças acompanham o pacote. O inventário SHA-256 fica ao lado.

Não envie o repositório nem dist.crx/dist.pem. A chave PEM deve permanecer privada e fora do Git. A loja recebe o ZIP; pesos, perfis de teste, node_modules, caches, simulações e páginas de diagnóstico ficam de fora. WASM/JS locais são executáveis necessários e permanecem. [Formato do pacote](https://developer.chrome.com/docs/webstore/prepare#zip-your-extension-files).

## 4. Preparar a apresentação

Use **IA local — WhatsApp Web** e a descrição curta do Manifest. A descrição completa deve explicar função, nove ações, substituição direta/prévia opcional, preparo local e requisitos de hardware. Não prometa precisão universal, qualquer equipamento ou vínculo oficial com WhatsApp/Google.

| Material                   | Arquivo/formato                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| Ícone                      | assets/icons/icon-128.png, já incluído no ZIP                                                        |
| Imagem promocional pequena | 440 × 280, PNG/JPEG; criar com a identidade do projeto                                               |
| Capturas                   | [Um print pronto](../assets/store/screenshot-1280x800.png): 1280 × 800, PNG RGB de 24 bits, sem alfa |
| Suporte                    | URL pública de um canal/repositório que você acompanha                                               |
| Privacidade                | URL pública do documento preparado no passo 5                                                        |

Foi preparado somente um print para a loja, conforme solicitado: configurações reais da extensão em um perfil isolado do Chrome for Testing, com identidade visual e descrição dos recursos. Não inclui conversas, dados pessoais ou resultados de IA simulados. O arquivo está em assets/store/screenshot-1280x800.png. As evidências internas têm tamanhos variados; não envie automaticamente toda a pasta de testes. Imagens devem representar a funcionalidade disponível. [Especificações oficiais](https://developer.chrome.com/docs/webstore/images).

Descrição sugerida:

> Corrija e reescreva rascunhos em português do Brasil no WhatsApp Web. Clique em IA para aplicar a ação definida nas configurações; o padrão corrige e substitui o texto, com tooltip durante o processamento. Prefere conferir antes? Escolha Revisar sugestão e use Copiar ou Substituir. A extensão processa localmente, permite cancelar e desfazer, e nunca envia mensagens. A IA do Chrome depende de disponibilidade; modelos locais alternativos exigem WebGPU e download explícito. A qualidade varia: confira o texto antes de enviar.

## 5. Publicar a política de privacidade

A [política pública](https://ia-local-whatsapp-privacidade.gabrielrguarini.chatgpt.site) já está publicada, sem login, e corresponde a [PRIVACIDADE.md](PRIVACIDADE.md). Use essa URL no campo de privacidade da loja. Acesso HTTPS sem cookies conferido em 05/10/2026: HTTP 200, texto e contato presentes. O contato é gabrielrguarini@gmail.com. [Fonte e manutenção da página](site-privacidade/README.md).

O cadastro da loja foi preenchido e salvo em 05/10/2026, com descrição, categoria Ferramentas, português (Brasil), ícone, uma captura, propósito, justificativas de permissões, ausência de código remoto e declarações de dados. O e-mail do editor aparece como verificado. Após o preenchimento, o painel passou a mostrar **Revisão pendente**, com campos bloqueados, aguardando análise do Google. A extensão ainda não consta como publicada; a validação final do WhatsApp permanece pendente.

A extensão trata rascunhos mesmo sem transmiti-los ao desenvolvedor. O Chrome exige divulgação do tratamento local e política de privacidade para produtos que tratam dados de usuário; não declare ausência de tratamento apenas porque a IA é local. [FAQ oficial de dados](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).

## 6. Criar o item e preencher a ficha

No Dashboard, escolha **Add new item / Novo item**, selecione o ZIP e aguarde a validação. Preencha **Store listing / Página da loja**: idioma pt-BR, descrição, categoria adequada à escrita, ícone, imagem promocional, capturas e URLs. Revise os campos do Manifest antes: corrigi-los exige novo pacote. [Fluxo oficial](https://developer.chrome.com/docs/webstore/publish).

## 7. Declarar privacidade e permissões

Em **Privacy practices / Práticas de privacidade**, descreva uma única finalidade:

> Corrigir e reescrever o rascunho solicitado no WhatsApp Web, com processamento local e substituição direta autorizada pelo clique ou revisão opcional.

| Permissão/origem | Justificativa correspondente ao Manifest                                                  |
| ---------------- | ----------------------------------------------------------------------------------------- |
| storage          | Guardar apenas preferências de escrita, tema, modelo e modo direto/prévia                 |
| offscreen        | Hospedar IA nativa e Workers locais, mantendo geração/cancelamento independentes do popup |
| sidePanel        | Exibir configurações e preparar downloads em um painel visível após ação do usuário       |
| web.whatsapp.com | Detectar o editor e ler/substituir somente o rascunho solicitado, sem envio               |
| huggingface.co   | Baixar arquivos públicos dos modelos registrados, com ação explícita                      |
| us.aws.cdn.hf.co | Receber artefatos do CDN usado por esses downloads                                        |

Declare **sem código remoto**: JS/WASM acompanham o ZIP; downloads são dados de modelos em versões fixas. Não há provedor remoto de IA. Explique essa separação nas notas de análise. [Código remoto em MV3](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code).

Declare os tipos pertinentes ao acesso local ao rascunho, como **Comunicações pessoais** e **Conteúdo de sites**, explicando que são usados somente para escrever, sem persistência ou envio ao desenvolvedor. Revise a redação atual dos campos antes de certificar. Não marque “nenhum dado” como consequência automática do processamento local. Não declare leitura de histórico, credenciais ou contatos, que o código não realiza.

Insira a URL da política e certifique uso limitado somente se as declarações correspondem à extensão enviada. Não há venda, publicidade, treinamento pelo desenvolvedor ou avaliação de crédito. [Campos oficiais de privacidade](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy).

## 8. Informar distribuição e teste

Em **Distribution / Distribuição**, escolha preço, países e visibilidade: público, não listado ou a opção privada disponível na conta. Em **Test instructions / Instruções de teste**, explique o fluxo sem fornecer sua senha ou sessão pessoal:

> Abrir o WhatsApp Web autenticado com uma conta própria de teste. Preparar uma IA local nas configurações; Chrome nativo pode não estar disponível no ambiente de análise. Criar um rascunho sintético, clicar em IA, conferir tooltip/substituição e Ctrl+Z. Selecionar Revisar sugestão para Copiar/Substituir. A extensão não envia mensagens. Modelos locais exigem WebGPU e armazenamento; a primeira carga pode levar minutos. Rascunhos estruturados/multilinha usam cópia. Nenhuma chave de serviço de IA é necessária.

Explique preparo da alternativa e tamanhos exibidos. A disponibilidade nativa não deve ser a única forma de reproduzir a função no ambiente de análise. [Campos de envio e teste](https://developer.chrome.com/docs/webstore/publish#fill-out-information-about-your-item).

## 9. Enviar para análise e publicar

Após a conferência real e preenchimento dos campos, clique **Submit for Review / Enviar para análise**. Para controlar o lançamento, desmarque publicação automática após aprovação. Acompanhe status e e-mails; o prazo de análise varia. Se houver rejeição, corrija a causa e envie uma versão superior. Na publicação adiada, observe o prazo para publicar exibido no painel. [Análise e publicação adiada](https://developer.chrome.com/docs/webstore/publish#submit-your-item).

Após publicar, adicione o link real da loja ao README e teste uma instalação pela loja com rascunho sintético. Não use link ou selo de publicação antes de o item existir.

## Atualizações

Mantenha o mesmo item. Aumente a versão em package.json, package-lock.json e manifest.json; gere/verifique novo ZIP; carregue o novo pacote no item existente. Revise privacidade e apresentação se o comportamento mudar. Nunca envie chave PEM, cache ou pesos. [Atualizar um item](https://developer.chrome.com/docs/webstore/update).

Este roteiro usa o envio ZIP comum. Se você optar pelo recurso **Verified CRX Uploads** para proteger atualizações, a loja exigirá atualizações CRX assinadas com sua chave; a chave privada continua fora do envio e do repositório. Configure essa opção somente depois de definir como guardar/recuperar a chave. [Atualizações verificadas](https://developer.chrome.com/docs/webstore/update#protect-your-package-updates).
