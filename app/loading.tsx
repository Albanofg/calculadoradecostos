/**
 * Lo que se ve mientras el servidor trae las recetas.
 *
 * Tiene la forma de lo que viene después —título, bajada, grilla de tarjetas—
 * así que la pantalla no salta cuando llega el contenido real.
 */
export default function Cargando() {
  return (
    <main className="pagina" aria-busy="true" aria-live="polite">
      <span className="solo-lectores">Cargando el recetario…</span>
      <div className="esqueleto esqueleto--titulo" />
      <div className="esqueleto esqueleto--linea" style={{ width: '54%' }} />
      <div className="esqueleto esqueleto--linea" style={{ width: '38%', marginBottom: 32 }} />
      <div className="grilla-recetario">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="esqueleto esqueleto--tarjeta" />
        ))}
      </div>
    </main>
  )
}
