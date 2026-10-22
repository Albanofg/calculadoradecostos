'use client'

import { useActionState, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UNIDADES, type Ingrediente, type Unidad } from '@/lib/costeo.ts'
import { FRESCURA_TEXTO, fecha, frescura, plataRedonda } from '@/lib/format.ts'
import {
  accionActualizarPrecio,
  accionBorrarIngrediente,
  accionCrearIngrediente,
  accionEditarIngrediente,
  type Resultado,
} from '@/app/acciones.ts'
import { Icono } from './Icono.tsx'

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

      <div className="linea-fila" style={{ flexWrap: 'wrap', gap: 'var(--esp-3)' }}>
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
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
          className="boton boton--fantasma"
          onClick={() => setSoloSinPrecio((v) => !v)}
          aria-pressed={soloSinPrecio}
          style={
            soloSinPrecio
              ? { background: 'var(--grafito)', color: 'var(--tinta-sobre-esmalte)', borderColor: 'var(--rim)' }
              : undefined
          }
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
            <h2 className="rotulo" style={{ color: 'var(--tinta-suave)' }}>
              {categoria} · {items.length}
            </h2>
            <div className="grilla-catalogo">
              {items.map((i) =>
                editando === i.id ? (
                  <div key={i.id} className="ficha" style={{ gridColumn: '1 / -1' }}>
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
  const [precio, setPrecio] = useState('')
  const [guardando, iniciar] = useTransition()
  const router = useRouter()
  const estado = frescura(ingrediente.precioConfirmado, ingrediente.actualizado)

  const guardarPrecio = () => {
    const v = Number(precio.replace(/\./g, '').replace(',', '.'))
    if (!Number.isFinite(v) || v < 0) return
    iniciar(async () => {
      await accionActualizarPrecio(ingrediente.id, v)
      setPrecio('')
      router.refresh()
    })
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

      <div className="linea-fila">
        <div className="con-sufijo" style={{ flex: '1 1 auto', minWidth: 0 }}>
          <label className="solo-lectores" htmlFor={`precio-${ingrediente.id}`}>
            Precio {ETIQUETA_UNIDAD[ingrediente.unidad]} de {ingrediente.nombre}
          </label>
          <input
            id={`precio-${ingrediente.id}`}
            className="entrada entrada--numero"
            inputMode="decimal"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') guardarPrecio()
            }}
            placeholder={
              ingrediente.precioConfirmado ? 'Nuevo precio' : 'Poné el precio'
            }
          />
        </div>
        <button
          type="button"
          className="boton boton--chico"
          onClick={guardarPrecio}
          disabled={precio.trim() === '' || guardando}
        >
          {guardando ? '…' : 'Guardar'}
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

      <div className="linea-fila" style={{ flexWrap: 'wrap', gap: 'var(--esp-3)' }}>
        <div style={{ flex: '1 1 150px', minWidth: 0 }}>
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

        <div style={{ flex: '1 1 150px', minWidth: 0 }}>
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

        <div style={{ flex: '1 1 170px', minWidth: 0 }}>
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
            className="boton boton--fantasma boton--peligro"
            style={{ marginLeft: 'auto' }}
          >
            <Icono nombre="basura" tam={16} />
            Borrar
          </button>
        ) : null}
      </div>
    </form>
  )
}
