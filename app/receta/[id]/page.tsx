import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Calculadora } from '@/components/Calculadora.tsx'
import { FaltaBase } from '@/components/FaltaBase.tsx'
import { Icono } from '@/components/Icono.tsx'
import { faltaConfiguracion } from '@/lib/db.ts'
import { listarIngredientes, obtenerReceta } from '@/lib/datos.ts'
import { fecha } from '@/lib/format.ts'

export const dynamic = 'force-dynamic'

export default async function PaginaReceta({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  if (faltaConfiguracion()) return <FaltaBase />
  const { id } = await params
  const [receta, catalogo] = await Promise.all([obtenerReceta(id), listarIngredientes()])
  if (!receta) notFound()

  return (
    <main className="pagina">
      <Link href="/" className="volver">
        <Icono nombre="volver" tam={16} className="icono-vuelve" />
        Recetario
      </Link>
      <h1 className="titulo-pagina display">{receta.nombre}</h1>
      <p className="bajada">
        Receta N° {receta.numero} · guardada el {fecha(receta.fecha)}. Los costos se recalculan
        con los precios de hoy, así que el precio de venta puede haber cambiado desde que la
        guardaste.
      </p>
      <Calculadora inicial={receta} catalogo={catalogo} />
    </main>
  )
}
