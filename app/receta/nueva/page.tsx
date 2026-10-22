import Link from 'next/link'
import { Calculadora } from '@/components/Calculadora.tsx'
import { FaltaBase } from '@/components/FaltaBase.tsx'
import { Icono } from '@/components/Icono.tsx'
import type { Receta } from '@/lib/costeo.ts'
import { faltaConfiguracion } from '@/lib/db.ts'
import { listarIngredientes, listarPreparaciones } from '@/lib/datos.ts'
import { sembrarSiHaceFalta } from '@/lib/semilla.ts'

export const dynamic = 'force-dynamic'

function recetaEnBlanco(): Receta {
  return {
    id: '',
    numero: 0,
    nombre: '',
    descripcion: '',
    procedimiento: '',
    rinde: null,
    rindeUnidad: 'PORCION',
    esPreparacion: false,
    margen: 0.75,
    precioManual: null,
    fecha: new Date().toISOString(),
    ingredientes: [
      { id: 'l1', ingredienteId: null, cantidad: null },
      { id: 'l2', ingredienteId: null, cantidad: null },
      { id: 'l3', ingredienteId: null, cantidad: null },
    ],
    subrecetas: [],
    manoDeObra: [],
    extras: [],
    fotos: [],
    tramos: [],
  }
}

export default async function PaginaNuevaReceta() {
  if (faltaConfiguracion()) return <FaltaBase />
  await sembrarSiHaceFalta()
  const [catalogo, preparaciones] = await Promise.all([
    listarIngredientes(),
    listarPreparaciones(),
  ])

  return (
    <main className="pagina">
      <Link href="/" className="volver">
        <Icono nombre="volver" tam={16} className="icono-vuelve" />
        Recetario
      </Link>
      <h1 className="titulo-pagina display">Cargar una receta</h1>
      <p className="bajada">
        Poné lo que lleva, cuánto tiempo te toma y qué gastás aparte. Abajo te queda el
        costo real y el precio que conviene cobrar.
      </p>
      <Calculadora
        inicial={recetaEnBlanco()}
        catalogo={catalogo}
        preparaciones={preparaciones}
      />
    </main>
  )
}
