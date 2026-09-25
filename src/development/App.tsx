export function App() {
  return (
    <main className="development-page">
      <p className="eyebrow">IA local para WhatsApp Web</p>
      <h1>Base de desenvolvimento</h1>
      <p>Esta página permite conferir o carregamento do React e dos estilos do projeto.</p>
      <aside aria-label="Estado do projeto">
        <h2>STEP-04: identificação do editor</h2>
        <p>
          A pasta dist contém a extensão com o botão IA junto ao campo de mensagem do WhatsApp.
          Nesta etapa, o botão confirma a identificação do campo; as ações de escrita ainda não
          estão disponíveis. O diagnóstico de comunicação continua acessível pelo ícone da extensão
          e usa um motor simulado. Esta página não acessa o WhatsApp.
        </p>
      </aside>
    </main>
  );
}
