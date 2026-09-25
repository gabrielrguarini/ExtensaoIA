export function App() {
  return (
    <main className="development-page">
      <p className="eyebrow">IA local para WhatsApp Web</p>
      <h1>Base de desenvolvimento</h1>
      <p>Esta página permite conferir o carregamento do React e dos estilos do projeto.</p>
      <aside aria-label="Estado do projeto">
        <h2>STEP-03: comunicação simulada</h2>
        <p>
          A pasta dist contém a estrutura da extensão e um diagnóstico de comunicação. Carregue-a no
          Chrome e abra o diagnóstico pelo ícone da extensão. O motor é simulado; esta página não
          acessa o WhatsApp nem executa um modelo de IA.
        </p>
      </aside>
    </main>
  );
}
