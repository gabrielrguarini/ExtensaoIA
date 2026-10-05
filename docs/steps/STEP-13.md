# STEP-13 — Consolidar cache, recuperação e desempenho

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Objetivo

Garantir reutilização local dos artefatos e recuperação previsível sem reter mensagens.

## Pré-requisitos

- [STEP-12](STEP-12.md) e todas as etapas anteriores concluídas, com evidências registradas.

## Tarefas

- [x] Gerenciar cache por modelo, variante e revisão; verificar completude e integridade com os mecanismos suportados pelos artefatos e runtime fixados.
- [x] Detectar downloads interrompidos ou cache inconsistente; oferecer reparo/novo download quando necessário, sem declarar disponibilidade offline indevida.
- [x] Permitir remover somente os artefatos do modelo selecionado, sem apagar preferências ou dados de outros sites.
- [x] Reutilizar a sessão entre pedidos independentes e liberar GPU/Worker após cinco minutos sem atividade. Reiniciar a contagem após cada operação concluída.
- [x] Tratar perda de dispositivo, reinício do Service Worker, encerramento do offscreen e desconexão de abas. Encerrar pedidos afetados e descartar suas respostas.
- [x] Não retomar automaticamente rascunhos interrompidos: nova geração requer nova ação do usuário.
- [x] Testar inicialização fria após reiniciar o navegador com rede indisponível e modelo previamente preparado.
- [x] Documentar que persistência do cache depende do navegador e que sua remoção pode exigir baixar o modelo novamente.

## Limites

- Cache refere-se a artefatos do modelo; não criar cache persistente de mensagens ou sugestões.
- A capacidade offline prometida é da inferência, não do WhatsApp.
- Não simular permanência do Service Worker por keepalive artificial.

## Critérios de conclusão e verificação

- [x] Modelo íntegro em cache gera resultado após reinício do navegador sem downloads adicionais.
- [x] Cache incompleto produz orientação correta e mantém o original.
- [x] Cinco minutos de inatividade liberam recursos sem apagar artefatos.
- [x] Perda de GPU ou contexto cancela o pedido; reconexão não aplica nem reinicia texto antigo.

Quando uma verificação não puder ser realizada, registrar exatamente o procedimento pendente e usar Aguardando validação ou Bloqueada no progresso, conforme o motivo. Não substituir evidência real por suposição.

Evidências e procedimentos: [VALIDACAO-STEP-13.md](../VALIDACAO-STEP-13.md).

## Entrega esperada

- Gerenciamento de cache, descarregamento por inatividade e recuperação.
- Evidência de teste offline após reinício e dos cenários de falha.
