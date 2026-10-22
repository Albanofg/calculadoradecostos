'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { costear, urlFoto, type Ingrediente, type Receta } from '@/lib/costeo.ts'
import { fecha, plata } from '@/lib/format.ts'
import { accionBorrarReceta, accionDuplicarReceta } from '@/app/acciones.ts'
import { Icono } from './Icono.tsx'

type Orden = 'reciente' | 'nombre' | 'precio-alto' | 'precio-bajo'

const ORDENES: { valor: Orden; texto: string }[] = [
  { valor: 'reciente', texto: 'Más recientes' },
  { valor: 'nombre', texto: 'Por nombre' },
  { valor: 'precio-alto', texto: 'Más caras primero' },
  { valor: 'precio-bajo', texto: 'Más baratas primero' },
]

/** Sin acentos y en minúscula, para que "limon" encuentre "Limón". */
const plano = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

export function Recetario({
  recetas,
  catalogo,
}: {
  recetas: Receta[]
  catalogo: Ingrediente[]
}) {
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState<Orden>('reciente')

  const porId = useMemo(() => new Map(catalogo.map((i) => [i.id, i])), [catalogo])

  const fichas = useMemo(
    () =>
      recetas.map((receta) => {
        const costeo = costear(receta, porId)
        const ingredientes = receta.ingredientes
          .map((l) => (l.ingredienteId ? porId.get(l.ingredienteId)?.nombre : null))
          .filter((x): x is string => Boolean(x))
        return {
          receta,
          costeo,
          ingredientes,
          // La búsqueda mira nombre, descripción, procedimiento e ingredientes.
          indice: plano(
            [
              receta.nombre,
              receta.descripcion,
              receta.procedimiento,
              ingredientes.join(' '),
            ].join(' '),
          ),
        }
      }),
    [recetas, porId],
  )

  const visibles = useMemo(() => {
    const q = plano(busqueda.trim())
    const filtradas = q ? fichas.filter((f) => f.indice.includes(q)) : fichas.slice()

    switch (orden) {
      case 'nombre':
        return filtradas.sort((a, b) =>
          a.receta.nombre.localeCompare(b.receta.nombre, 'es'),
        )
      case 'precio-alto':
        return filtradas.sort((a, b) => b.costeo.precioVenta - a.costeo.precioVenta)
      case 'precio-bajo':
        return filtradas.sort((a, b) => a.costeo.precioVenta - b.costeo.precioVenta)
      default:
        return filtradas.sort((a, b) => b.receta.numero - a.receta.numero)
    }
  }, [fichas, busqueda, orden])

  return (
    <>
      <div className="herramientas">
        <div className="buscador">
          <Icono nombre="buscar" tam={18} />
          <label className="solo-lectores" htmlFor="buscar-receta">
            Buscar una receta
          </label>
          <input
            id="buscar-receta"
            className="entrada"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, ingrediente o paso…"
          />
        </div>

        <div className="con-sufijo ordenador">
          <label className="solo-lectores" htmlFor="orden-recetas">
            Ordenar
          </label>
          <select
            id="orden-recetas"
            className="selector"
            value={orden}
            onChange={(e) => setOrden(e.target.value as Orden)}
          >
            {ORDENES.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.texto}
              </option>
            ))}
          </select>
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="vacio">
          <div className="vacio-tarjeta">
            <Icono nombre="buscar" tam={26} />
            <h2>No hay ninguna receta que coincida</h2>
            <p>Probá con otra palabra, o limpiá la búsqueda.</p>
            <button
              type="button"
              className="boton"
              onClick={() => setBusqueda('')}
            >
              Limpiar búsqueda
            </button>
          </div>
        </div>
      ) : (
        <div className="grilla-recetario">
          {visibles.map(({ receta, costeo, ingredientes }) => {
            const portada = receta.fotos[0]
            const resumen =
              receta.descripcion.trim() ||
              receta.procedimiento.trim() ||
              (ingredientes.length > 0 ? `Lleva ${ingredientes.join(', ')}.` : '')

            return (
              <article key={receta.id} className="receta-card">
                <Link
                  href={`/receta/${receta.id}`}
                  className="receta-foto"
                  aria-label={`Abrir ${receta.nombre}`}
                >
                  {portada ? (
                    <img
                      src={urlFoto(portada.id)}
                      alt={portada.epigrafe || receta.nombre}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span className="receta-foto receta-foto--vacia">
                      <Icono nombre="libro" tam={34} />
                    </span>
                  )}
                  {costeo.precioVenta > 0 ? (
                    <span className="receta-precio-flota cifra">
                      {plata(costeo.precioVenta)}
                    </span>
                  ) : null}
                </Link>

                <div className="receta-cuerpo">
                  <h2 className="receta-titulo">
                    <Link href={`/receta/${receta.id}`}>{receta.nombre}</Link>
                  </h2>

                  {resumen ? <p className="receta-resumen">{resumen}</p> : null}

                  <div className="receta-meta">
                    <span className="numero-catalogo">N°{receta.numero}</span>
                    <span>{fecha(receta.fecha)}</span>
                    {receta.rinde ? <span>· Rinde {receta.rinde}</span> : null}
                    {costeo.incierto ? (
                      <span className="marca-estado marca-estado--sin-precio">
                        Falta precio
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="receta-acciones">
                  <Link href={`/receta/${receta.id}`} className="boton boton--chico boton--fantasma">
                    <Icono nombre="lapiz" tam={15} />
                    Abrir
                  </Link>
                  <form action={accionDuplicarReceta}>
                    <input type="hidden" name="id" value={receta.id} />
                    <button type="submit" className="boton boton--chico boton--fantasma">
                      <Icono nombre="copiar" tam={15} />
                      Duplicar
                    </button>
                  </form>
                  <form action={accionBorrarReceta}>
                    <input type="hidden" name="id" value={receta.id} />
                    <button
                      type="submit"
                      className="boton boton--chico boton--fantasma boton--peligro empuja"
                      aria-label={`Borrar ${receta.nombre}`}
                    >
                      <Icono nombre="basura" tam={15} />
                    </button>
                  </form>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}
