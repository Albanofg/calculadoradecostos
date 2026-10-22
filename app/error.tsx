'use client'

import { Icono } from '@/components/Icono.tsx'

/**
 * La falla más probable en producción es que falte DATABASE_URL o que la base
 * no responda. Mostramos qué pasó en vez de la pantalla de error de Next.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const faltaBase = /DATABASE_URL/i.test(error.message)

  return (
    <main className="pagina">
      <div className="vacio">
        <div className="vacio-tarjeta">
          <Icono nombre="alerta" tam={28} />
          <h2>{faltaBase ? 'Falta conectar la base de datos' : 'Algo se rompió'}</h2>
          <p>
            {faltaBase
              ? error.message
              : 'No pudimos cargar esta pantalla. Tus datos están guardados; esto es un problema de la app, no de lo que cargaste.'}
          </p>
          {!faltaBase && error.digest ? (
            <p className="nota">Código {error.digest}</p>
          ) : null}
          <button type="button" className="boton boton--principal" onClick={reset}>
            Reintentar
          </button>
        </div>
      </div>
    </main>
  )
}
