# Política de privacidade — IA local para WhatsApp Web

Última atualização: **08/10/2026**. Aplica-se à versão 0.16.2.

## Finalidade e acesso ao texto

A extensão corrige e reescreve rascunhos no WhatsApp Web. Ao clicar em IA, você solicita que o rascunho atual seja processado neste computador. No modo direto, esse clique também autoriza substituir o texto conforme a resposta chega. A prévia opcional permite copiar ou substituir depois de conferir a sugestão. A extensão nunca envia mensagens.

O texto pode conter comunicações pessoais e outros dados fornecidos por você. Somente o rascunho solicitado e sua sugestão são usados para a função de escrita. Fora desse texto, a extensão não acessa histórico, mensagens recebidas, lista de contatos, números de telefone, credenciais ou cookies de autenticação. Dados que você incluir no próprio rascunho fazem parte do processamento local solicitado. A detecção do editor verifica estrutura e estado, sem coletar conteúdo das conversas.

## Processamento e retenção

Rascunho, instruções e resposta são processados localmente pela IA do Chrome ou por um modelo local selecionado. Não são enviados a um servidor de IA ou ao desenvolvedor. Permanecem temporariamente em memória durante o pedido/prévia, incluindo o original para recuperação em caso de falha ou cancelamento do streaming. São descartados pelo ciclo de vida da extensão; não ficam gravados em logs ou armazenamento persistente. A extensão não persiste hashes ou identificadores derivados das mensagens.

O navegador guarda preferências como ação, modelo, tema e modo direto/prévia. Também guarda os arquivos públicos dos modelos e recibos de integridade desses arquivos. Recibos identificam artefatos, não mensagens. Não há analytics, telemetria, publicidade direcionada ou venda de dados.

## Downloads e serviços do navegador

Preparar um modelo exige uma ação explícita e conexão à internet. A extensão baixa artefatos públicos de huggingface.co e us.aws.cdn.hf.co, em versões registradas no catálogo. Esses servidores recebem os dados técnicos necessários à conexão, como endereço IP e informações de requisição. A extensão não inclui seus rascunhos nessas requisições. JavaScript e WASM executáveis acompanham o pacote instalado.

Os modelos nativos são administrados pelo Chrome, incluindo preparação, armazenamento e liberação. O navegador e o WhatsApp mantêm suas próprias práticas de rede e privacidade, independentes desta extensão. O processamento local preparado pode funcionar offline; o funcionamento do WhatsApp depende da própria conexão.

## Cópia, controle e remoção

Copiar transfere a sugestão para a área de transferência somente após seu clique. A extensão não lê a área de transferência. O sistema e outros aplicativos podem acessar seu conteúdo conforme suas próprias configurações.

Você pode cancelar um pedido, desfazer a substituição com Ctrl+Z, escolher revisão por prévia, liberar memória e remover o download do modelo selecionado nas configurações. Liberar memória conserva os arquivos baixados. Remover download apaga somente os artefatos próprios do modelo/variante escolhido; os modelos nativos são controlados pelo Chrome. Desinstalar a extensão ou limpar seus dados no navegador remove os dados próprios conforme as regras do Chrome.

## Uso limitado e contato

O acesso ao rascunho é limitado à função de escrita solicitada. Não há uso para venda, publicidade, criação de perfis, treinamento pelo desenvolvedor ou decisões sobre crédito. Mudanças nas práticas serão refletidas nesta política e na descrição da extensão.

Para dúvidas, escreva para [gabrielrguarini@gmail.com](mailto:gabrielrguarini@gmail.com). Relate problemas com exemplos sintéticos; não envie conversas ou credenciais. Consulte o [guia de uso](INSTALACAO.md) e o [README](../README.md).
