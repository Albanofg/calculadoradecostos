import 'server-only'
import { consultar, nuevoId } from './db.ts'
import type {
  Ingrediente,
  LineaExtra,
  LineaIngrediente,
  LineaManoDeObra,
  Receta,
  Unidad,
} from './costeo.ts'

/** Postgres devuelve numeric como string, en Neon y en PGlite por igual. */
const n = (v: unknown): number => {
  const x = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN
  return Number.isFinite(x) ? x : 0
}
const nOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const x = Number(v)
  return Number.isFinite(x) ? x : null
}
const iso = (v: unknown): string | null =>
  v instanceof Date ? v.toISOString() : typeof v === 'string' ? v : null

// ─── Ingredientes ────────────────────────────────────────────────────────────

type FilaIngrediente = {
  id: string
  nombre: string
  precio: unknown
  unidad: string
  categoria: string
  precio_confirmado: boolean
  actualizado: unknown
  notas: string | null
}

const aIngrediente = (f: FilaIngrediente): Ingrediente => ({
  id: f.id,
  nombre: f.nombre,
  precio: n(f.precio),
  unidad: f.unidad as Unidad,
  categoria: f.categoria,
  precioConfirmado: Boolean(f.precio_confirmado),
  actualizado: iso(f.actualizado),
  notas: f.notas,
})

export async function listarIngredientes(): Promise<Ingrediente[]> {
  const filas = await consultar<FilaIngrediente>(
    `select id, nombre, precio, unidad, categoria, precio_confirmado, actualizado, notas
       from ingredientes
      order by lower(categoria), lower(nombre)`,
  )
  return filas.map(aIngrediente)
}

export async function crearIngrediente(datos: {
  nombre: string
  precio: number | null
  unidad: Unidad
  categoria: string
  notas?: string | null
}): Promise<Ingrediente> {
  const confirmado = datos.precio !== null && datos.precio > 0
  const filas = await consultar<FilaIngrediente>(
    `insert into ingredientes (id, nombre, precio, unidad, categoria, precio_confirmado, actualizado, notas)
     values ($1, $2, $3, $4, $5, $6, case when $6 then now() else null end, $7)
     on conflict (lower(trim(nombre))) do update
        set precio            = excluded.precio,
            unidad            = excluded.unidad,
            categoria         = excluded.categoria,
            precio_confirmado = excluded.precio_confirmado,
            actualizado       = excluded.actualizado,
            notas             = excluded.notas
     returning id, nombre, precio, unidad, categoria, precio_confirmado, actualizado, notas`,
    [nuevoId(), datos.nombre.trim(), datos.precio ?? 0, datos.unidad, datos.categoria, confirmado, datos.notas ?? null],
  )
  return aIngrediente(filas[0])
}

export async function actualizarIngrediente(
  id: string,
  datos: { nombre: string; precio: number | null; unidad: Unidad; categoria: string; notas?: string | null },
): Promise<void> {
  const confirmado = datos.precio !== null && datos.precio > 0
  await consultar(
    `update ingredientes
        set nombre = $2, precio = $3, unidad = $4, categoria = $5, notas = $6,
            precio_confirmado = $7,
            actualizado = case when $7 then now() else actualizado end
      where id = $1`,
    [id, datos.nombre.trim(), datos.precio ?? 0, datos.unidad, datos.categoria, datos.notas ?? null, confirmado],
  )
}

/** Tocar sólo el precio: el caso más frecuente, y el que refresca la fecha. */
export async function actualizarPrecio(id: string, precio: number): Promise<void> {
  await consultar(
    `update ingredientes
        set precio = $2::numeric,
            precio_confirmado = $2::numeric > 0,
            actualizado = now()
      where id = $1`,
    [id, precio],
  )
}

export async function borrarIngrediente(id: string): Promise<void> {
  await consultar(`delete from ingredientes where id = $1`, [id])
}

export async function contarIngredientes(): Promise<number> {
  const filas = await consultar<{ total: unknown }>(`select count(*)::int as total from ingredientes`)
  return n(filas[0]?.total)
}

// ─── Recetas ─────────────────────────────────────────────────────────────────

type FilaReceta = {
  id: string
  numero: number
  nombre: string
  descripcion: string
  rinde: unknown
  margen: unknown
  fecha: unknown
}

const aReceta = (f: FilaReceta): Omit<Receta, 'ingredientes' | 'manoDeObra' | 'extras'> => ({
  id: f.id,
  numero: Number(f.numero),
  nombre: f.nombre,
  descripcion: f.descripcion,
  rinde: nOrNull(f.rinde),
  margen: n(f.margen),
  fecha: iso(f.fecha) ?? new Date().toISOString(),
})

export const listarRecetas = (): Promise<Receta[]> => cargarRecetas()

export async function obtenerReceta(id: string): Promise<Receta | null> {
  const [receta] = await cargarRecetas(id)
  return receta ?? null
}

