import { Calculadora } from '@/components/Calculadora.tsx'
import { FaltaBase } from '@/components/FaltaBase.tsx'
import type { Receta } from '@/lib/costeo.ts'
import { faltaConfiguracion } from '@/lib/db.ts'
import { listarIngredientes } from '@/lib/datos.ts'
import { sembrarSiHaceFalta } from '@/lib/semilla.ts'

export const dynamic = 'force-dynamic'

function recetaEnBlanco(): Receta {
  return {
    id: '',
    numero: 0,
    nombre: '',
    descripcion: '',
    rinde: null,
    margen: 0.75,
    fecha: new Date().toISOString(),
    ingredientes: [
      { id: 'l1', ingredienteId: null, cantidad: null },
      { id: 'l2', ingredienteId: null, cantidad: null },
      { id: 'l3', ingredienteId: null, cantidad: null },
    ],
    manoDeObra: [],
    extras: [],
  }
}

export default async function PaginaCalculadora() {
  if (faltaConfiguracion()) return <FaltaBase />
  await sembrarSiHaceFalta()
  const catalogo = await listarIngredientes()

  return (
    <main className="pagina">
      <h1 className="titulo-pagina display">Calcular una receta</h1>
      <p className="bajada">
        Cargá lo que lleva, cuánto tiempo te toma y qué gastás aparte. Abajo te queda el costo
        real y el precio que conviene cobrar.
      </p>
      <Calculadora inicial={recetaEnBlanco()} catalogo={catalogo} />
    </main>
  )
}
