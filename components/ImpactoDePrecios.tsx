import Link from 'next/link'
import { costear, type CambioDePrecio, type Ingrediente, type Receta } from '@/lib/costeo.ts'
import { plata, porcentaje } from '@/lib/format.ts'
import { Icono } from './Icono.tsx'

/**
 * Qué recetas se encarecieron por los cambios de precio recientes.
 *
 * La app ya re-cotiza sola cuando cambia un precio; esto es lo que faltaba:
 * contárselo. Con inflación, enterarse tarde de que una receta subió 30% es la
 * diferencia entre cobrar bien y regalar trabajo.
 *
 * El cálculo es exacto, no estimado: se costea cada receta dos veces, una con
 * los precios de hoy y otra con los de antes del cambio.
 */
export function ImpactoDePrecios({
  cambios,
  recetas,
  catalogo,
}: {
  cambios: CambioDePrecio[]
  recetas: Receta[]
  catalogo: Ingrediente[]
}) {
  if (cambios.length === 0) return null

  const ahora = new Map(catalogo.map((i) => [i.id, i]))

  // El mismo catálogo pero con los precios de antes de los cambios.
  const antes = new Map(
    catalogo.map((i) => {
      const cambio = cambios.find((c) => c.ingredienteId === i.id)
      if (!cambio || cambio.precioAnterior === null) return [i.id, i]
      return [
        i.id,
        { ...i, precio: cambio.precioAnterior, precioConfirmado: cambio.precioAnterior > 0 },
      ]
    }),
  )

  const afectadas = recetas
    .map((receta) => {
      const hoy = costear(receta, ahora, new Map(recetas.map((r) => [r.id, r])))
      const viejo = costear(receta, antes, new Map(recetas.map((r) => [r.id, r])))
      return { receta, hoy: hoy.total, viejo: viejo.total }
    })
    // Una diferencia de centavos no es una noticia.
    .filter((x) => Math.abs(x.hoy - x.viejo) > 1)
    .sort((a, b) => b.hoy - b.viejo - (a.hoy - a.viejo))

  const subieron = cambios.filter(
    (c) => c.precioAnterior !== null && c.precioNuevo > c.precioAnterior,
  ).length

  return (
    <section className="campo campo--extras">
      <header className="campo-cabeza">
        <h2>Qué cambió esta semana</h2>
      </header>
      <div className="campo-cuerpo">
        <p className="nota">
          {cambios.length === 1
            ? 'Cambiaste 1 precio en los últimos 7 días.'
            : `Cambiaste ${cambios.length} precios en los últimos 7 días.`}
          {subieron > 0
            ? ` ${subieron === 1 ? 'Uno subió' : `${subieron} subieron`}.`
            : null}
        </p>

        <ul className="lista-cambios">
          {cambios.map((c) => {
            const subio = c.precioAnterior !== null && c.precioNuevo > c.precioAnterior
            const variacion =
              c.precioAnterior && c.precioAnterior > 0
                ? (c.precioNuevo - c.precioAnterior) / c.precioAnterior
                : null
            return (
              <li key={c.ingredienteId}>
                <span className="cambio-nombre">{c.nombre}</span>
                {c.precioAnterior !== null && c.precioAnterior > 0 ? (
                  <span className="cambio-cifras">
                    <span className="cifra cambio-antes">{plata(c.precioAnterior)}</span>
                    <Icono nombre={subio ? 'sube' : 'baja'} tam={14} />
                    <span className="cifra">{plata(c.precioNuevo)}</span>
                    {variacion !== null ? (
                      <span className={`marca-estado marca-estado--${subio ? 'sin-precio' : 'fresco'}`}>
                        {subio ? '+' : ''}
                        {porcentaje(variacion)}
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span className="cambio-cifras">
                    <span className="cifra">{plata(c.precioNuevo)}</span>
                    <span className="marca-estado marca-estado--fresco">nuevo</span>
                  </span>
                )}
              </li>
            )
          })}
        </ul>

        {afectadas.length > 0 ? (
          <>
            <p className="nota">
              {afectadas.length === 1
                ? 'Esta receta cambió de costo:'
                : `Estas ${afectadas.length} recetas cambiaron de costo:`}
            </p>
            <ul className="lista-cambios">
              {afectadas.map(({ receta, hoy, viejo }) => {
                const subio = hoy > viejo
                const variacion = viejo > 0 ? (hoy - viejo) / viejo : null
                return (
                  <li key={receta.id}>
                    <Link href={`/receta/${receta.id}`} className="cambio-nombre">
                      {receta.nombre}
                    </Link>
                    <span className="cambio-cifras">
                      <span className="cifra cambio-antes">{plata(viejo)}</span>
                      <Icono nombre={subio ? 'sube' : 'baja'} tam={14} />
                      <span className="cifra">{plata(hoy)}</span>
                      {variacion !== null ? (
                        <span
                          className={`marca-estado marca-estado--${subio ? 'sin-precio' : 'fresco'}`}
                        >
                          {subio ? '+' : ''}
                          {porcentaje(variacion)}
                        </span>
                      ) : null}
                    </span>
                  </li>
                )
              })}
            </ul>
            <p className="nota">
              Los precios de venta ya se recalcularon solos. Si alguna tiene precio puesto a
              mano, ese no se toca: revisala.
            </p>
          </>
        ) : (
          <p className="nota">Ninguna receta guardada usa esos ingredientes.</p>
        )}
      </div>
    </section>
  )
}
