# Validação STEP-16-G — Consultas de idioma nativo

[Plano](PLANO.md) · [Progresso](PROGRESSO.md) · [Escopo](steps/STEP-16-G.md)

## Causa e correção em 09/10/2026

Aplicada a skill diagnosing-bugs. O roteiro de Chrome real reproduziu exatamente
Unsupported LanguageModel API languages e The requested language options are
not supported. Sete ocorrências na consulta das nove ações, sem criar sessão.
O teste mínimo com o adaptador Chrome também falhou nos dois sintomas, registrando
as chamadas incompatíveis antes da seleção da compatibilidade.

Hipóteses avaliadas: consulta inicial com pt-BR rejeitado, divergência entre
consulta/criação e versão antiga instalada. O pacote 0.16.6 carregado era o atual;
os testes confirmaram opções equivalentes. A causa foi a consulta inicial com
idioma declarado, que emitia erros antes de cair na compatibilidade funcional.

selectNativeQuery agora escolhe diretamente a compatibilidade autorizada para
pt-BR, antes de consultar: Prompt com expectedInputs text sem idioma declarado,
expectedOutputs en e instrução de resposta em português brasileiro. Consulta e
criação continuam usando nativeConfig. Se indisponível/não preparada, a seleção
local continua ocorrendo antes da geração, sem repetir pedidos ou baixar pesos.
Os outros idiomas conservam sua seleção de APIs especializadas.

A [documentação oficial da Prompt API](https://developer.chrome.com/docs/ai/prompt-api#add_expected_input_and_output)
lista en, ja, es, de e fr; pt-BR não é uma declaração suportada. A instrução em
português não certifica suporte formal ou qualidade do idioma. Nenhum console,
log nativo ou exceção foi ocultado; a chamada inválida deixou de ocorrer.

## Verificação

Mesma reprodução antes/depois, Chrome 154.0.8037.98 em perfil isolado, pacote
0.16.7 instalado: **sete ocorrências antes, zero depois**, capturando Log e Runtime
em popup/offscreen. As nove ações foram consultadas pelo produto; Corrigir e
Profissional conferidas nas configurações visíveis por teclado. Zero erros de
página. O roteiro apenas consulta; não pede download nem cria sessão.

O perfil informou downloading nas nove ações e sessionReady false. Portanto não
houve nova inferência real/offline. Isso não impede verificar a ausência dos dois
erros de consulta, mas não comprova preparo/qualidade de uma nova sessão. A
pendência de inferência completa da STEP-16/16-A permanece.

Dois testes novos passam: nove ações com consulta/criação compatíveis e ausência
de chamadas rejeitadas; indisponibilidade sem retorno à configuração inválida.
Regressões de alternativa local, APIs ausentes, cancelamento e demais contratos
continuam aprovadas. `npm.cmd run check`: tipos, lint, formatação, **310 testes/44
arquivos** e build. Pacote com 53 arquivos, ZIP e inventário SHA-256.

O único fonte de produto alterado desde o commit visual d7eb0ca é native-choice.ts.
Interface, tooltip compartilhado, botão IA, streaming e mecanismos de download
preservados; content.js idêntico ao pacote 0.16.6. As mudanças adicionais são
testes, documentação e versão, sem atualização de dependências ou permissões.
As sete verificações de painel/popup, switches, tooltip e aviso de download foram
repetidas no pacote 0.16.7 e passaram.

## Evidências e entrega

- [Antes](evidencias/step16g/before.json) · [Depois](evidencias/step16g/after.json).
- [Checks](evidencias/step16g/checks.json) · [Preservação](evidencias/step16g/preservation.json).
- [Regressão da interface](evidencias/step16g/interface.json).
- [Inventário do pacote](evidencias/step16g/package.json).

Correção concluída em commit separado das alterações visuais, com identidade
humana configurada. Trabalho do usuário em .gitignore/skills-lock.json preservado.
Sem envio, publicação ou início automático de nova etapa.
