export default function Cargando() {
  return (
    <main className="pagina" aria-busy="true" aria-live="polite">
      <span className="solo-lectores">Cargando los ingredientes…</span>
      <div className="esqueleto esqueleto--titulo" />
      <div className="esqueleto esqueleto--linea" style={{ width: '60%', marginBottom: 32 }} />
      <div className="grilla-catalogo">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="esqueleto" style={{ height: 148 }} />
        ))}
      </div>
    </main>
  )
}
