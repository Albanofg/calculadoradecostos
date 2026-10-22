import { Catalogo } from '@/components/Catalogo.tsx'
import { FaltaBase } from '@/components/FaltaBase.tsx'
import { faltaConfiguracion } from '@/lib/db.ts'
import { listarIngredientes } from '@/lib/datos.ts'
import { CATEGORIAS, sembrarSiHaceFalta } from '@/lib/semilla.ts'

export const dynamic = 'force-dynamic'

export default async function PaginaIngredientes() {
  if (faltaConfiguracion()) return <FaltaBase />
  await sembrarSiHaceFalta()
  const ingredientes = await listarIngredientes()

  const categorias = [
    ...new Set([...CATEGORIAS, ...ingredientes.map((i) => i.categoria)]),
  ].sort((a, b) => a.localeCompare(b, 'es'))

  return (
    <main className="pagina">
      <h1 className="titulo-pagina display">Ingredientes</h1>
      <p className="bajada">
        Los precios de acá son los que usan todas tus recetas. Cuando cambiás uno, todas las
        recetas guardadas se recalculan solas.
      </p>
      <Catalogo ingredientes={ingredientes} categorias={categorias} />
    </main>
  )
}
