'use client'

import { usePathname } from 'next/navigation'

/**
 * Hace que el contenido entre cada vez que se cambia de pantalla.
 *
 * El truco es la `key`: cuando cambia la ruta, React desmonta y vuelve a montar
 * el contenido, así que la animación de entrada se dispara de nuevo. Sin eso,
 * sólo se animaría la primera carga.
 *
 * No usa la View Transitions API a propósito: en el App Router la navegación es
 * del lado del cliente, así que la regla CSS `@view-transition` no llega a
 * dispararse, y la versión de React para esto todavía es experimental.
 */
export function Transicion({ children }: { children: React.ReactNode }) {
  const ruta = usePathname()
  return (
    <div key={ruta} className="entra-pantalla">
      {children}
    </div>
  )
}
