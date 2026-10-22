import Image from 'next/image'

/**
 * Lo que se ve mientras el servidor trae los datos.
 *
 * Lleva el logo completo en vez de un spinner: una espera corta con la marca
 * se lee como que la app está trabajando, no como que se colgó. Debajo va la
 * silueta de lo que viene, así la pantalla no salta cuando llega el contenido.
 */
export function Cargando({
  texto,
  children,
}: {
  texto: string
  children?: React.ReactNode
}) {
  return (
    <main className="pagina" aria-busy="true" aria-live="polite">
      <span className="solo-lectores">{texto}</span>
      <div className="cargando-marca">
        <Image
          src="/marca/casita-dulce-completo.png"
          alt=""
          width={132}
          height={132}
          priority
          className="cargando-logo"
        />
        <p className="nota" aria-hidden="true">
          {texto}
        </p>
      </div>
      {children}
    </main>
  )
}
