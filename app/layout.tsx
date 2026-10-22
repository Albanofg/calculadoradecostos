import type { Metadata, Viewport } from 'next'
import { Archivo } from 'next/font/google'
import { NavPrincipal } from '@/components/NavPrincipal.tsx'
import { Transicion } from '@/components/Transicion.tsx'
import './globals.css'

const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  display: 'swap',
  variable: '--fuente-archivo',
})

export const metadata: Metadata = {
  title: 'Calculadora de Costos',
  description:
    'Costeo de recetas de pastelería: ingredientes, mano de obra, packaging y precio de venta sugerido.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f4f4f4',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={archivo.variable}>
      <body>
        <NavPrincipal />
        <Transicion>{children}</Transicion>
      </body>
    </html>
  )
}
