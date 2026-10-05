# Instalação e uso — IA local para WhatsApp

[README](../README.md) · [Validação final](VALIDACAO-STEP-16.md) · [Progresso](PROGRESSO.md)

## Pacote local

Versão **0.16.0**. Na pasta do projeto, execute `npm.cmd ci`, `npm.cmd run check` e `npm.cmd run package`. O último comando gera **release/ia-local-whatsapp-0.16.0**, ZIP com Manifest na raiz e inventário SHA-256. A geração substitui somente os artefatos dessa versão. Não inclui node_modules, caches, pesos baixados, testes, páginas de desenvolvimento, CRX, chaves PEM ou conversas. O [guia da Chrome Web Store](PUBLICACAO-CHROME-WEB-STORE.md) explica a publicação pelo usuário.

Em chrome://extensions, habilite **Modo do desenvolvedor**, clique **Carregar sem compactação** e selecione a pasta release/ia-local-whatsapp-0.16.0, que contém manifest.json. Fixe o ícone da extensão se desejar. Abra/recarregue o WhatsApp Web e as configurações. O pacote dispensa um servidor local. [Procedimento oficial do Chrome](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-an-unpacked-extension).

Não carregue dist e release simultaneamente: duas instalações podem criar dois botões. Para atualizar uma instalação existente de dist, mantenha essa mesma pasta e use `npm.cmd run build`; em chrome://extensions, clique **Recarregar** na extensão e recarregue as abas do WhatsApp. Mudar a pasta de instalação pode mudar o identificador da extensão, suas preferências e acesso ao cache próprio. Não remova uma instalação antes de decidir se precisará do cache já baixado.

O pacote final foi instalado em perfil novo de teste, com preferências padrão e sem modelos próprios em cache. A validação no WhatsApp autenticado deve estar registrada como aprovada no relatório antes de considerar a STEP-16 concluída. O pacote é local; não há publicação na loja nem atualização automática dos arquivos da extensão.

## Preparar a IA

**IA e modelos → Automática** prefere a IA do Chrome quando pronta para a ação e idioma. Abra o painel lateral e use **Preparar IA** se oferecido. O navegador verifica requisitos, administra seus próprios downloads e pode usar CPU. Não é possível selecionar ou apagar seus pesos pelos controles dos modelos próprios da extensão.

Se o caminho nativo não estiver pronto, a extensão usa o modelo local selecionado antes de gerar. Escolha Llama, Qwen ou Gemma em **IA e modelos**, abra o painel lateral e use **Baixar modelo**. O tamanho máximo aparece antes do clique; acompanhe o progresso ou cancele. Pesos válidos em cache são reutilizados, e a preparação confere integridade. Não há download silencioso. Falta de espaço, rede ou artefato inválido preserva o rascunho; nova tentativa exige uma nova ação do usuário.

Depois da preparação, a inferência pode funcionar sem rede. O WhatsApp continua dependendo da própria conexão. Limpeza/evicção de armazenamento, políticas do navegador ou **Remover download** podem exigir novo preparo. Os arquivos do pacote não incluem os gigabytes de pesos.

## Escrever

O padrão é **Corrigir** e **Substituir diretamente**. Escreva e clique **IA**: durante preparação, geração e aplicação aparece **Carregando IA**. Somente o resultado final é aplicado; a extensão nunca envia a mensagem. **Ctrl+Z** desfaz. Um segundo clique em IA, **Escape** ou clique fora cancela; editar o rascunho/trocar de conversa também impede aplicar o resultado anterior. Uma saída idêntica indica **Sem alterações**. Erros aparecem no tooltip e preservam o rascunho.

Para o fluxo anterior, escolha **Ao clicar em IA → Revisar sugestão**. Confira a prévia e use **Copiar** ou **Substituir**, sem confirmação adicional. Texto com várias linhas, menções ou estruturas que a edição nativa não preserva fica somente para cópia. No modo direto, o tooltip orienta escolher a prévia nesses casos.

As configurações ficam no ícone da extensão/painel lateral: ação, comportamento, preservação de gírias, novos emojis, tema e escolha de modelo. Há nove ações; preservação de gírias e ausência de novos emojis são padrões. A migração v8 conserva as escolhas anteriores e adota substituição direta; a prévia exige seleção explícita.

## Modelos e idioma

