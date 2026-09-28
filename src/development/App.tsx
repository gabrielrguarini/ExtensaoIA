export function App() {
  return (
    <main className="development-page">
      <p className="eyebrow">IA local para WhatsApp Web</p>
      <h1>Base de desenvolvimento</h1>
      <p>Esta página permite conferir o carregamento do React e dos estilos do projeto.</p>
      <aside aria-label="Estado do projeto">
        <h2>STEP-05: prévia e substituição manual</h2>
        <p>
          A pasta dist contém a extensão com menu e prévia junto ao campo do WhatsApp. A simulação
          acrescenta “[Simulação]” ao rascunho, sem corrigir o texto. Substituir exige confirmação;
          textos com várias linhas e estruturas especiais oferecem somente cópia. A extensão nunca
          envia mensagens. O diagnóstico continua acessível pelo ícone. Esta página não acessa o
          WhatsApp.
        </p>
      </aside>
    </main>
  );
}
