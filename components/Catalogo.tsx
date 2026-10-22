'use client'

import { useActionState, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  PAQUETE_TEXTO,
  PAQUETES_POSIBLES,
  precioUnitarioDePaquete,
  UNIDADES,
  type Ingrediente,
  type Unidad,
  type UnidadPaquete,
} from '@/lib/costeo.ts'
import { cantidad, FRESCURA_TEXTO, fecha, frescura, plataRedonda } from '@/lib/format.ts'
import {
  accionActualizarPrecio,
  accionBorrarIngrediente,
  accionCrearIngrediente,
  accionEditarIngrediente,
  type Resultado,
} from '@/app/acciones.ts'
import { Icono } from './Icono.tsx'

/** Acepta "1.250,5" y "1250.5" por igual. */
function aNumero(v: string): number | null {
  const limpio = v.trim().replace(/\s/g, '')
  if (limpio === '') return null
  const normal = limpio.includes(',') ? limpio.replace(/\./g, '').replace(',', '.') : limpio
  const x = Number(normal)
  return Number.isFinite(x) ? x : null
}

const ETIQUETA_UNIDAD: Record<Unidad, string> = {
  KG: 'por kilo',
  LITRO: 'por litro',
  UNIDAD: 'por unidad',
}

export function Catalogo({
  ingredientes,
  categorias,
}: {
  ingredientes: Ingrediente[]
  categorias: readonly string[]
}) {
  const [busqueda, setBusqueda] = useState('')
  const [soloSinPrecio, setSoloSinPrecio] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [agregando, setAgregando] = useState(false)

  const sinPrecio = ingredientes.filter((i) => !i.precioConfirmado).length

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return ingredientes.filter((i) => {
      if (soloSinPrecio && i.precioConfirmado) return false
      if (!q) return true
      return (
        i.nombre.toLowerCase().includes(q) || i.categoria.toLowerCase().includes(q)
      )
    })
  }, [ingredientes, busqueda, soloSinPrecio])

  const porCategoria = useMemo(() => {
    const m = new Map<string, Ingrediente[]>()
    for (const i of visibles) {
      const l = m.get(i.categoria)
      if (l) l.push(i)
      else m.set(i.categoria, [i])
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'))
  }, [visibles])

  return (
    <div className="pila">
      {sinPrecio > 0 ? (
        <div className="aviso">
          <Icono nombre="alerta" tam={18} />
          <span>
            {sinPrecio === 1
              ? 'Hay 1 ingrediente sin precio.'
              : `Hay ${sinPrecio} ingredientes sin precio.`}{' '}
            Mientras no tengan precio no suman nada, y cualquier receta que los use va a
            dar un costo más bajo del real.
          </span>
        </div>
      ) : null}

      {agregando ? (
        <section className="campo campo--ingredientes">
          <div className="campo-cabeza">
            <h2>Nuevo ingrediente</h2>
          </div>
          <div className="campo-cuerpo">
            <FormularioIngrediente
              categorias={categorias}
              onListo={() => setAgregando(false)}
              onCancelar={() => setAgregando(false)}
            />
          </div>
        </section>
      ) : (
        <button
          type="button"
          className="boton boton--agregar"
          onClick={() => setAgregando(true)}
        >
          <Icono nombre="mas" tam={18} />
          Agregar un ingrediente
        </button>
      )}

      <div className="herramientas">
        <div className="buscador">
          <Icono nombre="buscar" tam={18} />
          <label className="solo-lectores" htmlFor="buscar">
            Buscar ingrediente
          </label>
          <input
            id="buscar"
            className="entrada"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o categoría…"
          />
        </div>
        <button
          type="button"
          className={`boton${soloSinPrecio ? ' boton--activo' : ''}`}
          onClick={() => setSoloSinPrecio((v) => !v)}
          aria-pressed={soloSinPrecio}
        >
          Sólo los que faltan ({sinPrecio})
        </button>
      </div>

      {visibles.length === 0 ? (
        <div className="vacio">
          <div className="vacio-tarjeta">
            <Icono nombre="lista" tam={28} />
            <h2>
              {ingredientes.length === 0
                ? 'Todavía no cargaste ingredientes'
                : 'No hay ninguno que coincida'}
            </h2>
            <p>
              {ingredientes.length === 0
                ? 'Agregá el primero con el botón de arriba. Con el nombre, el precio y si lo comprás por kilo, por litro o por unidad alcanza.'
                : 'Probá con otra palabra, o limpiá la búsqueda.'}
            </p>
          </div>
        </div>
      ) : (
        porCategoria.map(([categoria, items]) => (
          <section key={categoria} className="pila">
            <h2 className="rotulo-categoria">
              {categoria} · {items.length}
            </h2>
            <div className="grilla-catalogo">
              {items.map((i) =>
                editando === i.id ? (
                  <div key={i.id} className="ficha ficha--ancha">
                    <FormularioIngrediente
                      categorias={categorias}
                      ingrediente={i}
                      onListo={() => setEditando(null)}
                      onCancelar={() => setEditando(null)}
                    />
                  </div>
                ) : (
                  <FichaIngrediente
                    key={i.id}
                    ingrediente={i}
                    onEditar={() => setEditando(i.id)}
                  />
                ),
              )}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

// ─── Ficha ───────────────────────────────────────────────────────────────────

function FichaIngrediente({
  ingrediente,
  onEditar,
}: {
  ingrediente: Ingrediente
  onEditar: () => void
}) {
  // Por paquete es el modo por defecto: es como se compra. El precio por kilo
  // se calcula solo, así ella no tiene que hacer la división de cabeza.
  const [porPaquete, setPorPaquete] = useState(true)
  const [precio, setPrecio] = useState('')
  const [cantidadPaquete, setCantidadPaquete] = useState('')
  const [precioPaquete, setPrecioPaquete] = useState('')
  // Los paquetes de pastelería vienen en gramos más seguido que en kilos, así
  // que la unidad chica es la que arranca elegida.
  const unidadesPosibles = PAQUETES_POSIBLES[ingrediente.unidad]
  const [unidadPaquete, setUnidadPaquete] = useState<UnidadPaquete>(
    ingrediente.paqueteUnidad ?? unidadesPosibles[0],
  )
  const [guardando, iniciar] = useTransition()
  const router = useRouter()
  const estado = frescura(ingrediente.precioConfirmado, ingrediente.actualizado)

  const unitarioCalculado = precioUnitarioDePaquete(
    aNumero(precioPaquete),
    aNumero(cantidadPaquete),
    unidadPaquete,
  )

  const listo = porPaquete ? unitarioCalculado !== null : aNumero(precio) !== null

  const guardarPrecio = () => {
    const unitario = porPaquete ? unitarioCalculado : aNumero(precio)
    if (unitario === null || unitario < 0) return
    iniciar(async () => {
      await accionActualizarPrecio(
        ingrediente.id,
        unitario,
        porPaquete
          ? {
              cantidad: aNumero(cantidadPaquete)!,
              precio: aNumero(precioPaquete)!,
              unidad: unidadPaquete,
            }
          : null,
      )
      setPrecio('')
      setCantidadPaquete('')
      setPrecioPaquete('')
      router.refresh()
    })
  }

  const enEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && listo) guardarPrecio()
  }

  return (
    <article className="ficha">
      <div className="ficha-cabeza">
        <span className="ficha-nombre">{ingrediente.nombre}</span>
        {ingrediente.precioConfirmado ? (
          <span className="ficha-precio cifra">{plataRedonda(ingrediente.precio)}</span>
        ) : null}
      </div>

      <div className="ficha-pie">
        <span className={`marca-estado marca-estado--${estado}`}>
          {FRESCURA_TEXTO[estado]}
        </span>
        <span>{ETIQUETA_UNIDAD[ingrediente.unidad]}</span>
        {ingrediente.precioConfirmado && ingrediente.actualizado ? (
          <span>· {fecha(ingrediente.actualizado)}</span>
        ) : null}
      </div>

      {/* Lo que pagó la última vez, para que no tenga que acordarse. */}
      {ingrediente.paqueteCantidad && ingrediente.paquetePrecio ? (
        <p className="nota">
          Último: {cantidad(ingrediente.paqueteCantidad)}{' '}
          {PAQUETE_TEXTO[ingrediente.paqueteUnidad ?? ingrediente.unidad]} a{' '}
          {plataRedonda(ingrediente.paquetePrecio)}
        </p>
      ) : null}

      <div className="modo-precio">
        <button
          type="button"
          className={`boton boton--chico${porPaquete ? ' boton--activo' : ' boton--fantasma'}`}
          onClick={() => setPorPaquete(true)}
          aria-pressed={porPaquete}
        >
          Por paquete
        </button>
        <button
          type="button"
          className={`boton boton--chico${!porPaquete ? ' boton--activo' : ' boton--fantasma'}`}
          onClick={() => setPorPaquete(false)}
          aria-pressed={!porPaquete}
        >
          {ETIQUETA_UNIDAD[ingrediente.unidad].replace('por ', 'Por ')}
        </button>
      </div>

      {porPaquete ? (
        <>
          <div className="linea-fila">
            <div className="con-sufijo con-sufijo--crece">
              <label className="solo-lectores" htmlFor={`paq-cant-${ingrediente.id}`}>
                Cuánto venía el paquete de {ingrediente.nombre}
              </label>
              <input
                id={`paq-cant-${ingrediente.id}`}
                className="entrada entrada--numero"
                inputMode="decimal"
                value={cantidadPaquete}
                onChange={(e) => setCantidadPaquete(e.target.value)}
                onKeyDown={enEnter}
                placeholder="Cuánto venía"
              />
              {unidadesPosibles.length > 1 ? (
                <>
                  <label className="solo-lectores" htmlFor={`paq-u-${ingrediente.id}`}>
                    En qué unidad venía
                  </label>
                  <select
                    id={`paq-u-${ingrediente.id}`}
                    className="selector sufijo-unidad"
                    value={unidadPaquete}
                    onChange={(e) => setUnidadPaquete(e.target.value as UnidadPaquete)}
                  >
                    {unidadesPosibles.map((u) => (
                      <option key={u} value={u}>
                        {PAQUETE_TEXTO[u]}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <span className="sufijo">{PAQUETE_TEXTO[unidadPaquete]}</span>
              )}
            </div>
            <div className="con-sufijo con-sufijo--crece">
              <label className="solo-lectores" htmlFor={`paq-precio-${ingrediente.id}`}>
                Cuánto pagaste por el paquete de {ingrediente.nombre}
              </label>
              <input
                id={`paq-precio-${ingrediente.id}`}
                className="entrada entrada--numero"
                inputMode="decimal"
                value={precioPaquete}
                onChange={(e) => setPrecioPaquete(e.target.value)}
                onKeyDown={enEnter}
                placeholder="Cuánto pagaste"
              />
            </div>
          </div>
          {unitarioCalculado !== null ? (
            <p className="nota nota--calculo">
              Te queda a <strong className="cifra">{plataRedonda(unitarioCalculado)}</strong>{' '}
              {ETIQUETA_UNIDAD[ingrediente.unidad]}.
            </p>
          ) : null}
        </>
      ) : (
        <div className="con-sufijo">
          <label className="solo-lectores" htmlFor={`precio-${ingrediente.id}`}>
            Precio {ETIQUETA_UNIDAD[ingrediente.unidad]} de {ingrediente.nombre}
          </label>
          <input
            id={`precio-${ingrediente.id}`}
            className="entrada entrada--numero"
            inputMode="decimal"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            onKeyDown={enEnter}
            placeholder={ingrediente.precioConfirmado ? 'Nuevo precio' : 'Poné el precio'}
          />
        </div>
      )}

      <div className="linea-fila">
        <button
          type="button"
          className="boton boton--chico empuja"
          onClick={guardarPrecio}
          disabled={!listo || guardando}
        >
          {guardando ? 'Guardando…' : 'Guardar precio'}
        </button>
        <button
          type="button"
          className="boton boton--chico boton--fantasma"
          onClick={onEditar}
          aria-label={`Editar ${ingrediente.nombre}`}
        >
          <Icono nombre="lapiz" tam={16} />
        </button>
      </div>
    </article>
  )
}

// ─── Formulario ──────────────────────────────────────────────────────────────

function FormularioIngrediente({
  categorias,
  ingrediente,
  onListo,
  onCancelar,
}: {
  categorias: readonly string[]
  ingrediente?: Ingrediente
  onListo: () => void
  onCancelar: () => void
}) {
  const esEdicion = Boolean(ingrediente)
  const router = useRouter()

  const [estado, enviar, pendiente] = useActionState<Resultado | null, FormData>(
    async (previo, datos) => {
      const r = esEdicion
        ? await accionEditarIngrediente(previo, datos)
        : await accionCrearIngrediente(previo, datos)
      if (r.ok) {
        router.refresh()
        onListo()
      }
      return r
    },
    null,
  )

  return (
    <form action={enviar} className="pila">
      {ingrediente ? <input type="hidden" name="id" value={ingrediente.id} /> : null}

      <div>
        <label className="etiqueta" htmlFor={`f-nombre-${ingrediente?.id ?? 'nuevo'}`}>
          Nombre
        </label>
        <input
          id={`f-nombre-${ingrediente?.id ?? 'nuevo'}`}
          name="nombre"
          className="entrada"
          defaultValue={ingrediente?.nombre ?? ''}
          placeholder="Harina 0000, Dulce de leche…"
          autoComplete="off"
          required
        />
      </div>

      <div className="grupo-campos">
        <div className="grupo-campo">
          <label className="etiqueta" htmlFor={`f-unidad-${ingrediente?.id ?? 'nuevo'}`}>
            Lo comprás por
          </label>
          <select
            id={`f-unidad-${ingrediente?.id ?? 'nuevo'}`}
            name="unidad"
            className="selector"
            defaultValue={ingrediente?.unidad ?? 'KG'}
          >
            {UNIDADES.map((u) => (
              <option key={u} value={u}>
                {u === 'KG' ? 'Kilo' : u === 'LITRO' ? 'Litro' : 'Unidad'}
              </option>
            ))}
          </select>
        </div>

        <div className="grupo-campo">
          <label className="etiqueta" htmlFor={`f-precio-${ingrediente?.id ?? 'nuevo'}`}>
            Precio
          </label>
          <input
            id={`f-precio-${ingrediente?.id ?? 'nuevo'}`}
            name="precio"
            className="entrada entrada--numero"
            inputMode="decimal"
            defaultValue={ingrediente?.precioConfirmado ? String(ingrediente.precio) : ''}
            placeholder="Lo podés dejar vacío"
          />
        </div>

        <div className="grupo-campo">
          <label className="etiqueta" htmlFor={`f-cat-${ingrediente?.id ?? 'nuevo'}`}>
            Categoría
          </label>
          <select
            id={`f-cat-${ingrediente?.id ?? 'nuevo'}`}
            name="categoria"
            className="selector"
            defaultValue={ingrediente?.categoria ?? 'Básicos'}
          >
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {estado && !estado.ok ? (
        <div className="aviso">
          <Icono nombre="alerta" tam={18} />
          <span>{estado.error}</span>
        </div>
      ) : null}

      <div className="fila-acciones">
        <button type="submit" className="boton boton--principal" disabled={pendiente}>
          <Icono nombre="guardar" tam={18} />
          {pendiente ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Agregar'}
        </button>
        <button type="button" className="boton boton--fantasma" onClick={onCancelar}>
          Cancelar
        </button>
        {esEdicion ? (
          <button
            type="submit"
            formAction={accionBorrarIngrediente}
            className="boton boton--fantasma boton--peligro empuja"
          >
            <Icono nombre="basura" tam={16} />
            Borrar
          </button>
        ) : null}
      </div>
    </form>
  )
}
