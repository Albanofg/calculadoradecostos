'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icono, type Nombre } from './Icono.tsx'

const SECCIONES: { href: string; texto: string; icono: Nombre }[] = [
  { href: '/', texto: 'Calcular', icono: 'calculadora' },
  { href: '/ingredientes', texto: 'Ingredientes', icono: 'lista' },
  { href: '/recetas', texto: 'Recetas', icono: 'carpeta' },
]

export function NavPrincipal() {
  const ruta = usePathname()
  return (
    <nav className="barra">
      <div className="barra-interna">
        <span className="marca">
          <Icono nombre="balanza" tam={22} />
          <span className="marca-texto">Calculadora de Costos</span>
        </span>
        <div className="pestanas">
          {SECCIONES.map((s) => {
            const activa = s.href === '/' ? ruta === '/' : ruta.startsWith(s.href)
            return (
              <Link
                key={s.href}
                href={s.href}
                className="pestana"
                aria-current={activa ? 'page' : undefined}
              >
                <Icono nombre={s.icono} tam={17} />
                {s.texto}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
