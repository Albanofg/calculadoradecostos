import Link from 'next/link'
import { FaltaBase } from '@/components/FaltaBase.tsx'
import { Icono } from '@/components/Icono.tsx'
import { Recetario } from '@/components/Recetario.tsx'
import { faltaConfiguracion } from '@/lib/db.ts'
import { listarIngredientes, listarRecetario } from '@/lib/datos.ts'
import { sembrarSiHaceFalta } from '@/lib/semilla.ts'

export const dynamic = 'force-dynamic'

export default async function PaginaRecetario() {
  if (faltaConfiguracion()) return <FaltaBase />
  await sembrarSiHaceFalta()

  const [recetas, catalogo] = await Promise.all([listarRecetario(), listarIngredientes()])

  return (
    <main className="pagina">
      <div className="cabecera-pagina">
        <div>
          <h1 className="titulo-pagina display">Recetario</h1>
          <p className="bajada">
            Tus recetas con su foto, el procedimiento y el precio. Los costos se calculan
            con los precios de hoy, no con los del día que las guardaste.
          </p>
        </div>
        {recetas.length > 0 ? (
          <Link href="/receta/nueva" className="boton boton--principal">
            <Icono nombre="mas" tam={18} />
            Cargar receta
          </Link>
        ) : null}
      </div>

      {recetas.length === 0 ? (
        <div className="vacio">
          <div className="vacio-tarjeta">
            <Icono nombre="libro" tam={26} />
            <h2>Todavía no hay recetas</h2>
            <p>
              Cargá la primera y te va a quedar acá con su foto y sus pasos. Lo bueno es
              que el precio se actualiza solo: si mañana sube la manteca, todas las
              recetas que la usan se recalculan.
            </p>
            <Link href="/receta/nueva" className="boton boton--principal">
              <Icono nombre="mas" tam={18} />
              Cargar la primera receta
            </Link>
          </div>
        </div>
      ) : (
        <Recetario recetas={recetas} catalogo={catalogo} />
      )}
    </main>
  )
}
