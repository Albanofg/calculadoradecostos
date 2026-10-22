'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Deja que algo se anime antes de desaparecer.
 *
 * Borrar una fila y que se esfume de golpe se lee como un error: no queda
 * claro si se borró la que tocaste. Esto marca el elemento como "saliendo",
 * espera a que termine la animación y recién ahí lo quita de verdad.
 *
 * Si el usuario pidió menos movimiento, se borra al toque.
 */
const MS = 220

export function useSalida(quitar: (id: string) => void) {
  const [saliendo, setSaliendo] = useState<Set<string>>(new Set())
  const temporizadores = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const vigentes = temporizadores.current
    return () => {
      for (const t of vigentes.values()) clearTimeout(t)
      vigentes.clear()
    }
  }, [])

  const pedirSalida = useCallback(
    (id: string) => {
      const sinMovimiento =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

      if (sinMovimiento) {
        quitar(id)
        return
      }

      // Dos clicks seguidos en el mismo botón no deben encolar dos borrados.
      if (temporizadores.current.has(id)) return

      setSaliendo((s) => new Set(s).add(id))
      const t = setTimeout(() => {
        temporizadores.current.delete(id)
        setSaliendo((s) => {
          const n = new Set(s)
          n.delete(id)
          return n
        })
        quitar(id)
      }, MS)
      temporizadores.current.set(id, t)
    },
    [quitar],
  )

  const clase = useCallback((id: string) => (saliendo.has(id) ? ' se-va' : ''), [saliendo])

  return { pedirSalida, clase }
}
