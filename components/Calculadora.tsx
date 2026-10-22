'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  costear,
  escalar,
  UNIDAD_DE_USO,
  type Ingrediente,
  type Receta,
} from '@/lib/costeo.ts'
import { plata, porcentaje } from '@/lib/format.ts'
import { accionGuardarReceta } from '@/app/acciones.ts'
import { Icono } from './Icono.tsx'
import { Presupuesto } from './Presupuesto.tsx'

const id = () => Math.random().toString(36).slice(2, 11)

/** Acepta "1.250,5" y "1250.5" por igual: ella escribe como escribe. */
function aNumero(v: string): number | null {
  const limpio = v.trim().replace(/\s/g, '')
  if (limpio === '') return null
  const normal = limpio.includes(',')
    ? limpio.replace(/\./g, '').replace(',', '.')
    : limpio
  const x = Number(normal)
  return Number.isFinite(x) ? x : null
}

const texto = (v: number | null) => (v === null ? '' : String(v))

export function Calculadora({
  inicial,
  catalogo,
}: {
  inicial: Receta
  catalogo: Ingrediente[]
}) {
  const [receta, setReceta] = useState<Receta>(inicial)
  const [guardando, iniciarGuardado] = useTransition()
  const [guardado, setGuardado] = useState(false)
  const router = useRouter()

  const porId = useMemo(() => new Map(catalogo.map((i) => [i.id, i])), [catalogo])
  const costeo = useMemo(() => costear(receta, porId), [receta, porId])

  const cambiar = (parcial: Partial<Receta>) => {
    setReceta((r) => ({ ...r, ...parcial }))
    setGuardado(false)
  }

  const guardar = () => {
    if (!receta.nombre.trim()) return
    iniciarGuardado(async () => {
      const { id: nuevoId } = await accionGuardarReceta(receta)
      setReceta((r) => ({ ...r, id: nuevoId }))
      setGuardado(true)
      router.refresh()
    })
  }

  const puedeGuardar = receta.nombre.trim().length > 0 && !guardando

  return (
    <div className="doble">
      <div className="columna">
        <DatosDeLaReceta receta={receta} cambiar={cambiar} costeo={costeo} />

        <CampoIngredientes
          receta={receta}
          cambiar={cambiar}
          catalogo={catalogo}
          costeo={costeo}
        />

        <CampoManoDeObra receta={receta} cambiar={cambiar} subtotal={costeo.manoDeObra} />

        <CampoExtras receta={receta} cambiar={cambiar} subtotal={costeo.extras} />

        <CampoMargen receta={receta} cambiar={cambiar} costeo={costeo} />
      </div>

      <aside className="columna">
        <Resumen
          costeo={costeo}
          receta={receta}
          guardar={guardar}
          puedeGuardar={puedeGuardar}
          guardando={guardando}
          guardado={guardado}
        />
        <Presupuesto receta={receta} costeo={costeo} catalogo={porId} />
      </aside>

      <div className="riel">
        <div className="riel-cifras">
          <div className="riel-rotulo">
            {costeo.incierto ? 'Costo total (incompleto)' : 'Costo total'}
          </div>
          <div className="riel-total cifra">{plata(costeo.total)}</div>
        </div>
        <button
          type="button"
          className="boton"
          onClick={guardar}
          disabled={!puedeGuardar}
        >
          <Icono nombre={guardado ? 'listo' : 'guardar'} tam={18} />
          {guardado ? 'Guardada' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

// ─── Datos de la receta ──────────────────────────────────────────────────────

function DatosDeLaReceta({
  receta,
  cambiar,
  costeo,
}: {
  receta: Receta
  cambiar: (p: Partial<Receta>) => void
  costeo: ReturnType<typeof costear>
}) {
  const [rindeDestino, setRindeDestino] = useState('')

  const aplicarEscala = () => {
    const destino = aNumero(rindeDestino)
    if (!destino || destino <= 0 || !receta.rinde) return
    const escalada = escalar(receta, destino)
    cambiar({
      rinde: escalada.rinde,
      ingredientes: escalada.ingredientes,
      manoDeObra: escalada.manoDeObra,
    })
    setRindeDestino('')
  }

  return (
    <section className="campo campo--datos">
      <div className="campo-cabeza">
        <h2>Datos de la receta</h2>
      </div>
      <div className="campo-cuerpo">
        <div>
          <label className="etiqueta" htmlFor="receta-nombre">
            Nombre de la receta
          </label>
          <input
            id="receta-nombre"
            className="entrada entrada--grande"
            value={receta.nombre}
            onChange={(e) => cambiar({ nombre: e.target.value })}
            placeholder="Chocotorta, Lemon pie, Alfajores…"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="etiqueta" htmlFor="receta-desc">
            Descripción (opcional)
          </label>
          <input
            id="receta-desc"
            className="entrada"
            value={receta.descripcion}
            onChange={(e) => cambiar({ descripcion: e.target.value })}
            placeholder="Para quién es, tamaño, detalles del pedido…"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="etiqueta" htmlFor="receta-rinde">
            Cantidad que rinde (porciones o unidades)
          </label>
          <input
            id="receta-rinde"
            className="entrada entrada--numero"
            inputMode="decimal"
            value={texto(receta.rinde)}
            onChange={(e) => cambiar({ rinde: aNumero(e.target.value) })}
            placeholder="0"
          />
        </div>

        {receta.rinde && receta.rinde > 0 ? (
          <div className="linea-fila" style={{ flexWrap: 'wrap' }}>
            <label className="etiqueta" htmlFor="escalar-a" style={{ marginBottom: 0 }}>
              Escalar a
            </label>
            <input
              id="escalar-a"
              className="entrada entrada--numero"
              inputMode="decimal"
              value={rindeDestino}
              onChange={(e) => setRindeDestino(e.target.value)}
              placeholder={String(receta.rinde * 2)}
              style={{ maxWidth: 110 }}
            />
            <button
              type="button"
              className="boton boton--chico boton--fantasma"
              onClick={aplicarEscala}
              disabled={!aNumero(rindeDestino)}
            >
              <Icono nombre="escalar" tam={16} />
              Recalcular cantidades
            </button>
          </div>
        ) : null}

        {costeo.costoPorPorcion !== null ? (
          <p className="bajada" style={{ margin: 0, fontSize: 14 }}>
            Cada porción te cuesta{' '}
            <strong className="cifra">{plata(costeo.costoPorPorcion)}</strong>.
          </p>
        ) : null}
      </div>
    </section>
  )
}

// ─── Ingredientes ────────────────────────────────────────────────────────────

function CampoIngredientes({
  receta,
  cambiar,
  catalogo,
  costeo,
}: {
  receta: Receta
  cambiar: (p: Partial<Receta>) => void
  catalogo: Ingrediente[]
  costeo: ReturnType<typeof costear>
}) {
  const agregar = () =>
    cambiar({
      ingredientes: [
        ...receta.ingredientes,
        { id: id(), ingredienteId: null, cantidad: null },
      ],
    })

  const editar = (lineaId: string, parcial: { ingredienteId?: string | null; cantidad?: number | null }) =>
    cambiar({
      ingredientes: receta.ingredientes.map((l) =>
        l.id === lineaId ? { ...l, ...parcial } : l,
      ),
    })

  const quitar = (lineaId: string) =>
    cambiar({ ingredientes: receta.ingredientes.filter((l) => l.id !== lineaId) })

  const porCategoria = useMemo(() => {
    const m = new Map<string, Ingrediente[]>()
    for (const i of catalogo) {
      const l = m.get(i.categoria)
      if (l) l.push(i)
      else m.set(i.categoria, [i])
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'))
  }, [catalogo])

  return (
    <section className="campo campo--ingredientes">
      <div className="campo-cabeza">
        <h2>Ingredientes</h2>
        <span className="campo-subtotal cifra">{plata(costeo.ingredientes)}</span>
      </div>
      <div className="campo-cuerpo">
        {catalogo.length === 0 ? (
          <div className="aviso aviso--neutro">
            <Icono nombre="lista" tam={18} />
            <span>
              Todavía no hay ingredientes cargados.{' '}
              <Link href="/ingredientes">Cargá los tuyos primero</Link> y después volvé acá.
            </span>
          </div>
        ) : null}

        {receta.ingredientes.map((linea) => {
          const detalle = costeo.lineas.find((l) => l.linea.id === linea.id)
          const ing = detalle?.ingrediente ?? null
          const incierto = detalle?.incierto ?? false
          return (
            <div
              key={linea.id}
              className={`linea linea--ingrediente${incierto && linea.cantidad ? ' linea--incierta' : ''}`}
            >
              <div>
                <label className="solo-lectores" htmlFor={`ing-${linea.id}`}>
                  Ingrediente
                </label>
                <select
                  id={`ing-${linea.id}`}
                  className="selector"
                  value={linea.ingredienteId ?? ''}
                  onChange={(e) => editar(linea.id, { ingredienteId: e.target.value || null })}
                >
                  <option value="">Elegí un ingrediente…</option>
                  {porCategoria.map(([categoria, items]) => (
                    <optgroup key={categoria} label={categoria}>
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.nombre}
                          {i.precioConfirmado ? '' : ' — falta precio'}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="con-sufijo">
                <label className="solo-lectores" htmlFor={`cant-${linea.id}`}>
                  Cantidad
                </label>
                <input
                  id={`cant-${linea.id}`}
                  className="entrada entrada--numero"
                  inputMode="decimal"
                  value={texto(linea.cantidad)}
                  onChange={(e) => editar(linea.id, { cantidad: aNumero(e.target.value) })}
                  placeholder="0"
                />
                <span className="sufijo">{ing ? UNIDAD_DE_USO[ing.unidad] : '—'}</span>
              </div>

              <div className="linea-fila">
                {incierto && linea.cantidad ? (
                  <span className="linea-costo linea-costo--incierto">
                    {detalle?.motivo === 'sin-precio' ? 'Falta el precio' : 'Elegí el ingrediente'}
                  </span>
                ) : (
                  <span className="linea-costo cifra">{plata(detalle?.costo ?? 0)}</span>
                )}
                <button
                  type="button"
                  className="boton boton--chico boton--fantasma boton--peligro"
                  onClick={() => quitar(linea.id)}
                  aria-label="Quitar este ingrediente"
                >
                  <Icono nombre="basura" tam={16} />
                </button>
              </div>
            </div>
          )
        })}

        <button type="button" className="boton boton--agregar" onClick={agregar}>
          <Icono nombre="mas" tam={18} />
          Agregar ingrediente
        </button>

        {costeo.sinPrecio.length > 0 ? (
          <div className="aviso">
            <Icono nombre="alerta" tam={18} />
            <span>
              {costeo.sinPrecio.length === 1
                ? `${costeo.sinPrecio[0]} todavía no tiene precio, así que no está sumando.`
                : `${costeo.sinPrecio.length} ingredientes no tienen precio, así que no están sumando: ${costeo.sinPrecio.join(', ')}.`}{' '}
              El total de abajo es un piso, no el costo real.{' '}
              <Link href="/ingredientes">Completar precios</Link>
            </span>
          </div>
        ) : null}
      </div>
    </section>
  )
}

// ─── Mano de obra ────────────────────────────────────────────────────────────

function CampoManoDeObra({
  receta,
  cambiar,
  subtotal,
}: {
  receta: Receta
  cambiar: (p: Partial<Receta>) => void
  subtotal: number
}) {
  const agregar = () =>
    cambiar({
      manoDeObra: [
        ...receta.manoDeObra,
        { id: id(), concepto: '', horas: null, valorHora: receta.manoDeObra.at(-1)?.valorHora ?? null },
      ],
    })

  const editar = (lineaId: string, parcial: Partial<Receta['manoDeObra'][number]>) =>
    cambiar({
      manoDeObra: receta.manoDeObra.map((l) => (l.id === lineaId ? { ...l, ...parcial } : l)),
    })

  const quitar = (lineaId: string) =>
    cambiar({ manoDeObra: receta.manoDeObra.filter((l) => l.id !== lineaId) })

  return (
    <section className="campo campo--mano">
      <div className="campo-cabeza">
        <h2>Mano de obra</h2>
        <span className="campo-subtotal cifra">{plata(subtotal)}</span>
      </div>
      <div className="campo-cuerpo">
        {receta.manoDeObra.length === 0 ? (
          <p className="bajada" style={{ margin: 0, fontSize: 14 }}>
            Tu tiempo también es un costo. Si no lo querés contar, dejalo vacío.
          </p>
        ) : null}

        {receta.manoDeObra.map((l) => (
          <div key={l.id} className="linea linea--mano">
            <div>
              <label className="solo-lectores" htmlFor={`mo-c-${l.id}`}>
                Concepto
              </label>
              <input
                id={`mo-c-${l.id}`}
                className="entrada"
                value={l.concepto}
                onChange={(e) => editar(l.id, { concepto: e.target.value })}
                placeholder="Elaboración, decoración…"
                autoComplete="off"
              />
            </div>
            <div className="con-sufijo">
              <label className="solo-lectores" htmlFor={`mo-h-${l.id}`}>
                Horas
              </label>
              <input
                id={`mo-h-${l.id}`}
                className="entrada entrada--numero"
                inputMode="decimal"
                value={texto(l.horas)}
                onChange={(e) => editar(l.id, { horas: aNumero(e.target.value) })}
                placeholder="0"
              />
              <span className="sufijo">h</span>
            </div>
            <div>
              <label className="solo-lectores" htmlFor={`mo-v-${l.id}`}>
                Valor por hora
              </label>
              <input
                id={`mo-v-${l.id}`}
                className="entrada entrada--numero"
                inputMode="decimal"
                value={texto(l.valorHora)}
                onChange={(e) => editar(l.id, { valorHora: aNumero(e.target.value) })}
                placeholder="$ por hora"
              />
            </div>
            <div className="linea-fila">
              <span className="linea-costo cifra">
                {plata((l.horas ?? 0) * (l.valorHora ?? 0))}
              </span>
              <button
                type="button"
                className="boton boton--chico boton--fantasma boton--peligro"
                onClick={() => quitar(l.id)}
                aria-label="Quitar esta línea"
              >
                <Icono nombre="basura" tam={16} />
              </button>
            </div>
          </div>
        ))}

        <button type="button" className="boton boton--agregar" onClick={agregar}>
          <Icono nombre="mas" tam={18} />
          Agregar mano de obra
        </button>
      </div>
    </section>
  )
}

// ─── Packaging y extras ──────────────────────────────────────────────────────

function CampoExtras({
  receta,
  cambiar,
  subtotal,
}: {
  receta: Receta
  cambiar: (p: Partial<Receta>) => void
  subtotal: number
}) {
  const agregar = () =>
    cambiar({ extras: [...receta.extras, { id: id(), concepto: '', monto: null }] })

  const editar = (lineaId: string, parcial: Partial<Receta['extras'][number]>) =>
    cambiar({
      extras: receta.extras.map((l) => (l.id === lineaId ? { ...l, ...parcial } : l)),
    })

  const quitar = (lineaId: string) =>
    cambiar({ extras: receta.extras.filter((l) => l.id !== lineaId) })

  return (
    <section className="campo campo--extras">
      <div className="campo-cabeza">
        <h2>Packaging y gastos extras</h2>
        <span className="campo-subtotal cifra">{plata(subtotal)}</span>
      </div>
      <div className="campo-cuerpo">
        {receta.extras.length === 0 ? (
          <p className="bajada" style={{ margin: 0, fontSize: 14 }}>
            Cajas, bandejas, cintas, envío, publicidad. Todo lo que pagás aparte de los
            ingredientes.
          </p>
        ) : null}

        {receta.extras.map((l) => (
          <div key={l.id} className="linea linea--extra">
            <div>
              <label className="solo-lectores" htmlFor={`ex-c-${l.id}`}>
                Concepto
              </label>
              <input
                id={`ex-c-${l.id}`}
                className="entrada"
                value={l.concepto}
                onChange={(e) => editar(l.id, { concepto: e.target.value })}
                placeholder="Caja, bandeja, envío…"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="solo-lectores" htmlFor={`ex-m-${l.id}`}>
                Monto
              </label>
              <input
                id={`ex-m-${l.id}`}
                className="entrada entrada--numero"
                inputMode="decimal"
                value={texto(l.monto)}
                onChange={(e) => editar(l.id, { monto: aNumero(e.target.value) })}
                placeholder="$ 0"
              />
            </div>
            <button
              type="button"
              className="boton boton--chico boton--fantasma boton--peligro"
              onClick={() => quitar(l.id)}
              aria-label="Quitar este gasto"
            >
              <Icono nombre="basura" tam={16} />
            </button>
          </div>
        ))}

        <button type="button" className="boton boton--agregar" onClick={agregar}>
          <Icono nombre="mas" tam={18} />
          Agregar gasto
        </button>
      </div>
    </section>
  )
}

// ─── Margen ──────────────────────────────────────────────────────────────────

const SUGERIDOS = [0.5, 0.75, 1, 1.5]

function CampoMargen({
  receta,
  cambiar,
  costeo,
}: {
  receta: Receta
  cambiar: (p: Partial<Receta>) => void
  costeo: ReturnType<typeof costear>
}) {
  return (
    <section className="campo campo--datos">
      <div className="campo-cabeza">
        <h2>Margen de ganancia</h2>
      </div>
      <div className="campo-cuerpo">
        <div className="con-sufijo">
          <label className="solo-lectores" htmlFor="margen">
            Margen de ganancia deseado
          </label>
          <input
            id="margen"
            className="entrada entrada--numero entrada--grande"
            inputMode="decimal"
            value={receta.margen === 0 ? '' : String(Math.round(receta.margen * 1000) / 10)}
            onChange={(e) => {
              const v = aNumero(e.target.value)
              cambiar({ margen: v === null ? 0 : v / 100 })
            }}
            placeholder="0"
          />
          <span className="sufijo">%</span>
        </div>

        <div className="fila-acciones">
          {SUGERIDOS.map((m) => (
            <button
              key={m}
              type="button"
              className="boton boton--chico boton--fantasma"
              onClick={() => cambiar({ margen: m })}
              aria-pressed={Math.abs(receta.margen - m) < 0.001}
              style={
                Math.abs(receta.margen - m) < 0.001
                  ? { background: 'var(--grafito)', color: 'var(--tinta-sobre-esmalte)', borderColor: 'var(--rim)' }
                  : undefined
              }
            >
              {porcentaje(m)}
            </button>
          ))}
        </div>

        <div className="aviso aviso--neutro">
          <Icono nombre="alerta" tam={18} />
          <span>
            Este porcentaje se suma <strong>sobre el costo</strong>, como en tu planilla. Con{' '}
            {porcentaje(receta.margen)} de recargo, de cada venta te queda{' '}
            <strong>{porcentaje(costeo.margenSobreVenta)}</strong> de ganancia real.
          </span>
        </div>
      </div>
    </section>
  )
}

// ─── Resumen ─────────────────────────────────────────────────────────────────

function Resumen({
  costeo,
  receta,
  guardar,
  puedeGuardar,
  guardando,
  guardado,
}: {
  costeo: ReturnType<typeof costear>
  receta: Receta
  guardar: () => void
  puedeGuardar: boolean
  guardando: boolean
  guardado: boolean
}) {
  return (
    <div className="total-caja">
      <div className="total-seccion">
        <div className="total-renglon">
          <span>Ingredientes</span>
          <span className="cifra">{plata(costeo.ingredientes)}</span>
        </div>
        <div className="total-renglon">
          <span>Mano de obra</span>
          <span className="cifra">{plata(costeo.manoDeObra)}</span>
        </div>
        <div className="total-renglon">
          <span>Packaging y extras</span>
          <span className="cifra">{plata(costeo.extras)}</span>
        </div>
        <div className="total-renglon total-renglon--fuerte">
          <span>Costo total de producción</span>
        </div>
        <span className="total-grande">{plata(costeo.total)}</span>
        {costeo.costoPorPorcion !== null ? (
          <div className="total-renglon" style={{ marginTop: 8 }}>
            <span>Costo por porción</span>
            <span className="cifra">{plata(costeo.costoPorPorcion)}</span>
          </div>
        ) : null}
      </div>

      <div className="total-seccion total-venta">
        <div className="total-renglon">
          <span>Ganancia ({porcentaje(receta.margen)} sobre el costo)</span>
          <span className="cifra">{plata(costeo.ganancia)}</span>
        </div>
        <div className="total-renglon total-renglon--fuerte">
          <span>Precio de venta sugerido</span>
        </div>
        <span className="total-grande">{plata(costeo.precioVenta)}</span>
        {costeo.precioPorPorcion !== null ? (
          <div className="total-renglon" style={{ marginTop: 8 }}>
            <span>Precio por porción</span>
            <span className="cifra">{plata(costeo.precioPorPorcion)}</span>
          </div>
        ) : null}
      </div>

      <div className="total-seccion">
        <button
          type="button"
          className="boton boton--principal"
          onClick={guardar}
          disabled={!puedeGuardar}
          style={{ width: '100%', background: 'var(--crema)', color: 'var(--tinta)' }}
        >
          <Icono nombre={guardado ? 'listo' : 'guardar'} tam={18} />
          {guardando ? 'Guardando…' : guardado ? 'Receta guardada' : 'Guardar receta'}
        </button>
        {!receta.nombre.trim() ? (
          <p
            className="total-renglon"
            style={{ marginTop: 8, display: 'block', fontSize: 13 }}
          >
            Poné un nombre arriba para poder guardarla.
          </p>
        ) : null}
      </div>
    </div>
  )
}
