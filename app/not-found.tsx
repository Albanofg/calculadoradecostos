import Link from 'next/link'
import { Icono } from '@/components/Icono.tsx'

export default function NoEncontrado() {
  return (
    <main className="pagina">
      <div className="vacio">
        <div className="vacio-tarjeta">
          <Icono nombre="carpeta" tam={28} />
          <h2>Esa receta ya no está</h2>
          <p>
            Puede que la hayas borrado, o que el link esté viejo. Mirá el historial para
            encontrarla.
          </p>
          <Link href="/recetas" className="boton boton--principal">
            Ver mis recetas
          </Link>
        </div>
      </div>
    </main>
  )
}