async function cargarRecetas(soloId?: string): Promise<Receta[]> {
  const cabeceras = soloId
    ? await consultar<FilaReceta>(
        `select id, numero, nombre, descripcion, rinde, margen, fecha
           from recetas where id = $1`,
        [soloId],
      )
    : await consultar<FilaReceta>(
        `select id, numero, nombre, descripcion, rinde, margen, fecha
           from recetas order by numero desc`,
      )
  if (cabeceras.length === 0) return []

  const ids = cabeceras.map((c) => c.id)
  const [ings, mano, extras] = await Promise.all([
    consultar<{ id: string; receta_id: string; ingrediente_id: string | null; cantidad: unknown }>(
      `select id, receta_id, ingrediente_id, cantidad from receta_ingredientes
        where receta_id = any($1::text[]) order by orden`,
      [ids],
    ),
    consultar<{ id: string; receta_id: string; concepto: string; horas: unknown; valor_hora: unknown }>(
      `select id, receta_id, concepto, horas, valor_hora from receta_mano_obra
        where receta_id = any($1::text[]) order by orden`,
      [ids],
    ),
    consultar<{ id: string; receta_id: string; concepto: string; monto: unknown }>(
      `select id, receta_id, concepto, monto from receta_extras
        where receta_id = any($1::text[]) order by orden`,
      [ids],
    ),
  ])

  const por = <T extends { receta_id: string }>(filas: T[]) => {
    const m = new Map<string, T[]>()
    for (const f of filas) {
      const l = m.get(f.receta_id)
      if (l) l.push(f)
      else m.set(f.receta_id, [f])
    }
    return m
  }
  const mIngs = por(ings)
  const mMano = por(mano)
  const mExtras = por(extras)

  return cabeceras.map((c) => ({
    ...aReceta(c),
    ingredientes: (mIngs.get(c.id) ?? []).map(
      (f): LineaIngrediente => ({
        id: f.id,
        ingredienteId: f.ingrediente_id,
        cantidad: nOrNull(f.cantidad),
      }),
    ),
    manoDeObra: (mMano.get(c.id) ?? []).map(
      (f): LineaManoDeObra => ({
        id: f.id,
        concepto: f.concepto,
        horas: nOrNull(f.horas),
        valorHora: nOrNull(f.valor_hora),
      }),
    ),
    extras: (mExtras.get(c.id) ?? []).map(
      (f): LineaExtra => ({ id: f.id, concepto: f.concepto, monto: nOrNull(f.monto) }),
    ),
  }))
}

/** Guarda una receta nueva o pisa una existente, siempre por referencia a ingredientes. */
export async function guardarReceta(receta: Receta): Promise<string> {
  const existe = receta.id
    ? (await consultar<{ id: string }>(`select id from recetas where id = $1`, [receta.id])).length > 0
    : false
  const id = existe ? receta.id : nuevoId()

  if (existe) {
    await consultar(
      `update recetas set nombre = $2, descripcion = $3, rinde = $4, margen = $5, actualizado = now()
        where id = $1`,
      [id, receta.nombre.trim(), receta.descripcion, receta.rinde, receta.margen],
    )
    await Promise.all([
      consultar(`delete from receta_ingredientes where receta_id = $1`, [id]),
      consultar(`delete from receta_mano_obra where receta_id = $1`, [id]),
      consultar(`delete from receta_extras where receta_id = $1`, [id]),
    ])
  } else {
    await consultar(
      `insert into recetas (id, nombre, descripcion, rinde, margen) values ($1, $2, $3, $4, $5)`,
      [id, receta.nombre.trim(), receta.descripcion, receta.rinde, receta.margen],
    )
  }

  const ingredientes = receta.ingredientes
    .filter((l) => l.ingredienteId || l.cantidad !== null)
    .map((l, i) => [nuevoId(), id, l.ingredienteId, l.cantidad, i])

  const mano = receta.manoDeObra
    .filter((l) => l.concepto.trim() || l.horas !== null || l.valorHora !== null)
    .map((l, i) => [nuevoId(), id, l.concepto, l.horas, l.valorHora, i])

  const extras = receta.extras
    .filter((l) => l.concepto.trim() || l.monto !== null)
    .map((l, i) => [nuevoId(), id, l.concepto, l.monto, i])

  await Promise.all([
    insertarFilas('receta_ingredientes', ['id', 'receta_id', 'ingrediente_id', 'cantidad', 'orden'], ingredientes),
    insertarFilas('receta_mano_obra', ['id', 'receta_id', 'concepto', 'horas', 'valor_hora', 'orden'], mano),
    insertarFilas('receta_extras', ['id', 'receta_id', 'concepto', 'monto', 'orden'], extras),
  ])

  return id
}

/**
 * Una sola sentencia para todas las filas.
 *
 * Sobre Neon por HTTP cada consulta es una ida y vuelta, así que guardar una
 * receta de doce ingredientes línea por línea serían quince viajes. Así es uno.
 */
async function insertarFilas(
  tabla: string,
  columnas: string[],
  filas: unknown[][],
): Promise<void> {
  if (filas.length === 0) return
  const parametros: unknown[] = []
  const grupos = filas.map((fila) => {
    const marcas = fila.map((valor) => {
      parametros.push(valor)
      return `$${parametros.length}`
    })
    return `(${marcas.join(', ')})`
  })
  await consultar(
    `insert into ${tabla} (${columnas.join(', ')}) values ${grupos.join(', ')}`,
    parametros,
  )
}

export async function borrarReceta(id: string): Promise<void> {
  await consultar(`delete from recetas where id = $1`, [id])
}

export async function duplicarReceta(id: string): Promise<string | null> {
  const original = await obtenerReceta(id)
  if (!original) return null
  return guardarReceta({
    ...original,
    id: '',
    nombre: `${original.nombre} (copia)`,
    fecha: new Date().toISOString(),
  })
}
