'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  costear,
  precioPorCantidad,
  urlFoto,
  type Ingrediente,
  type Receta,
  type Tramo,
} from '@/lib/costeo.ts'
import { plata } from '@/lib/format.ts'
import { CifraAnimada } from './CifraAnimada.tsx'
import { Icono } from './Icono.tsx'

/**
 * Un presupuesto es un pedido: cantidades de recetas ya guardadas.
 *
 * Trabaja a nivel receta, no de ingredientes. Al cliente no le interesa que
 * lleve 500 g de harina; le interesa que son dos budines y cuánto sale.
 */

type Linea = { id: string; recetaId: string; cantidad: number }

/**
 * Los ids se cuentan, no se sortean.
 *
 * Con `Math.random()` la primera línea salía con un id en el servidor y otro
 * en el cliente, y React no podía hidratar: el `htmlFor` del label y el `id`
 * del input no coincidían.
 */
const nuevaLinea = (n: number): Linea => ({
  id: `pedido-${n}`,
  recetaId: '',
  cantidad: 1,
})

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function archivo(cliente: string): string {
  const limpio = cliente
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
  return limpio ? `Presupuesto-${limpio}.pdf` : 'Presupuesto.pdf'
}

async function traerImagen(url: string): Promise<string | null> {
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    const blob = await r.blob()
    return await new Promise<string | null>((resolver) => {
      const lector = new FileReader()
      lector.onloadend = () =>
        resolver(typeof lector.result === 'string' ? lector.result : null)
      lector.onerror = () => resolver(null)
      lector.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

type ItemPdf = {
  cantidad: number
  nombre: string
  unitario: number
  subtotal: number
  /** Lo que saldría sin el descuento por cantidad. Igual al subtotal si no hay. */
  sinDescuento: number
  fotoId: string | null
}

async function generarPdf(
  cliente: string,
  nota: string,
  items: ItemPdf[],
  total: number,
  validezDias: number,
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const ANCHO = 210
  const M = 18
  const util = ANCHO - M * 2
  const hoy = new Date()

  // Encabezado
  doc.setFillColor(46, 61, 49)
  doc.rect(0, 0, ANCHO, 40, 'F')
  doc.setTextColor(251, 249, 243)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text('Casita Dulce', M, 20)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(
    `Presupuesto · ${hoy.getDate()} de ${MESES[hoy.getMonth()]} de ${hoy.getFullYear()}`,
    M,
    29,
  )
  if (cliente.trim()) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(`Para ${cliente.trim()}`, ANCHO - M, 30, { align: 'right' })
  }

  let y = 56

  // Miniatura de la primera receta que tenga foto
  const conFoto = items.find((i) => i.fotoId)
  if (conFoto?.fotoId) {
    const img = await traerImagen(urlFoto(conFoto.fotoId))
    if (img) {
      try {
        const props = doc.getImageProperties(img)
        const alto = 42
        const ancho = Math.min((props.width / props.height) * alto, 70)
        doc.addImage(img, 'JPEG', ANCHO - M - ancho, y - 6, ancho, alto)
      } catch {
        /* sigue sin la foto */
      }
    }
  }

  // Encabezado de la tabla
  doc.setTextColor(90, 97, 86)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('CANT.', M, y)
  doc.text('DETALLE', M + 18, y)
  doc.text('PRECIO', ANCHO - M, y, { align: 'right' })
  y += 3
  doc.setDrawColor(204, 207, 194)
  doc.setLineWidth(0.3)
  doc.line(M, y, M + util, y)
  y += 8

  doc.setTextColor(38, 42, 36)
  for (const item of items) {
    if (y > 250) {
      doc.addPage()
      y = M + 10
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(String(item.cantidad), M, y)

    doc.setFont('helvetica', 'normal')
    const lineas = doc.splitTextToSize(item.nombre, util - 60)
    doc.text(lineas[0], M + 18, y)

    doc.setFont('helvetica', 'bold')
    doc.text(plata(item.subtotal), ANCHO - M, y, { align: 'right' })

    const conDescuento = item.sinDescuento > item.subtotal + 0.005
    if (item.cantidad > 1) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(90, 97, 86)
      const detalle = conDescuento
        ? `${plata(item.unitario)} cada uno — ${plata(item.sinDescuento)} sin descuento`
        : `${plata(item.unitario)} cada uno`
      doc.text(detalle, M + 18, y + 5)
      doc.setTextColor(38, 42, 36)
    }
    y += item.cantidad > 1 ? 14 : 10
  }

  // Total
  y += 4
  if (y > 240) {
    doc.addPage()
    y = M + 10
  }
  doc.setFillColor(125, 108, 63)
  doc.rect(M, y, util, 26, 'F')
  doc.setTextColor(251, 249, 243)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('TOTAL', M + 8, y + 10)
  doc.setFontSize(19)
  doc.text(plata(total), M + util - 8, y + 17, { align: 'right' })
  y += 38

  if (nota.trim()) {
    doc.setTextColor(38, 42, 36)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    for (const linea of doc.splitTextToSize(nota.trim(), util)) {
      if (y > 272) break
      doc.text(linea, M, y)
      y += 5.5
    }
  }

  doc.setTextColor(120, 128, 111)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(
    `Presupuesto válido por ${validezDias} días. Sujeto a disponibilidad de insumos.`,
    M,
    287,
  )

  doc.save(archivo(cliente))
}

export function ArmarPresupuesto({
  recetas,
  catalogo,
}: {
  recetas: Receta[]
  catalogo: Ingrediente[]
}) {
  const [lineas, setLineas] = useState<Linea[]>([nuevaLinea(0)])
  // Cuenta de líneas creadas, para que cada id nuevo sea único y estable.
  const contador = useRef(1)
  const agregarLinea = () => nuevaLinea(contador.current++)
  const [cliente, setCliente] = useState('')
  const [nota, setNota] = useState('')
  const [validez, setValidez] = useState(7)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const porId = useMemo(() => new Map(catalogo.map((i) => [i.id, i])), [catalogo])

  const recetario = useMemo(() => new Map(recetas.map((r) => [r.id, r])), [recetas])

  const precios = useMemo(() => {
    const m = new Map<
      string,
      { receta: Receta; precio: number; incierto: boolean; tramos: Tramo[] }
    >()
    for (const receta of recetas) {
      const c = costear(receta, porId, recetario)
      m.set(receta.id, {
        receta,
        precio: c.precioVenta,
        incierto: c.incierto,
        tramos: receta.tramos,
      })
    }
    return m
  }, [recetas, porId, recetario])

  const items = useMemo(
    () =>
      lineas
        .map((l) => {
          const datos = l.recetaId ? precios.get(l.recetaId) : undefined
          if (!datos) return null
          const { unitario, total, tramo } = precioPorCantidad(
            datos.precio,
            datos.tramos,
            l.cantidad,
          )
          return {
            linea: l,
            receta: datos.receta,
            unitario,
            subtotal: total,
            // Lo que costaría sin el descuento, para poder mostrarle el ahorro.
            sinDescuento: datos.precio * l.cantidad,
            tramo,
            incierto: datos.incierto,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    [lineas, precios],
  )

  const total = items.reduce((acc, i) => acc + i.subtotal, 0)
  const hayIncierto = items.some((i) => i.incierto)
  const puedeDescargar = items.length > 0 && total > 0 && !generando

  const cambiar = (id: string, parcial: Partial<Linea>) =>
    setLineas((ls) => ls.map((l) => (l.id === id ? { ...l, ...parcial } : l)))

  const descargar = async () => {
    setGenerando(true)
    setError(null)
    try {
      await generarPdf(
        cliente,
        nota,
        items.map((i) => ({
          cantidad: i.linea.cantidad,
          nombre: i.receta.nombre,
          unitario: i.unitario,
          subtotal: i.subtotal,
          sinDescuento: i.sinDescuento,
          fotoId: i.receta.fotos[0]?.id ?? null,
        })),
        total,
        validez,
      )
    } catch {
      setError('No pudimos armar el PDF. Probá de nuevo.')
    } finally {
      setGenerando(false)
    }
  }

  if (recetas.length === 0) {
    return (
      <div className="vacio">
        <div className="vacio-tarjeta">
          <Icono nombre="caja" tam={26} />
          <h2>Primero necesitás recetas guardadas</h2>
          <p>
            El presupuesto se arma eligiendo cuántas unidades de cada receta lleva el
            pedido. Guardá al menos una y volvé.
          </p>
          <Link href="/" className="boton boton--principal">
            <Icono nombre="calculadora" tam={18} />
            Crear una receta
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="doble">
      <div className="columna">
        <section className="campo campo--ingredientes">
          <header className="campo-cabeza">
            <h2>El pedido</h2>
            {items.length > 0 ? (
              <CifraAnimada className="campo-subtotal" valor={total} formato={plata} />
            ) : null}
          </header>
          <div className="campo-cuerpo">
            {lineas.map((linea) => {
              const item = items.find((i) => i.linea.id === linea.id)
              return (
                <div key={linea.id} className="linea linea--pedido">
                  <div className="pedido-cantidad">
                    <label className="solo-lectores" htmlFor={`cant-${linea.id}`}>
                      Cantidad
                    </label>
                    <button
                      type="button"
                      className="boton boton--chico boton--fantasma"
                      onClick={() =>
                        cambiar(linea.id, { cantidad: Math.max(1, linea.cantidad - 1) })
                      }
                      aria-label="Uno menos"
                    >
                      −
                    </button>
                    <input
                      id={`cant-${linea.id}`}
                      className="entrada entrada--numero"
                      inputMode="numeric"
                      value={linea.cantidad}
                      onChange={(e) => {
                        const v = parseInt(e.target.value.replace(/\D/g, ''), 10)
                        cambiar(linea.id, { cantidad: Number.isFinite(v) && v > 0 ? v : 1 })
                      }}
                    />
                    <button
                      type="button"
                      className="boton boton--chico boton--fantasma"
                      onClick={() => cambiar(linea.id, { cantidad: linea.cantidad + 1 })}
                      aria-label="Uno más"
                    >
                      +
                    </button>
                  </div>

                  <div>
                    <label className="solo-lectores" htmlFor={`receta-${linea.id}`}>
                      Receta
                    </label>
                    <select
                      id={`receta-${linea.id}`}
                      className="selector"
                      value={linea.recetaId}
                      onChange={(e) => cambiar(linea.id, { recetaId: e.target.value })}
                    >
                      <option value="">Elegí una receta…</option>
                      {recetas.map((r) => {
                        const p = precios.get(r.id)
                        return (
                          <option key={r.id} value={r.id}>
                            {r.nombre}
                            {p && p.precio > 0 ? ` — ${plata(p.precio)}` : ' — sin precio'}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  <div className="linea-fila">
                    <span className="linea-costo cifra">
                      {item ? plata(item.subtotal) : plata(0)}
                    </span>
                    <button
                      type="button"
                      className="boton boton--chico boton--fantasma boton--peligro"
                      onClick={() =>
                        setLineas((ls) =>
                          ls.length === 1
                            ? [agregarLinea()]
                            : ls.filter((l) => l.id !== linea.id),
                        )
                      }
                      aria-label="Quitar del pedido"
                    >
                      <Icono nombre="basura" tam={16} />
                    </button>
                  </div>
                </div>
              )
            })}

            <button
              type="button"
              className="boton boton--agregar"
              onClick={() => setLineas((ls) => [...ls, agregarLinea()])}
            >
              <Icono nombre="mas" tam={18} />
              Agregar otra receta
            </button>

            {hayIncierto ? (
              <div className="aviso">
                <Icono nombre="alerta" tam={18} />
                <span>
                  Alguna de estas recetas tiene ingredientes sin precio, así que el total
                  es un piso y no el precio real.{' '}
                  <Link href="/ingredientes">Completar precios</Link>
                </span>
              </div>
            ) : null}
          </div>
        </section>

        <section className="campo campo--datos">
          <header className="campo-cabeza">
            <h2>Datos del presupuesto</h2>
          </header>
          <div className="campo-cuerpo">
            <div>
              <label className="etiqueta" htmlFor="cliente">
                Para quién es
              </label>
              <input
                id="cliente"
                className="entrada"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Nombre del cliente"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="etiqueta" htmlFor="nota-presupuesto">
                Nota para el cliente (opcional)
              </label>
              <textarea
                id="nota-presupuesto"
                className="entrada"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Fecha de entrega, seña, forma de pago, lo que haga falta aclarar."
                rows={4}
              />
            </div>

            <div className="grupo-campo">
              <label className="etiqueta" htmlFor="validez">
                Validez del presupuesto
              </label>
              <div className="con-sufijo">
                <input
                  id="validez"
                  className="entrada entrada--numero"
                  inputMode="numeric"
                  value={validez}
                  onChange={(e) => {
                    const v = parseInt(e.target.value.replace(/\D/g, ''), 10)
                    setValidez(Number.isFinite(v) && v > 0 ? v : 7)
                  }}
                />
                <span className="sufijo">días</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <aside className="columna">
        <div className="total-caja">
          <div className="total-seccion">
            {items.length === 0 ? (
              <p className="nota nota--sobre-oscuro">
                Elegí recetas y cantidades para ver el total.
              </p>
            ) : (
              items.map((i) => (
                <div key={i.linea.id} className="total-renglon">
                  <span>
                    {i.linea.cantidad} × {i.receta.nombre}
                    {i.tramo ? (
                      <span className="marca-descuento">
                        −{plata(i.sinDescuento - i.subtotal)}
                      </span>
                    ) : null}
                  </span>
                  <span className="cifra">{plata(i.subtotal)}</span>
                </div>
              ))
            )}
          </div>

          <div className="total-seccion total-venta">
            <div className="total-renglon total-renglon--fuerte">
              <span>Total del pedido</span>
            </div>
            <CifraAnimada className="total-grande" valor={total} formato={plata} />
          </div>

          <div className="total-seccion total-pie">
            <button
              type="button"
              className="boton boton--ancho"
              onClick={descargar}
              disabled={!puedeDescargar}
            >
              <Icono nombre="descargar" tam={18} className="icono-baja" />
              {generando ? 'Armando el PDF…' : 'Descargar presupuesto'}
            </button>
            {items.length === 0 ? (
              <p className="nota nota--sobre-oscuro">
                Agregá al menos una receta al pedido.
              </p>
            ) : total <= 0 ? (
              <p className="nota nota--sobre-oscuro">
                Las recetas elegidas no tienen precio todavía.
              </p>
            ) : null}
            {error ? <p className="nota nota--sobre-oscuro">{error}</p> : null}
          </div>
        </div>
      </aside>

      <div className="riel">
        <div className="riel-cifras">
          <div className="riel-rotulo">Total del pedido</div>
          <CifraAnimada className="riel-total" valor={total} formato={plata} />
        </div>
        <button
          type="button"
          className="boton"
          onClick={descargar}
          disabled={!puedeDescargar}
        >
          <Icono nombre="descargar" tam={18} className="icono-baja" />
          PDF
        </button>
      </div>
    </div>
  )
}
