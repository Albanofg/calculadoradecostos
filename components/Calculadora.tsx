'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  costear,
  costoDeTiempo,
  RINDE_TEXTO,
  UNIDADES_RINDE,
  escalar,
  UNIDAD_DE_USO,
  type Foto,
  type Ingrediente,
  type Receta,
} from '@/lib/costeo.ts'
import { plata, porcentaje } from '@/lib/format.ts'
import { accionGuardarReceta } from '@/app/acciones.ts'
import { Fotos } from './Fotos.tsx'
import { CifraAnimada } from './CifraAnimada.tsx'
import { Icono } from './Icono.tsx'
import { useSalida } from './useSalida.ts'

const id = () => Math.random().toString(36).slice(2, 11)

/** El sufijo que va al lado del campo de cantidad de una preparación. */
const UNIDAD_CORTA: Record<Receta['rindeUnidad'], string> = {
  PORCION: 'porc',
  G: 'g',
  ML: 'ml',
  UNIDAD: 'un',
}

/**
 * Aceptar una función además de un objeto importa para los borrados: la baja
 * de una fila se aplica con un retraso de 220ms (para que se anime la salida),
 * y dos clicks seguidos calculados sobre el estado viejo resucitarían la
 * primera fila. Con el updater siempre se parte del estado real.
 */
