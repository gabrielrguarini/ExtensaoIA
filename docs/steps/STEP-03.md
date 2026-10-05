# STEP-03 — Implementar Manifest V3 e comunicação

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Objetivo

Estabelecer comunicação validada entre o WhatsApp, a coordenação da extensão e um Worker simulado.

## Pré-requisitos

- [STEP-02](STEP-02.md) e todas as etapas anteriores concluídas, com evidências registradas.

## Tarefas

- [x] Criar Manifest V3, Service Worker, documento offscreen empacotado e Worker simulado. O offscreen deve usar a finalidade WORKERS.
- [x] Restringir o content script a https://web.whatsapp.com/* e ao frame principal. Solicitar somente as permissões necessárias, incluindo storage e offscreen; adicionar outras apenas na etapa que as exigir.
- [x] Configurar CSP para código e workers locais; habilitar execução do WASM empacotado sem permitir eval ou scripts remotos.
- [x] Definir uniões discriminadas para iniciar, cancelar, consultar estado, progresso, fragmento, resultado e erro. Validar dados recebidos em tempo de execução.
- [x] Vincular solicitações a requestId, aba, frame/documento, snapshot do editor e revisão. Obter a origem confiável do remetente do Chrome, sem confiar em identificadores arbitrários do payload.
- [x] Criar offscreen e Worker de forma idempotente; impedir instâncias duplicadas. Usar chrome.runtime para comunicação com o offscreen, que não deve acessar chrome.storage diretamente.
- [x] Implementar uma solicitação ativa por vez, erro de ocupado, descarte de respostas desconhecidas e limpeza em desconexão. Não armazenar conteúdo em storage.
- [x] Preparar reconexão e encerramento seguro de pedidos caso o Service Worker reinicie; não presumir que uma conexão o mantém vivo permanentemente.

## Limites

- O motor desta etapa é explicitamente simulado e não comprova inferência local.
- Não utilizar APIs internas do WhatsApp, tráfego interceptado ou mensagens recebidas como dados de teste.
- Não adicionar permissões globais, endpoints arbitrários nem keepalive artificial para prometer persistência.

## Critérios de conclusão e verificação

- [x] Uma solicitação simulada completa o circuito e retorna somente à origem correta.
- [x] Pedidos malformados, remetentes incorretos, IDs desconhecidos e pedidos concorrentes recebem tratamento previsível.
- [x] Duas abas não compartilham resultados; desconexão não deixa uma resposta aplicável em outra aba.
- [x] A extensão pode ser carregada localmente sem erro de Manifest ou CSP.

Quando uma verificação não puder ser realizada, registrar exatamente o procedimento pendente e usar Aguardando validação ou Bloqueada no progresso, conforme o motivo. Não substituir evidência real por suposição.

Evidências automatizadas e reais estão em [PROGRESSO.md](../PROGRESSO.md) e no [relatório de validação](../VALIDACAO-STEP-03.md). Todos os critérios foram verificados em 25/09/2026 no Chrome for Testing 154.0.8037.0, com motor simulado.

## Entrega esperada

- Extensão MV3 mínima e contratos tipados de comunicação.
- Testes do roteamento e evidência de carregamento no Chrome.
