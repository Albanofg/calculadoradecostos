import Link from 'next/link'
import { costear } from '@/lib/costeo.ts'
import { listarIngredientes, listarRecetas } from '@/lib/datos.ts'
import { fecha, plata, porcentaje } from '@/lib/format.ts'
import { accionBorrarReceta, accionDuplicarReceta } from '@/app/acciones.ts'
import { FaltaBase } from '@/components/FaltaBase.tsx'
import { Icono } from '@/components/Icono.tsx'
import { faltaConfiguracion } from '@/lib/db.ts'

export const dynamic = 'force-dynamic'

export default async function PaginaRecetas() {
  if (faltaConfiguracion()) return <FaltaBase />
  const [recetas, catalogo] = await Promise.all([listarRecetas(), listarIngredientes()])
  const porId = new Map(catalogo.map((i) => [i.id, i]))

  if (recetas.length === 0) {
    return (
      <main className="pagina">
        <h1 className="titulo-pagina display">Recetas guardadas</h1>
        <div className="vacio">
          <div className="vacio-tarjeta">
            <Icono nombre="carpeta" tam={28} />
            <h2>Todavía no guardaste ninguna receta</h2>
            <p>
              Cuando termines de costear una, guardala. Acá te va a quedar el historial, y lo
              bueno es que los precios se actualizan solos: si mañana sube la manteca, el
              precio de venta de todas tus recetas se recalcula.
            </p>
            <Link href="/" className="boton boton--principal">
              <Icono nombre="calculadora" tam={18} />
              Calcular una receta
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="pagina">
      <h1 className="titulo-pagina display">Recetas guardadas</h1>
      <p className="bajada">
        Los costos se calculan con los precios de hoy, no con los del día que las guardaste.
      </p>

      <div className="pila">
        {recetas.map((receta) => {
          const c = costear(receta, porId)
          return (
            <article key={receta.id} className="campo campo--datos">
              <div className="campo-cabeza">
                <span className="numero-catalogo">N°{receta.numero}</span>
                <h2 className="nombre-receta">{receta.nombre}</h2>
                <span className="campo-subtotal cifra">{plata(c.precioVenta)}</span>
              </div>
              <div className="campo-cuerpo">
                <div className="ficha-pie">
                  <span>{fecha(receta.fecha)}</span>
                  <span>· Costo {plata(c.total)}</span>
                  <span>· Recargo {porcentaje(receta.margen)}</span>
                  {receta.rinde ? <span>· Rinde {receta.rinde}</span> : null}
                  {c.precioPorPorcion !== null ? (
                    <span>· {plata(c.precioPorPorcion)} por porción</span>
                  ) : null}
                </div>

                {c.incierto ? (
                  <div className="aviso">
                    <Icono nombre="alerta" tam={18} />
                    <span>
                      {c.sinPrecio.join(', ')} no tiene precio, así que este total está
                      incompleto.
                    </span>
                  </div>
                ) : null}

                <div className="fila-acciones">
                  <Link href={`/receta/${receta.id}`} className="boton">
                    <Icono nombre="lapiz" tam={16} />
                    Abrir
                  </Link>
                  <form action={accionDuplicarReceta}>
                    <input type="hidden" name="id" value={receta.id} />
                    <button type="submit" className="boton boton--fantasma">
                      <Icono nombre="copiar" tam={16} />
                      Duplicar
                    </button>
                  </form>
                  <form action={accionBorrarReceta} style={{ marginLeft: 'auto' }}>
                    <input type="hidden" name="id" value={receta.id} />
                    <button type="submit" className="boton boton--fantasma boton--peligro">
                      <Icono nombre="basura" tam={16} />
                      Borrar
                    </button>
                  </form>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </main>
  )
}
