# STEP-16 — Validar e preparar a entrega instalável

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Objetivo

Entregar o pacote local com verificações completas e instruções de instalação, atualização e privacidade.

## Pré-requisitos

- [STEP-15](STEP-15.md), incluindo [A](STEP-15-A.md), [B](STEP-15-B.md), [C](STEP-15-C.md), [D](STEP-15-D.md), [E](STEP-15-E.md), [F](STEP-15-F.md), [G](STEP-15-G.md) e [H](STEP-15-H.md), e todas as etapas anteriores concluídas, com evidências registradas.

## Tarefas

- [x] Conferir que preferências estão somente nas configurações, nomes de frameworks e simulações não aparecem na interface e o botão IA executa diretamente a ação salva.
- [x] Validar instalação limpa com seleção nativa/local, idioma pt-BR indisponível, preparação explícita e Substituir sem avaliação automática de conteúdo ou confirmação adicional.
- [x] Conferir sessões nativas isoladas, Rewriter por configuração, quotas/cancelamento, Gemma e perfis WebLLM selecionáveis, cache administrado pelo Chrome separado dos modelos próprios.
- [x] Executar os checks do projeto e testes de integração em fixtures controladas com múltiplos editores/abas e textos sintéticos.
- [ ] Validar no WhatsApp Web real os dois modos: padrão Corrigir/Substituir diretamente com tooltip e Ctrl+Z, sem janela; selecionar Revisar sugestão e conferir Copiar/Substituir. Verificar cancelamento, edição, troca de conversa, erros e download nas configurações. Não automatizar envio de mensagens.
- [x] Cobrir troca de conversa, rascunho alterado, Unicode, quebras de linha, menções estruturadas, cópia, desfazer, cancelamento e respostas atrasadas.
- [x] Revalidar download, cache, inicialização offline, troca de modelo, perda de GPU, reinício dos componentes e falta de suporte WebGPU.
- [x] Auditar Manifest, CSP, permissões, pacote, logs e storage. Inspecionar em ambiente de teste requisições originadas pela extensão com textos sintéticos identificáveis, sem adicionar interceptação de tráfego ao produto.
- [x] Confirmar que downloads se restringem aos artefatos registrados e que código executável é local.
- [x] Gerar a pasta final instalável e documentar chrome://extensions → Modo do desenvolvedor → Carregar sem compactação.
- [x] Documentar versões/hardware testados, requisitos, atualização da extensão, descarga da GPU, remoção dos modelos, privacidade, diagnóstico sem conteúdo e limitações conhecidas.
- [x] Conferir o idioma efetivo pt-BR e documentar a compatibilidade autorizada da STEP-15-G (sessão en, resposta pt-BR por instrução), sua ausência de aviso e limitações. A seleção é automática, sem interruptor de idioma. Disponibilidade/documentação traduzida não certificam idioma, qualidade ou cobertura de segurança para pt-BR. Usar [referências de idioma/cache](../REFERENCIAS-IA-CHROME.md) e as evidências G; resultados B/D permanecem históricos.
- [x] Reproduzir as recomendações por ação/hardware da STEP-15-D, incluindo respostas idênticas, aspas externas e possíveis alterações de sentido. Conferir que a STEP-15-E retirou a avaliação de conteúdo e os falsos avisos; as recomendações D permanecem evidências históricas. Não apresentar o nome do perfil Qualidade como prova de superioridade; preservar a escolha do modelo, a prévia opcional e a decisão de enviar pelo usuário.

## Limites

- Não publicar na Chrome Web Store nem configurar distribuição externa nesta etapa.
- Não declarar compatibilidade com equipamentos ou versões que não foram verificados.
- Não encerrar a entrega como concluída com validação real obrigatória pendente.

## Critérios de conclusão e verificação

- [x] Instalação limpa do pacote funciona sem depender de servidor de desenvolvimento.
- [ ] O fluxo completo real atende aos critérios de privacidade, substituição direta autorizada pelo clique, revisão opcional, cancelamento e undo. Nenhuma mensagem é enviada pela extensão.
- [ ] Testes automatizados e verificações manuais obrigatórias estão registrados com evidências.
- [x] Nenhum conteúdo sintético de rascunho aparece em requisições externas, logs ou storage persistente da extensão.
- [x] A inferência funciona offline após preparação completa e reinício; limitações são documentadas.

Quando uma verificação não puder ser realizada, registrar exatamente o procedimento pendente e usar Aguardando validação ou Bloqueada no progresso, conforme o motivo. Não substituir evidência real por suposição.

Resultados e limites: [relatório STEP-16](../VALIDACAO-STEP-16.md) e [guia de instalação/operação](../INSTALACAO.md). As conferências de contratos/ciclo de vida incluem testes acumulados e evidências reais históricas B/C/D/G com fontes preservadas; não equivalem à validação final no WhatsApp autenticado, ainda pendente.

## Entrega esperada

- Pasta instalável, guia de instalação/operação e documentação de privacidade.
- ZIP e ícones do produto; guia de publicação pelo usuário, sem upload nesta etapa.
- Relatório final de validação, limitações e conclusão do plano apenas se todos os critérios forem atendidos.
