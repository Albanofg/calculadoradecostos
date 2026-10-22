'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Una cifra que rueda hasta su valor nuevo en vez de saltar.
 *
 * Es el gesto central de la app: mientras ella tipea una cantidad, el total se
 * mueve y se entiende que el número cambió por lo que acaba de escribir. Un
 * salto seco no comunica eso.
 *
 * Interpola con requestAnimationFrame y se corta sola si el usuario pidió menos
 * movimiento, en cuyo caso el valor se actualiza directo.
 */

const menosMovimiento = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Misma curva que el resto de la app: arranca rápido y frena. */
const salida = (t: number) => 1 - Math.pow(1 - t, 3)

export function CifraAnimada({
  valor,
  formato,
  duracion = 420,
  className = '',
}: {
  valor: number
  formato: (n: number) => string
  duracion?: number
  className?: string
}) {
  const [mostrado, setMostrado] = useState(valor)
  const desde = useRef(valor)
  const cuadro = useRef<number | null>(null)
  const [late, setLate] = useState(false)

  useEffect(() => {
    const destino = Number.isFinite(valor) ? valor : 0
    const origen = desde.current

    if (origen === destino) return

    if (menosMovimiento() || duracion <= 0) {
      desde.current = destino
      setMostrado(destino)
      return
    }

    // Un cambio chico no justifica una animación; se vería como un tic.
    if (Math.abs(destino - origen) < 0.005) {
      desde.current = destino
      setMostrado(destino)
      return
    }

    const inicio = performance.now()
    if (cuadro.current !== null) cancelAnimationFrame(cuadro.current)

    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - inicio) / duracion)
      const v = origen + (destino - origen) * salida(t)
      setMostrado(v)
      if (t < 1) {
        cuadro.current = requestAnimationFrame(paso)
      } else {
        desde.current = destino
        setMostrado(destino)
        cuadro.current = null
      }
    }
    cuadro.current = requestAnimationFrame(paso)

    setLate(true)
    const fin = setTimeout(() => setLate(false), 340)

    return () => {
      if (cuadro.current !== null) cancelAnimationFrame(cuadro.current)
      clearTimeout(fin)
    }
  }, [valor, duracion])

  return (
    <span
      className={`${className} cifra${late ? ' cifra-cambia' : ''}`}
      // El lector de pantalla anuncia el valor real, no cada paso intermedio.
      aria-label={formato(valor)}
    >
      <span aria-hidden="true">{formato(mostrado)}</span>
    </span>
  )
}
