export default function Cargando() {
  return (
    <main className="pagina" aria-busy="true" aria-live="polite">
      <span className="solo-lectores">Cargando el presupuesto…</span>
      <div className="esqueleto esqueleto--titulo" />
      <div className="esqueleto esqueleto--linea" style={{ width: '58%', marginBottom: 32 }} />
      <div className="doble">
        <div className="columna">
          <div className="esqueleto" style={{ height: 290 }} />
          <div className="esqueleto" style={{ height: 240 }} />
        </div>
        <div className="columna">
          <div className="esqueleto" style={{ height: 330 }} />
        </div>
      </div>
    </main>
  )
}
