'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icono, type Nombre } from './Icono.tsx'

const SECCIONES: {
  href: string
  texto: string
  icono: Nombre
  coincide: (r: string) => boolean
}[] = [
  {
    href: '/',
    texto: 'Recetario',
    icono: 'libro',
    // Cargar y editar recetas viven adentro del recetario.
    coincide: (r) => r === '/' || r.startsWith('/receta'),
  },
  {
    href: '/presupuesto',
    texto: 'Presupuesto',
    icono: 'caja',
    coincide: (r) => r.startsWith('/presupuesto'),
  },
  {
    href: '/ingredientes',
    texto: 'Ingredientes',
    icono: 'lista',
    coincide: (r) => r.startsWith('/ingredientes'),
  },
]

export function NavPrincipal() {
  const ruta = usePathname()
  const contenedor = useRef<HTMLDivElement>(null)
  const [pastilla, setPastilla] = useState<{ x: number; w: number } | null>(null)

  const activo = SECCIONES.findIndex((s) => s.coincide(ruta))

  /**
   * La pastilla es un solo elemento que se mueve entre pestañas, en vez de un
   * fondo que aparece y desaparece en cada una. Hay que medirla porque las
   * pestañas no tienen todas el mismo ancho.
   */
  useEffect(() => {
    const medir = () => {
      const caja = contenedor.current
      if (!caja || activo < 0) return setPastilla(null)
      // Por clase y no por índice de hijo: la pastilla también es hija del
      // contenedor, así que contar hijos mide la pestaña equivocada.
      const tabs = caja.querySelectorAll<HTMLElement>('.pestana')
      const tab = tabs[activo]
      if (!tab) return setPastilla(null)
      setPastilla({ x: tab.offsetLeft, w: tab.offsetWidth })
    }
    medir()

    // Las fuentes web cambian el ancho del texto al cargar, así que volvemos a
    // medir cuando terminan; si no, la pastilla queda corrida.
    document.fonts?.ready.then(medir).catch(() => {})

    const obs = new ResizeObserver(medir)
    if (contenedor.current) obs.observe(contenedor.current)
    window.addEventListener('resize', medir)
    return () => {
      obs.disconnect()
      window.removeEventListener('resize', medir)
    }
  }, [activo, ruta])

  return (
    <nav className="barra">
      <div className="barra-interna">
        <Link href="/" className="marca">
          <Icono nombre="balanza" tam={22} />
          <span className="marca-texto">Calculadora de Costos</span>
        </Link>

        <div className="pestanas" ref={contenedor}>
          {pastilla ? (
            <span
              className="pastilla"
              aria-hidden="true"
              style={{ transform: `translateX(${pastilla.x}px)`, width: pastilla.w }}
            />
          ) : null}
          {SECCIONES.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="pestana"
              aria-current={s.coincide(ruta) ? 'page' : undefined}
            >
              <Icono nombre={s.icono} tam={17} />
              {s.texto}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