type Cambiar = (parcial: Partial<Receta> | ((r: Receta) => Partial<Receta>)) => void

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
  preparaciones = [],
}: {
  inicial: Receta
  catalogo: Ingrediente[]
  /** Las recetas marcadas como preparación, para poder usarlas adentro. */
  preparaciones?: Receta[]
}) {
  const [receta, setReceta] = useState<Receta>(inicial)
  const [guardando, iniciarGuardado] = useTransition()
  const [guardado, setGuardado] = useState(false)
  const router = useRouter()

  const porId = useMemo(() => new Map(catalogo.map((i) => [i.id, i])), [catalogo])
  const recetario = useMemo(
    () => new Map(preparaciones.map((r) => [r.id, r])),
    [preparaciones],
  )
  const costeo = useMemo(
    () => costear(receta, porId, recetario),
    [receta, porId, recetario],
  )

  const cambiar: Cambiar = (parcial) => {
    setReceta((r) => ({ ...r, ...(typeof parcial === 'function' ? parcial(r) : parcial) }))
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

        <CampoPreparaciones
          receta={receta}
          cambiar={cambiar}
          preparaciones={preparaciones}
          costeo={costeo}
        />

        <CampoManoDeObra receta={receta} cambiar={cambiar} subtotal={costeo.manoDeObra} />

        <CampoExtras receta={receta} cambiar={cambiar} subtotal={costeo.extras} />

        <CampoMargen receta={receta} cambiar={cambiar} costeo={costeo} />

        <CampoTramos receta={receta} cambiar={cambiar} costeo={costeo} />

        <CampoProcedimiento receta={receta} cambiar={cambiar} />

        <Fotos
          recetaId={receta.id}
          fotos={receta.fotos}
          onCambio={(fotos: Foto[]) => setReceta((r) => ({ ...r, fotos }))}
        />
      </div>

      <aside className="columna">
        <Resumen
          costeo={costeo}
          receta={receta}
          cambiar={cambiar}
          guardar={guardar}
          puedeGuardar={puedeGuardar}
          guardando={guardando}
          guardado={guardado}
        />
      </aside>

      <div className="riel">
        {/* El número grande es el precio de venta: es el que decide si cobra
            bien. El costo va chico al lado, porque igual lo quiere ver. */}
        <div className="riel-cifras">
          <div className="riel-rotulo">
            Precio de venta
            {costeo.incierto ? ' · incompleto' : null}
          </div>
          <CifraAnimada className="riel-total" valor={costeo.precioVenta} formato={plata} />
          <div className="riel-secundario">
            Costo <CifraAnimada valor={costeo.total} formato={plata} />
          </div>
        </div>
        <button
          type="button"
          className="boton"
          onClick={guardar}
          disabled={!puedeGuardar}
        >
          <Icono
            nombre={guardado ? 'listo' : 'guardar'}
            tam={18}
            className={guardado ? 'icono-dibuja' : undefined}
          />
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
  cambiar: Cambiar
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

        <div className="grupo-campos">
          <div className="grupo-campo">
            <label className="etiqueta" htmlFor="receta-rinde">
              {receta.esPreparacion ? 'Cuánto rinde esta preparación' : 'Cantidad que rinde'}
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
          <div className="grupo-campo">
            <label className="etiqueta" htmlFor="receta-rinde-unidad">
              En qué
            </label>
            <select
              id="receta-rinde-unidad"
              className="selector"
              value={receta.rindeUnidad}
              onChange={(e) =>
                cambiar({ rindeUnidad: e.target.value as Receta['rindeUnidad'] })
              }
            >
              {UNIDADES_RINDE.map((u) => (
                <option key={u} value={u}>
                  {RINDE_TEXTO[u]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Una preparación no se vende sola: se usa adentro de otras recetas.
            Por eso rinde gramos o mililitros en vez de porciones. */}
        <label className="interruptor">
          <input
            type="checkbox"
            checked={receta.esPreparacion}
            onChange={(e) => {
              const es = e.target.checked
              cambiar({
                esPreparacion: es,
                rindeUnidad: es && receta.rindeUnidad === 'PORCION' ? 'G' : receta.rindeUnidad,
              })
            }}
          />
          <span>
            <strong>Es una preparación</strong>
            <span className="nota">
              Un relleno, una crema, un almíbar: algo que usás adentro de otras recetas en
              vez de vender suelto.
            </span>
          </span>
        </label>

        {receta.rinde && receta.rinde > 0 ? (
          <div className="linea-fila linea-fila--envuelve">
            <label className="etiqueta etiqueta--en-linea" htmlFor="escalar-a">
              Escalar a
            </label>
            <input
              id="escalar-a"
              className="entrada entrada--numero entrada--angosta"
              inputMode="decimal"
              value={rindeDestino}
              onChange={(e) => setRindeDestino(e.target.value)}
              placeholder={String(receta.rinde * 2)}
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
          <p className="nota">
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
  cambiar: Cambiar
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

  const quitarYa = (lineaId: string) =>
    cambiar((r) => ({ ingredientes: r.ingredientes.filter((l) => l.id !== lineaId) }))
  const { pedirSalida: quitar, clase: claseSalida } = useSalida(quitarYa)

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
        <CifraAnimada className="campo-subtotal" valor={costeo.ingredientes} formato={plata} />
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
              className={`linea linea--ingrediente${
                incierto && linea.cantidad ? ' linea--incierta' : ''
              }${claseSalida(linea.id)}`}
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

// ─── Preparaciones ───────────────────────────────────────────────────────────

/**
 * Preparaciones usadas adentro de esta receta: un buttercream, un almíbar.
 *
 * El costo sale a prorrata de lo que rinde la preparación: si la crema rinde
 * 500 g y cuesta $5.000, usar 200 g cuesta $2.000. Así no hay que recargar los
 * ingredientes de la crema en cada torta que la lleva.
 */
function CampoPreparaciones({
  receta,
  cambiar,
  preparaciones,
  costeo,
}: {
  receta: Receta
  cambiar: Cambiar
  preparaciones: Receta[]
  costeo: ReturnType<typeof costear>
}) {
  // Una receta no puede usarse a sí misma.
  const disponibles = preparaciones.filter((p) => p.id !== receta.id)

  const agregar = () =>
    cambiar((r) => ({
      subrecetas: [...r.subrecetas, { id: id(), subId: null, cantidad: null }],
    }))

  const editar = (lineaId: string, parcial: Partial<Receta['subrecetas'][number]>) =>
    cambiar((r) => ({
      subrecetas: r.subrecetas.map((l) => (l.id === lineaId ? { ...l, ...parcial } : l)),
    }))

  const quitarYa = (lineaId: string) =>
    cambiar((r) => ({ subrecetas: r.subrecetas.filter((l) => l.id !== lineaId) }))
  const { pedirSalida: quitar, clase: claseSalida } = useSalida(quitarYa)

  // Si no hay preparaciones cargadas y esta receta no usa ninguna, la sección
  // sobra: no tiene sentido mostrar un selector vacío.
  if (disponibles.length === 0 && receta.subrecetas.length === 0) return null

  return (
    <section className="campo campo--ingredientes">
      <header className="campo-cabeza">
        <h2>Preparaciones</h2>
        <CifraAnimada className="campo-subtotal" valor={costeo.preparaciones} formato={plata} />
      </header>
      <div className="campo-cuerpo">
        {receta.subrecetas.map((linea) => {
          const detalle = costeo.lineasSub.find((l) => l.linea.id === linea.id)
          const sub = detalle?.sub ?? disponibles.find((p) => p.id === linea.subId) ?? null
          const problema = detalle?.incierto && linea.cantidad
          return (
            <div
              key={linea.id}
              className={`linea linea--ingrediente${problema ? ' linea--incierta' : ''}${claseSalida(linea.id)}`}
            >
              <div>
                <label className="solo-lectores" htmlFor={`sub-${linea.id}`}>
                  Preparación
                </label>
                <select
                  id={`sub-${linea.id}`}
                  className="selector"
                  value={linea.subId ?? ''}
                  onChange={(e) => editar(linea.id, { subId: e.target.value || null })}
                >
                  <option value="">Elegí una preparación…</option>
                  {disponibles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                      {p.rinde ? ` — rinde ${p.rinde} ${RINDE_TEXTO[p.rindeUnidad]}` : ' — sin rinde'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="con-sufijo">
                <label className="solo-lectores" htmlFor={`sub-c-${linea.id}`}>
                  Cuánto usás
                </label>
                <input
                  id={`sub-c-${linea.id}`}
                  className="entrada entrada--numero"
                  inputMode="decimal"
                  value={texto(linea.cantidad)}
                  onChange={(e) => editar(linea.id, { cantidad: aNumero(e.target.value) })}
                  placeholder="0"
                />
                <span className="sufijo">
                  {sub ? UNIDAD_CORTA[sub.rindeUnidad] : '—'}
                </span>
              </div>

              <div className="linea-fila">
                {problema ? (
                  <span className="linea-costo linea-costo--incierto">
                    {detalle?.motivo === 'ciclo'
                      ? 'Se usa a sí misma'
                      : detalle?.motivo === 'sin-rinde'
                        ? 'Falta el rinde'
                        : 'Le falta un precio'}
                  </span>
                ) : (
                  <span className="linea-costo cifra">{plata(detalle?.costo ?? 0)}</span>
                )}
                <button
                  type="button"
                  className="boton boton--chico boton--fantasma boton--peligro"
                  onClick={() => quitar(linea.id)}
                  aria-label="Quitar esta preparación"
                >
                  <Icono nombre="basura" tam={16} />
                </button>
              </div>
            </div>
          )
        })}

        <button type="button" className="boton boton--agregar" onClick={agregar}>
          <Icono nombre="mas" tam={18} />
          Agregar una preparación
        </button>
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
  cambiar: Cambiar
  subtotal: number
}) {
  const agregar = () =>
    cambiar({
      manoDeObra: [
        ...receta.manoDeObra,
        {
          id: id(),
          concepto: '',
          minutos: null,
          // La tarifa se arrastra de la línea anterior: casi siempre es la misma.
          valorHora: receta.manoDeObra.at(-1)?.valorHora ?? null,
        },
      ],
    })

  const editar = (lineaId: string, parcial: Partial<Receta['manoDeObra'][number]>) =>
    cambiar({
      manoDeObra: receta.manoDeObra.map((l) => (l.id === lineaId ? { ...l, ...parcial } : l)),
    })

  const quitarYa = (lineaId: string) =>
    cambiar((r) => ({ manoDeObra: r.manoDeObra.filter((l) => l.id !== lineaId) }))
  const { pedirSalida: quitar, clase: claseSalida } = useSalida(quitarYa)

  return (
    <section className="campo campo--mano">
      <div className="campo-cabeza">
        <h2>Mano de obra</h2>
        <CifraAnimada className="campo-subtotal" valor={subtotal} formato={plata} />
      </div>
      <div className="campo-cuerpo">
        {receta.manoDeObra.length === 0 ? (
          <p className="nota">
            Tu tiempo también es un costo. Si no lo querés contar, dejalo vacío.
          </p>
        ) : null}

        {receta.manoDeObra.map((l) => (
          <div key={l.id} className={`linea linea--mano${claseSalida(l.id)}`}>
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
              <label className="solo-lectores" htmlFor={`mo-m-${l.id}`}>
                Minutos
              </label>
              <input
                id={`mo-m-${l.id}`}
                className="entrada entrada--numero"
                inputMode="numeric"
                value={texto(l.minutos)}
                onChange={(e) => editar(l.id, { minutos: aNumero(e.target.value) })}
                placeholder="0"
              />
              <span className="sufijo">min</span>
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
                placeholder="$ la hora"
              />
            </div>
            <div className="linea-fila">
              <span className="linea-costo cifra">
                {plata(costoDeTiempo(l.minutos, l.valorHora))}
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

        {receta.manoDeObra.length > 0 ? (
          <p className="nota">
            El tiempo va en minutos y la tarifa por hora, que es como se piensa: 40
            minutos a $4.000 la hora son $2.666,67.
          </p>
        ) : null}
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
  cambiar: Cambiar
  subtotal: number
}) {
  const agregar = () =>
    cambiar({ extras: [...receta.extras, { id: id(), concepto: '', monto: null }] })

  const editar = (lineaId: string, parcial: Partial<Receta['extras'][number]>) =>
    cambiar({
      extras: receta.extras.map((l) => (l.id === lineaId ? { ...l, ...parcial } : l)),
    })

  const quitarYa = (lineaId: string) =>
    cambiar((r) => ({ extras: r.extras.filter((l) => l.id !== lineaId) }))
  const { pedirSalida: quitar, clase: claseSalida } = useSalida(quitarYa)

  return (
    <section className="campo campo--extras">
      <div className="campo-cabeza">
        <h2>Packaging y gastos extras</h2>
        <CifraAnimada className="campo-subtotal" valor={subtotal} formato={plata} />
      </div>
      <div className="campo-cuerpo">
        {receta.extras.length === 0 ? (
          <p className="nota">
            Cajas, bandejas, cintas, envío, publicidad. Todo lo que pagás aparte de los
            ingredientes.
          </p>
        ) : null}

        {receta.extras.map((l) => (
          <div key={l.id} className={`linea linea--extra${claseSalida(l.id)}`}>
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
  cambiar: Cambiar
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
              className={`boton boton--chico${
                Math.abs(receta.margen - m) < 0.001 ? ' boton--activo' : ' boton--fantasma'
              }`}
              onClick={() => cambiar({ margen: m })}
              aria-pressed={Math.abs(receta.margen - m) < 0.001}
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

// ─── Procedimiento ───────────────────────────────────────────────────────────

function CampoProcedimiento({
  receta,
  cambiar,
}: {
  receta: Receta
  cambiar: Cambiar
}) {
  const lineas = receta.procedimiento.split('\n').filter((l) => l.trim()).length

  return (
    <section className="campo campo--datos">
      <header className="campo-cabeza">
        <h2>Procedimiento</h2>
        {lineas > 0 ? (
          <span className="nota">
            {lineas} {lineas === 1 ? 'paso' : 'pasos'}
          </span>
        ) : null}
      </header>
      <div className="campo-cuerpo">
        <label className="solo-lectores" htmlFor="procedimiento">
          Procedimiento de la receta
        </label>
        <textarea
          id="procedimiento"
          className="entrada"
          value={receta.procedimiento}
          onChange={(e) => cambiar({ procedimiento: e.target.value })}
          placeholder={
            'Escribí los pasos como los tengas en la cabeza. Por ejemplo:\n\n' +
            'Batir la manteca con el azúcar hasta que quede cremoso.\n' +
            'Agregar los huevos de a uno.\n' +
            'Incorporar la harina tamizada en tres veces.\n' +
            'Horno 180° por 40 minutos.'
          }
          rows={10}
          spellCheck
        />
        <p className="nota">
          Texto libre, como lo escribirías en un cuaderno. Después lo vas a poder buscar
          desde el recetario.
        </p>
      </div>
    </section>
  )
}

// ─── Tramos por cantidad ─────────────────────────────────────────────────────

/**
 * "1 sale $5.000, pero 3 salen $12.000".
 *
 * El precio del tramo es el del combo entero, no el unitario, porque así se lo
 * dice al cliente. El presupuesto saca el unitario dividiendo.
 */
function CampoTramos({
  receta,
  cambiar,
  costeo,
}: {
  receta: Receta
  cambiar: Cambiar
  costeo: ReturnType<typeof costear>
}) {
  const agregar = () =>
    cambiar((r) => ({
      tramos: [
        ...r.tramos,
        {
          id: id(),
          desde: (r.tramos.at(-1)?.desde ?? 1) + 2,
          precioTotal: 0,
        },
      ],
    }))

  const editar = (tramoId: string, parcial: Partial<Receta['tramos'][number]>) =>
    cambiar((r) => ({
      tramos: r.tramos.map((t) => (t.id === tramoId ? { ...t, ...parcial } : t)),
    }))

  const quitarYa = (tramoId: string) =>
    cambiar((r) => ({ tramos: r.tramos.filter((t) => t.id !== tramoId) }))
  const { pedirSalida: quitar, clase: claseSalida } = useSalida(quitarYa)

  return (
    <section className="campo campo--extras">
      <header className="campo-cabeza">
        <h2>Descuento por cantidad</h2>
      </header>
      <div className="campo-cuerpo">
        <p className="nota">
          Opcional. Si llevan varias, podés ponerles otro precio: una sale{' '}
          {plata(costeo.precioVenta)}, pero tres pueden salir menos. El cliente lo ve en el
          presupuesto.
        </p>

        {receta.tramos.map((t) => {
          const unitario = t.desde > 0 ? t.precioTotal / t.desde : 0
          const ahorro = costeo.precioVenta * t.desde - t.precioTotal
          return (
            <div key={t.id} className={`linea linea--tramo${claseSalida(t.id)}`}>
              <div className="con-sufijo">
                <label className="solo-lectores" htmlFor={`tr-d-${t.id}`}>
                  A partir de cuántas unidades
                </label>
                <input
                  id={`tr-d-${t.id}`}
                  className="entrada entrada--numero"
                  inputMode="numeric"
                  value={t.desde || ''}
                  onChange={(e) => {
                    const v = parseInt(e.target.value.replace(/\D/g, ''), 10)
                    editar(t.id, { desde: Number.isFinite(v) && v > 0 ? v : 1 })
                  }}
                />
                <span className="sufijo">un</span>
              </div>

              <div>
                <label className="solo-lectores" htmlFor={`tr-p-${t.id}`}>
                  Precio de las {t.desde} juntas
                </label>
                <input
                  id={`tr-p-${t.id}`}
                  className="entrada entrada--numero"
                  inputMode="decimal"
                  value={t.precioTotal || ''}
                  onChange={(e) => editar(t.id, { precioTotal: aNumero(e.target.value) ?? 0 })}
                  placeholder="Precio de las dos"
                />
              </div>

              <div className="linea-fila">
                <span className="linea-costo cifra">{plata(unitario)}</span>
                <button
                  type="button"
                  className="boton boton--chico boton--fantasma boton--peligro"
                  onClick={() => quitar(t.id)}
                  aria-label="Quitar este tramo"
                >
                  <Icono nombre="basura" tam={16} />
                </button>
              </div>

              {t.precioTotal > 0 && costeo.precioVenta > 0 ? (
                <p className="nota tramo-detalle">
                  {t.desde} a {plata(t.precioTotal)} ={' '}
                  <strong className="cifra">{plata(unitario)}</strong> cada una.{' '}
                  {ahorro > 0
                    ? `El cliente se ahorra ${plata(ahorro)}.`
                    : ahorro < 0
                      ? `Ojo: así sale ${plata(-ahorro)} más caro que de a una.`
                      : 'Mismo precio que de a una.'}
                </p>
              ) : null}
            </div>
          )
        })}

        <button type="button" className="boton boton--agregar" onClick={agregar}>
          <Icono nombre="mas" tam={18} />
          Agregar un tramo
        </button>
      </div>
    </section>
  )
}

// ─── Precio final ────────────────────────────────────────────────────────────

/**
 * La app calcula y sugiere; el precio que cobra lo decide ella.
 *
 * Existe porque nadie cobra $20.125: cobra $20.000. Redondear a mano no debería
 * obligarla a falsear el margen hasta que el sugerido dé redondo.
 */
function PrecioFinal({
  receta,
  cambiar,
  costeo,
}: {
  receta: Receta
  cambiar: Cambiar
  costeo: ReturnType<typeof costear>
}) {
  const [abierto, setAbierto] = useState(costeo.esPrecioManual)

  const redondearA = (multiplo: number) => {
    const v = Math.round(costeo.precioSugerido / multiplo) * multiplo
    cambiar({ precioManual: v > 0 ? v : null })
    setAbierto(true)
  }

  if (!abierto) {
    return (
      <button
        type="button"
        className="boton boton--chico precio-final-abrir"
        onClick={() => setAbierto(true)}
        disabled={costeo.precioSugerido <= 0}
      >
        <Icono nombre="lapiz" tam={15} />
        Poner otro precio
      </button>
    )
  }

  return (
    <div className="precio-final">
      <label className="etiqueta etiqueta--sobre-oscuro" htmlFor="precio-manual">
        Precio que cobrás
      </label>
      <input
        id="precio-manual"
        className="entrada entrada--numero"
        inputMode="decimal"
        value={receta.precioManual === null ? '' : String(receta.precioManual)}
        onChange={(e) => cambiar({ precioManual: aNumero(e.target.value) })}
        placeholder={String(Math.round(costeo.precioSugerido))}
      />

      <div className="fila-acciones">
        {[1000, 500, 100].map((m) => (
          <button
            key={m}
            type="button"
            className="boton boton--chico"
            onClick={() => redondearA(m)}
          >
            Redondear a {m === 1000 ? '$1.000' : m === 500 ? '$500' : '$100'}
          </button>
        ))}
        {costeo.esPrecioManual ? (
          <button
            type="button"
            className="boton boton--chico"
            onClick={() => {
              cambiar({ precioManual: null })
              setAbierto(false)
            }}
          >
            Volver al sugerido
          </button>
        ) : null}
      </div>

      {costeo.esPrecioManual ? (
        <p className="nota nota--sobre-oscuro">
          La app sugería{' '}
          <strong className="cifra">{plata(costeo.precioSugerido)}</strong>. Con lo que
          cobrás te queda <strong>{porcentaje(costeo.margenSobreVenta)}</strong> de ganancia
          real.
        </p>
      ) : null}
    </div>
  )
}

// ─── Resumen ─────────────────────────────────────────────────────────────────

function Resumen({
  costeo,
  receta,
  cambiar,
  guardar,
  puedeGuardar,
  guardando,
  guardado,
}: {
  cambiar: Cambiar
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
        <CifraAnimada className="total-grande" valor={costeo.total} formato={plata} />
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
          <span>{costeo.esPrecioManual ? 'Precio de venta' : 'Precio de venta sugerido'}</span>
        </div>
        <CifraAnimada className="total-grande" valor={costeo.precioVenta} formato={plata} />

        <PrecioFinal receta={receta} cambiar={cambiar} costeo={costeo} />
        {costeo.precioPorPorcion !== null ? (
          <div className="total-renglon" style={{ marginTop: 8 }}>
            <span>Precio por porción</span>
            <span className="cifra">{plata(costeo.precioPorPorcion)}</span>
          </div>
        ) : null}
      </div>

      <div className="total-seccion total-pie">
        <button
          type="button"
          className="boton boton--ancho"
          onClick={guardar}
          disabled={!puedeGuardar}
        >
          <Icono
            nombre={guardado ? 'listo' : 'guardar'}
            tam={18}
            className={guardado ? 'icono-dibuja' : undefined}
          />
          {guardando ? 'Guardando…' : guardado ? 'Receta guardada' : 'Guardar receta'}
        </button>
        {!receta.nombre.trim() ? (
          <p className="nota nota--sobre-oscuro">
            Poné un nombre arriba para poder guardarla.
          </p>
        ) : null}
      </div>
    </div>
  )
}