Na máquina medida, **Chrome** foi a opção mais rápida e com maior utilidade em Corrigir, Melhorar e Reescrever; **Gemma** foi a alternativa local mais útil no conjunto geral. Formal/Natural/Conciso mostraram trocas entre utilidade e latência. Profissional/Amigável/Engraçado ainda não oferecem consistência satisfatória. Llama exige menos que os demais perfis WebGPU, mas teve qualidade inferior nessa avaliação; Qwen maior e o rótulo Qualidade não comprovam superioridade. [Resultados e recomendações D](VALIDACAO-STEP-15-D.md#recomendações-nesta-máquina).

Os prompts pedem português do Brasil. No Chrome testado, a declaração pt-BR foi recusada; a compatibilidade autorizada declara saída en e pede pt-BR no sistema. Respostas portuguesas foram verificadas em G e na entrega, sem o aviso de saída ausente. Isso não certifica suporte formal/atestação de segurança em português nem qualidade universal. Outras versões podem recusar e usar a alternativa local. [Referências](REFERENCIAS-IA-CHROME.md) · [Verificação G](VALIDACAO-STEP-15-G.md).

Ambiente verificado: Windows, Chrome 154.0.8037.93 e Chrome for Testing 154.0.8037.0, i9-13980HX, 16 GB RAM, RTX 4060 Laptop com shader-f16. Chrome 116 é o mínimo das APIs da extensão, não uma promessa de IA nativa nessa versão. Modelos próprios exigem WebGPU; variantes sem f16 têm cobertura automatizada, sem certificação física em outra GPU. RAM não informa VRAM livre. Os tempos das campanhas são deste equipamento, principalmente sessões quentes; carregar/verificar pode levar minutos. Na STEP-16, o Gemma levou mais de três minutos tanto no primeiro pedido quanto após encerrar seu Worker.

## Memória, problemas e diagnóstico

Em **IA e modelos → Armazenamento e memória**, **Liberar memória** encerra a instância e conserva o download; **Remover download** pede confirmação e remove somente o modelo/variante selecionado. Inatividade por cinco minutos libera sessões automaticamente. Liberar/remover/trocar modelo cancela pedidos ativos; a próxima ação pode carregar novamente. Cancelar fecha a interface imediatamente, mas o runtime pode precisar de até dois segundos para liberar o pedido; **IA ocupada** exige aguardar e clicar novamente.

Se faltar IA, prepare o modelo nas configurações. Se a extensão perdeu conexão, recarregue a extensão e a aba. Se houver falta de recursos ou falha de GPU, libere memória/feche outras aplicações pesadas e tente por nova ação, ou escolha outro modelo. Nenhum pedido é repetido automaticamente. Confira o rascunho depois de falha de aplicação; Ctrl+Z pode desfazer a última edição. O navegador e o WhatsApp podem mudar suas APIs/estrutura, exigindo nova validação.

Para relatar um problema, informe versão da extensão/navegador, ação, modelo escolhido, modo direto/prévia e a mensagem de erro. Use uma frase sintética e não compartilhe históricos, contatos, credenciais ou textos reais. O pacote instalável não contém a página de simulação/diagnóstico de desenvolvimento. O repositório mantém testes internos e evidências sintéticas para reprodução.

## Privacidade e limitações

Processamento obrigatório neste computador. A extensão lê somente o rascunho solicitado, sem coletar contatos, histórico ou mensagens recebidas. Rascunhos/prompts/respostas ficam temporariamente em memória; Chrome Storage guarda somente preferências. Recibos de integridade identificam artefatos públicos, nunca mensagens. Não há telemetria, analytics ou provedor remoto.

As permissões são storage, offscreen, sidePanel e acesso restrito ao WhatsApp/origens de dados dos modelos. Downloads são dados de revisões fixas; JavaScript/WASM acompanham o pacote. Licenças ficam em NOTICE.txt/licenses. A CSP restringe código a self, permite WASM local e limita conexões; [regras oficiais MV3](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code).

A IA pode repetir o original, adicionar aspas/emojis, mudar fatos ou produzir resposta ruim. A avaliação automática de conteúdo foi removida por solicitação do usuário; não existe garantia de equivalência semântica. A prévia opcional, o rascunho e Ctrl+Z permitem decidir o conteúdo antes de enviar. ExecCommand é uma API obsoleta, validada nas versões indicadas; a aplicação protege estruturas especiais oferecendo cópia. Não há promessa de compatibilidade universal, envio automático, tradução ou publicação na loja nesta entrega.
