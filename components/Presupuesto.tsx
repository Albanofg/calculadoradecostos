'use client'

import { useState } from 'react'
import type { costear, Ingrediente, Receta } from '@/lib/costeo.ts'
import { plata } from '@/lib/format.ts'
import { Icono } from './Icono.tsx'

/**
 * El texto que le manda al cliente por WhatsApp.
 * Muestra sólo el precio y lo que incluye: nunca sus costos ni su margen.
 */
function armarTexto(
  receta: Receta,
  costeo: ReturnType<typeof costear>,
  catalogo: Map<string, Ingrediente>,
): string {
  const lineas: string[] = []
  lineas.push(receta.nombre.trim() || 'Presupuesto')
  if (receta.descripcion.trim()) lineas.push(receta.descripcion.trim())
  lineas.push('')

  if (receta.rinde && receta.rinde > 0) {
    lineas.push(`Rinde: ${receta.rinde} porciones`)
  }

  const nombres = receta.ingredientes
    .map((l) => (l.ingredienteId ? catalogo.get(l.ingredienteId)?.nombre : null))
    .filter((n): n is string => Boolean(n))
  if (nombres.length > 0) {
    lineas.push(`Lleva: ${nombres.join(', ')}`)
  }

  const packaging = receta.extras
    .map((e) => e.concepto.trim())
    .filter(Boolean)
  if (packaging.length > 0) {
    lineas.push(`Incluye: ${packaging.join(', ')}`)
  }

  lineas.push('')
  lineas.push(`Precio: ${plata(costeo.precioVenta)}`)
  if (costeo.precioPorPorcion !== null) {
    lineas.push(`(${plata(costeo.precioPorPorcion)} por porción)`)
  }

  return lineas.join('\n')
}

export function Presupuesto({
  receta,
  costeo,
  catalogo,
}: {
  receta: Receta
  costeo: ReturnType<typeof costear>
  catalogo: Map<string, Ingrediente>
}) {
  const [abierto, setAbierto] = useState(false)
  const [estado, setEstado] = useState<'listo' | 'copiado' | 'manual'>('listo')

  const contenido = armarTexto(receta, costeo, catalogo)

  /**
   * Algunos navegadores rechazan el portapapeles. Cuando pasa, seleccionamos el
   * texto y lo decimos: tocar un botón y que no pase nada visible es peor que
   * el error.
   */
  const copiar = async () => {
    const area = document.getElementById('presupuesto-texto') as HTMLTextAreaElement | null
    try {
      await navigator.clipboard.writeText(contenido)
      setEstado('copiado')
      setTimeout(() => setEstado('listo'), 2200)
    } catch {
      area?.focus()
      area?.select()
      setEstado('manual')
    }
  }

  const copiado = estado === 'copiado'

  if (costeo.precioVenta <= 0) return null

  return (
    <section className="campo campo--ingredientes">
      <div className="campo-cabeza">
        <h2>Presupuesto para el cliente</h2>
      </div>
      <div className="campo-cuerpo">
        {!abierto ? (
          <button
            type="button"
            className="boton boton--agregar"
            onClick={() => setAbierto(true)}
          >
            <Icono nombre="copiar" tam={18} />
            Armar texto para mandar
          </button>
        ) : (
          <>
            <label className="etiqueta" htmlFor="presupuesto-texto">
              Esto ve el cliente. No incluye tus costos ni tu margen.
            </label>
            <textarea
              id="presupuesto-texto"
              className="entrada"
              rows={9}
              value={contenido}
              readOnly
              style={{ resize: 'vertical', lineHeight: 1.5 }}
            />
            <div className="fila-acciones">
              <button type="button" className="boton boton--principal" onClick={copiar}>
                <Icono nombre={copiado ? 'listo' : 'copiar'} tam={18} />
                {copiado ? 'Copiado' : 'Copiar texto'}
              </button>
              <button
                type="button"
                className="boton boton--fantasma"
                onClick={() => {
                  setAbierto(false)
                  setEstado('listo')
                }}
              >
                Cerrar
              </button>
            </div>

            {estado === 'manual' ? (
              <div className="aviso aviso--neutro">
                <Icono nombre="copiar" tam={18} />
                <span>
                  Tu navegador no nos deja copiar solo. Ya te dejamos el texto seleccionado:
                  copialo a mano y pegalo en WhatsApp.
                </span>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  )
}
