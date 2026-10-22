export default function Cargando() {
  return (
    <main className="pagina" aria-busy="true" aria-live="polite">
      <span className="solo-lectores">Cargando la receta…</span>
      <div className="esqueleto esqueleto--linea" style={{ width: 120, marginBottom: 20 }} />
      <div className="esqueleto esqueleto--titulo" />
      <div className="esqueleto esqueleto--linea" style={{ width: '62%', marginBottom: 32 }} />
      <div className="doble">
        <div className="columna">
          <div className="esqueleto" style={{ height: 250 }} />
          <div className="esqueleto" style={{ height: 320 }} />
          <div className="esqueleto" style={{ height: 180 }} />
        </div>
        <div className="columna">
          <div className="esqueleto" style={{ height: 380 }} />
        </div>
      </div>
    </main>
  )
}
