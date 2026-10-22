import { ArmarPresupuesto } from '@/components/ArmarPresupuesto.tsx'
import { FaltaBase } from '@/components/FaltaBase.tsx'
import { faltaConfiguracion } from '@/lib/db.ts'
import { listarIngredientes, listarRecetario } from '@/lib/datos.ts'

export const dynamic = 'force-dynamic'

export default async function PaginaPresupuesto() {
  if (faltaConfiguracion()) return <FaltaBase />

  const [recetas, catalogo] = await Promise.all([listarRecetario(), listarIngredientes()])

  return (
    <main className="pagina">
      <h1 className="titulo-pagina display">Presupuesto</h1>
      <p className="bajada">
        Armá el pedido con las recetas que ya tenés guardadas: dos budines, una lemon
        pie, lo que sea. Sale un PDF con el precio final, listo para mandar.
      </p>
      <ArmarPresupuesto recetas={recetas} catalogo={catalogo} />
    </main>
  )
}
