# IA local para WhatsApp Web

![Ícone da IA local para WhatsApp Web](assets/icons/icon-128.png)

Corrija e reescreva seus rascunhos em português do Brasil, diretamente no WhatsApp Web. A IA funciona no computador e a extensão nunca envia a mensagem por você.

**Versão 0.16.5 · Chrome · Manifest V3**

## Como funciona

1. Escreva uma mensagem no WhatsApp Web.
2. Clique em **IA** ao lado do campo de mensagem.
3. Aguarde **Carregando IA**. A resposta substitui o campo aos poucos, com **Escrevendo…** durante o streaming, inclusive em textos com várias linhas.
4. Confira o resultado e envie quando quiser. **Ctrl+Z** usa o histórico de edição do campo.

O primeiro trecho substitui tudo que estiver digitado naquele momento. Depois, os novos trechos são acrescentados ao final, preservando alterações nos trechos recebidos. O cursor pode ir ao final a cada trecho; aguarde a conclusão para editar com conforto. Se houver falha ou cancelamento, o original é recuperado automaticamente quando não houve edição humana; caso contrário, você pode escolher **Restaurar original** ou **Manter edição**.

Prefere revisar antes? Nas configurações da extensão, selecione **Ao clicar em IA → Revisar sugestão**. A prévia oferece **Copiar** e **Substituir**.

## Recursos

- Nove ações: Corrigir, Melhorar, Formal, Profissional, Amigável, Natural, Conciso, Engraçado e Reescrever.
- Escolha **IA Nativa** ou **Modelo** no início das configurações. A lista de modelos aparece ao selecionar Modelo.
- Configurações organizadas em Inteligência artificial, Como escrever e Aparência.
- IA do Chrome preferencial quando disponível; Llama, Qwen e Gemma como opções locais.
- Downloads explícitos, cancelamento e uso offline após preparar o modelo.
- Proteção contra aplicação em outra conversa ou campo; no modo direto, edições do texto recebido são preservadas.
- Streaming direto com várias linhas e emojis. Menções estruturadas e formatação especial continuam disponíveis para cópia pela prévia opcional.

A IA pode alterar conteúdo ou produzir sugestões inadequadas. Confira o rascunho antes de enviar. A qualidade e o tempo de resposta variam por ação, modelo e equipamento.

## Instalação

A versão atual pode ser instalada localmente. O [guia de instalação](docs/INSTALACAO.md) explica preparo da IA, atualização e solução de problemas. O [roteiro de publicação](docs/PUBLICACAO-CHROME-WEB-STORE.md) contém os passos para disponibilizá-la na Chrome Web Store.

Para gerar o pacote a partir do código, use Node.js 22.13+ na linha 22, ou versão compatível 24/26+, e npm 10.9.2+:

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd run package
```

Abra `chrome://extensions`, habilite **Modo do desenvolvedor** e escolha **Carregar sem compactação → release/ia-local-whatsapp-0.16.5**. Recarregue o WhatsApp Web. Não instale simultaneamente as pastas dist e release.

O pacote também gera **release/ia-local-whatsapp-0.16.5.zip**, com Manifest na raiz e inventário SHA-256. Pesos dos modelos são baixados pelo fluxo explícito da extensão; não acompanham o ZIP.

## Requisitos

Chrome com suporte às APIs utilizadas e armazenamento disponível para os modelos. A IA nativa depende da versão/distribuição do navegador e do equipamento; modelos locais baixados exigem WebGPU. Se a IA do Chrome não estiver pronta, prepare uma alternativa local nas configurações.

O português brasileiro é solicitado ao modelo. O Chrome testado utiliza a compatibilidade por instrução documentada no [guia](docs/INSTALACAO.md#modelos-e-idioma); não há interruptor de idioma. A primeira carga de um modelo pode levar minutos. Veja [versões, hardware e resultados verificados](docs/VALIDACAO-STEP-16.md).

## Privacidade

A extensão acessa somente o rascunho solicitado, processa o texto localmente e não lê histórico, contatos ou mensagens recebidas. Preferências e artefatos dos modelos ficam no navegador; rascunhos, prompts e respostas não são persistidos. Downloads dos modelos exigem conexão; inferência preparada pode funcionar offline.

Não há envio automático, telemetria ou provedor remoto de IA. **Copiar** utiliza a área de transferência por sua escolha. Leia a [política de privacidade pública](https://ia-local-whatsapp-privacidade.gabrielrguarini.chatgpt.site) ou a [cópia no projeto](docs/PRIVACIDADE.md).

## Documentação e suporte

- [Instalação e operação](docs/INSTALACAO.md)
- [Publicação na Chrome Web Store](docs/PUBLICACAO-CHROME-WEB-STORE.md)
- [Desenvolvimento e arquitetura](docs/DESENVOLVIMENTO.md)
- [Comparação dos modelos](docs/VALIDACAO-STEP-15-D.md)
- [Validação e acompanhamento da entrega](docs/PROGRESSO.md)

Para relatar um problema, informe versão do Chrome/extensão, ação, modelo, modo direto/prévia e mensagem de erro. Use um exemplo sintético, sem conversas, contatos ou credenciais reais.

Este é um projeto independente, sem vínculo com WhatsApp, Meta ou Google. As licenças dos componentes e modelos estão em [NOTICE.txt](NOTICE.txt) e [licenses](licenses).
