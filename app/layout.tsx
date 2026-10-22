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
  title: 'Casita Dulce',
  description:
    'Recetario y costeo de Casita Dulce: ingredientes, mano de obra, packaging y precio de venta.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f6f4ef',
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
