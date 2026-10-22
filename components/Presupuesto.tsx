'use client'

import { useState } from 'react'
import { urlFoto, type costear, type Ingrediente, type Receta } from '@/lib/costeo.ts'
import { plata } from '@/lib/format.ts'
import { Icono } from './Icono.tsx'

/** Trae la foto y la vuelve data URL, que es lo que jsPDF sabe incrustar. */
async function traerImagen(url: string): Promise<string | null> {
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    const blob = await r.blob()
    return await new Promise<string | null>((resolver) => {
      const lector = new FileReader()
      lector.onloadend = () => resolver(typeof lector.result === 'string' ? lector.result : null)
      lector.onerror = () => resolver(null)
      lector.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/**
 * El presupuesto que le manda al cliente, como PDF descargable.
 *
 * Muestra el precio y qué incluye. Nunca sus costos, sus horas ni su margen:
 * eso es información suya, no del cliente.
 */

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function nombreArchivo(nombre: string): string {
  const limpio = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
  return `Presupuesto-${limpio || 'receta'}.pdf`
}

async function generarPdf(
  receta: Receta,
  costeo: ReturnType<typeof costear>,
  catalogo: Map<string, Ingrediente>,
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const ANCHO = 210
  const MARGEN = 18
  const util = ANCHO - MARGEN * 2
  let y = 0

  // Banda superior
  doc.setFillColor(23, 24, 26)
  doc.rect(0, 0, ANCHO, 38, 'F')
  doc.setTextColor(247, 242, 231)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text(receta.nombre.trim() || 'Presupuesto', MARGEN, 20)

  const hoy = new Date()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(
    `Presupuesto del ${hoy.getDate()} de ${MESES[hoy.getMonth()]} de ${hoy.getFullYear()}`,
    MARGEN,
    29,
  )

  y = 52
  doc.setTextColor(26, 26, 26)

  if (receta.descripcion.trim()) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    for (const linea of doc.splitTextToSize(receta.descripcion.trim(), util)) {
      doc.text(linea, MARGEN, y)
      y += 6
    }
    y += 4
  }

  // Foto, si tiene. La imagen no viaja en la página, así que se pide acá.
  const foto = receta.fotos[0]
  if (foto) {
    const imagen = await traerImagen(urlFoto(foto.id))
    if (imagen) {
      try {
        const props = doc.getImageProperties(imagen)
        const ancho = Math.min(util, 110)
        const alto = Math.min((props.height / props.width) * ancho, 75)
        doc.addImage(imagen, 'JPEG', MARGEN, y, ancho, alto)
        y += alto + 10
      } catch {
        // Si no se puede incrustar, el presupuesto sigue sin ella.
      }
    }
  }

  const dato = (rotulo: string, valor: string) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(92, 84, 71)
    doc.text(rotulo.toUpperCase(), MARGEN, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(26, 26, 26)
    for (const linea of doc.splitTextToSize(valor, util)) {
      y += 6
      doc.text(linea, MARGEN, y)
    }
    y += 10
  }

  if (receta.rinde && receta.rinde > 0) {
    dato('Rinde', `${receta.rinde} porciones`)
  }

  const ingredientes = receta.ingredientes
    .map((l) => (l.ingredienteId ? catalogo.get(l.ingredienteId)?.nombre : null))
    .filter((x): x is string => Boolean(x))
  if (ingredientes.length > 0) dato('Lleva', ingredientes.join(', '))

  const incluye = receta.extras.map((e) => e.concepto.trim()).filter(Boolean)
  if (incluye.length > 0) dato('Incluye', incluye.join(', '))

  // Caja del precio
  if (y > 215) {
    doc.addPage()
    y = MARGEN
  }
  const altoCaja = costeo.precioPorPorcion !== null ? 40 : 30
  doc.setFillColor(14, 82, 80)
  doc.rect(MARGEN, y, util, altoCaja, 'F')
  doc.setTextColor(247, 242, 231)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('PRECIO', MARGEN + 8, y + 11)
  doc.setFontSize(24)
  doc.text(plata(costeo.precioVenta), MARGEN + 8, y + 24)
  if (costeo.precioPorPorcion !== null) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`${plata(costeo.precioPorPorcion)} por porción`, MARGEN + 8, y + 34)
  }

  doc.setTextColor(140, 132, 118)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Presupuesto sujeto a cambios según disponibilidad de insumos.', MARGEN, 285)

  doc.save(nombreArchivo(receta.nombre))
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
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sinPrecio = costeo.precioVenta <= 0
  const sinNombre = !receta.nombre.trim()
  const bloqueado = sinPrecio || sinNombre

  const descargar = async () => {
    setGenerando(true)
    setError(null)
    try {
      await generarPdf(receta, costeo, catalogo)
    } catch {
      setError('No pudimos armar el PDF. Probá de nuevo.')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <section className="campo campo--presupuesto">
      <header className="campo-cabeza">
        <h2>Presupuesto para el cliente</h2>
      </header>
      <div className="campo-cuerpo">
        <p className="nota">
          Un PDF con el precio y qué incluye, listo para mandar por WhatsApp. No muestra
          tus costos ni tu ganancia.
        </p>

        <button
          type="button"
          className="boton boton--principal boton--ancho"
          onClick={descargar}
          disabled={bloqueado || generando}
        >
          <Icono nombre="descargar" tam={18} />
          {generando ? 'Armando el PDF…' : 'Descargar presupuesto'}
        </button>

        {bloqueado ? (
          <p className="nota nota--aviso">
            {sinNombre
              ? 'Ponele un nombre a la receta para poder armarlo.'
              : 'Primero cargá ingredientes con precio: todavía no hay un precio para presupuestar.'}
          </p>
        ) : null}

        {error ? <p className="nota nota--error">{error}</p> : null}
      </div>
    </section>
  )
}
