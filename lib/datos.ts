import 'server-only'
import { consultar, nuevoId, transaccionar, type Sentencia } from './db.ts'
import type {
  CambioDePrecio,
  Foto,
  LineaSubreceta,
  Tramo,
  UnidadPaquete,
  UnidadRinde,
  Ingrediente,
  LineaExtra,
  LineaIngrediente,
  LineaManoDeObra,
  Receta,
  Unidad,
} from './costeo.ts'

type FilaFoto = { id: string; receta_id: string; epigrafe: string }

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
  paquete_cantidad: unknown
  paquete_precio: unknown
  paquete_unidad: string | null
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
  paqueteCantidad: nOrNull(f.paquete_cantidad),
  paquetePrecio: nOrNull(f.paquete_precio),
  paqueteUnidad: (f.paquete_unidad as UnidadPaquete | null) ?? null,
})

export async function listarIngredientes(): Promise<Ingrediente[]> {
  const filas = await consultar<FilaIngrediente>(
    `select id, nombre, precio, unidad, categoria, precio_confirmado, actualizado, notas,
            paquete_cantidad, paquete_precio, paquete_unidad
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

/**
 * Tocar sólo el precio: el caso más frecuente, y el que refresca la fecha.
 *
 * Deja rastro en `precio_historial`, que es lo que después permite contar qué
 * recetas subieron y cuánto. Va en una transacción para que no quede un cambio
 * de precio sin su registro, ni al revés.
 */
export async function actualizarPrecio(
  id: string,
  precio: number,
  paquete?: { cantidad: number; precio: number; unidad: UnidadPaquete } | null,
): Promise<void> {
  const antes = await consultar<{ precio: unknown }>(
    `select precio from ingredientes where id = $1`,
    [id],
  )
  const anterior = antes.length > 0 ? n(antes[0].precio) : null

  await transaccionar([
    {
      texto: `update ingredientes
                 set precio = $2::numeric,
                     precio_confirmado = $2::numeric > 0,
                     paquete_cantidad = $3,
                     paquete_precio = $4,
                     paquete_unidad = $5,
                     actualizado = now()
               where id = $1`,
      parametros: [
        id,
        precio,
        paquete?.cantidad ?? null,
        paquete?.precio ?? null,
        paquete?.unidad ?? null,
      ],
    },
    {
      texto: `insert into precio_historial (id, ingrediente_id, precio_anterior, precio_nuevo)
              values ($1, $2, $3, $4)`,
      parametros: [nuevoId(), id, anterior, precio],
    },
  ])
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
  procedimiento: string | null
  rinde: unknown
  rinde_unidad: string | null
  es_preparacion: boolean | null
  margen: unknown
  precio_manual: unknown
  fecha: unknown
}

type CabeceraReceta = Omit<
  Receta,
  'ingredientes' | 'subrecetas' | 'manoDeObra' | 'extras' | 'fotos' | 'tramos'
>

const aReceta = (f: FilaReceta): CabeceraReceta => ({
  id: f.id,
  numero: Number(f.numero),
  nombre: f.nombre,
  descripcion: f.descripcion,
  procedimiento: f.procedimiento ?? '',
  rinde: nOrNull(f.rinde),
  rindeUnidad: (f.rinde_unidad ?? 'PORCION') as UnidadRinde,
  esPreparacion: Boolean(f.es_preparacion),
  margen: n(f.margen),
  precioManual: nOrNull(f.precio_manual),
  fecha: iso(f.fecha) ?? new Date().toISOString(),
})

const COLUMNAS_RECETA =
  'id, numero, nombre, descripcion, procedimiento, rinde, rinde_unidad, ' +
  'es_preparacion, margen, precio_manual, fecha'

export const listarRecetas = (): Promise<Receta[]> => cargarRecetas()

export async function obtenerReceta(id: string): Promise<Receta | null> {
  const [receta] = await cargarRecetas(id)
  return receta ?? null
}

/**
 * `fotos: 'todas'` trae las imágenes enteras; 'portada' sólo la primera de cada
 * receta, que es lo que necesita la grilla del recetario. Una foto son decenas
 * de kilobytes, así que traerlas todas para listar sería pesado al pedo.
 */
async function cargarRecetas(
  soloId?: string,
  fotos: 'todas' | 'portada' | 'ninguna' = 'todas',
): Promise<Receta[]> {
  const cabeceras = soloId
    ? await consultar<FilaReceta>(
        `select ${COLUMNAS_RECETA} from recetas where id = $1`,
        [soloId],
      )
    : await consultar<FilaReceta>(
        `select ${COLUMNAS_RECETA} from recetas order by numero desc`,
      )
  if (cabeceras.length === 0) return []

  const ids = cabeceras.map((c) => c.id)
  const [ings, subs, mano, extras, imagenes, tramos] = await Promise.all([
    consultar<{ id: string; receta_id: string; ingrediente_id: string | null; cantidad: unknown }>(
      `select id, receta_id, ingrediente_id, cantidad from receta_ingredientes
        where receta_id = any($1::text[]) order by orden`,
      [ids],
    ),
    consultar<{ id: string; receta_id: string; sub_id: string; cantidad: unknown }>(
      `select id, receta_id, sub_id, cantidad from receta_subrecetas
        where receta_id = any($1::text[]) order by orden`,
      [ids],
    ),
    consultar<{ id: string; receta_id: string; concepto: string; minutos: unknown; valor_hora: unknown }>(
      `select id, receta_id, concepto, minutos, valor_hora from receta_mano_obra
        where receta_id = any($1::text[]) order by orden`,
      [ids],
    ),
    consultar<{ id: string; receta_id: string; concepto: string; monto: unknown }>(
      `select id, receta_id, concepto, monto from receta_extras
        where receta_id = any($1::text[]) order by orden`,
      [ids],
    ),
    // Nunca traemos la columna `datos`: pesa decenas de KB por foto y el
    // cliente la pide por separado a /api/foto/<id>.
    fotos === 'ninguna'
      ? Promise.resolve([] as FilaFoto[])
      : fotos === 'portada'
        ? consultar<FilaFoto>(
            `select distinct on (receta_id) id, receta_id, epigrafe
               from receta_fotos
              where receta_id = any($1::text[])
              order by receta_id, orden`,
            [ids],
          )
        : consultar<FilaFoto>(
            `select id, receta_id, epigrafe from receta_fotos
              where receta_id = any($1::text[]) order by orden`,
            [ids],
          ),
    consultar<{ id: string; receta_id: string; desde: number; precio_total: unknown }>(
      `select id, receta_id, desde, precio_total from receta_tramos
        where receta_id = any($1::text[]) order by desde`,
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
  const mFotos = por(imagenes)
  const mSubs = por(subs)
  const mTramos = por(tramos)

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
        minutos: nOrNull(f.minutos),
        valorHora: nOrNull(f.valor_hora),
      }),
    ),
    extras: (mExtras.get(c.id) ?? []).map(
      (f): LineaExtra => ({ id: f.id, concepto: f.concepto, monto: nOrNull(f.monto) }),
    ),
    subrecetas: (mSubs.get(c.id) ?? []).map(
      (f): LineaSubreceta => ({ id: f.id, subId: f.sub_id, cantidad: nOrNull(f.cantidad) }),
    ),
    fotos: (mFotos.get(c.id) ?? []).map((f): Foto => ({ id: f.id, epigrafe: f.epigrafe })),
    tramos: (mTramos.get(c.id) ?? []).map(
      (f): Tramo => ({ id: f.id, desde: Number(f.desde), precioTotal: n(f.precio_total) }),
    ),
  }))
}

/**
 * Las recetas marcadas como preparación, completas.
 *
 * Vienen con todas sus líneas porque hay que costearlas para saber cuánto
 * aporta un gramo de cada una. Sin fotos: no se muestran acá.
 */
export const listarPreparaciones = (): Promise<Receta[]> =>
  cargarRecetas(undefined, 'ninguna').then((rs) => rs.filter((r) => r.esPreparacion))

/** Para la grilla del recetario: una sola foto por receta. */
export const listarRecetario = (): Promise<Receta[]> =>
  cargarRecetas(undefined, 'portada')

/** Guarda una receta nueva o pisa una existente, siempre por referencia a ingredientes. */
/**
 * Guarda una receta nueva o pisa una existente, siempre por referencia a
 * ingredientes.
 *
 * Va todo en una transacción porque actualizar implica borrar las líneas y
 * reinsertarlas: si fallara algo en el medio sin transacción, la receta
 * quedaría sin ingredientes y lo borrado no vuelve.
 */
export async function guardarReceta(receta: Receta): Promise<string> {
  const existe = receta.id
    ? (await consultar<{ id: string }>(`select id from recetas where id = $1`, [receta.id])).length > 0
    : false
  const id = existe ? receta.id : nuevoId()

  const sentencias: Sentencia[] = []

  if (existe) {
    sentencias.push({
      texto: `update recetas
                 set nombre = $2, descripcion = $3, procedimiento = $4,
                     rinde = $5, rinde_unidad = $6, es_preparacion = $7,
                     margen = $8, precio_manual = $9, actualizado = now()
               where id = $1`,
      parametros: [
        id, receta.nombre.trim(), receta.descripcion, receta.procedimiento,
        receta.rinde, receta.rindeUnidad, receta.esPreparacion,
        receta.margen, receta.precioManual ?? null,
      ],
    })
    // Las fotos no se tocan acá: se agregan y borran por su cuenta, para no
    // mandar de nuevo cada imagen en cada guardado.
    for (const tabla of [
      'receta_ingredientes',
      'receta_subrecetas',
      'receta_mano_obra',
      'receta_extras',
      'receta_tramos',
    ]) {
      sentencias.push({ texto: `delete from ${tabla} where receta_id = $1`, parametros: [id] })
    }
  } else {
    sentencias.push({
      texto: `insert into recetas
                (id, nombre, descripcion, procedimiento, rinde, rinde_unidad,
                 es_preparacion, margen, precio_manual)
              values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      parametros: [
        id, receta.nombre.trim(), receta.descripcion, receta.procedimiento,
        receta.rinde, receta.rindeUnidad, receta.esPreparacion,
        receta.margen, receta.precioManual ?? null,
      ],
    })
  }

  // `?? null` y no `undefined`: un parámetro indefinido no es SQL válido, y un
  // estado del cliente que venga de una versión anterior puede no traer el campo.
  const ingredientes = receta.ingredientes
    .filter((l) => l.ingredienteId || l.cantidad !== null)
    .map((l, i) => [nuevoId(), id, l.ingredienteId ?? null, l.cantidad ?? null, i])

  // Una receta no puede llevarse a sí misma; los ciclos más largos los corta
  // el motor al costear.
  const subrecetas = receta.subrecetas
    .filter((l) => l.subId && l.subId !== id && l.cantidad !== null)
    .map((l, i) => [nuevoId(), id, l.subId, l.cantidad ?? null, i])

  const tramos = receta.tramos
    .filter((t) => t.desde > 0 && t.precioTotal > 0)
    .map((t) => [nuevoId(), id, Math.round(t.desde), t.precioTotal])

  const mano = receta.manoDeObra
    .filter((l) => l.concepto.trim() || l.minutos !== null || l.valorHora !== null)
    .map((l, i) => [nuevoId(), id, l.concepto, l.minutos ?? null, l.valorHora ?? null, i])

  const extras = receta.extras
    .filter((l) => l.concepto.trim() || l.monto !== null)
    .map((l, i) => [nuevoId(), id, l.concepto, l.monto ?? null, i])

  const inserciones: [string, string[], unknown[][]][] = [
    ['receta_ingredientes', ['id', 'receta_id', 'ingrediente_id', 'cantidad', 'orden'], ingredientes],
    ['receta_mano_obra', ['id', 'receta_id', 'concepto', 'minutos', 'valor_hora', 'orden'], mano],
    ['receta_extras', ['id', 'receta_id', 'concepto', 'monto', 'orden'], extras],
    ['receta_subrecetas', ['id', 'receta_id', 'sub_id', 'cantidad', 'orden'], subrecetas],
    ['receta_tramos', ['id', 'receta_id', 'desde', 'precio_total'], tramos],
  ]
  for (const [tabla, columnas, filas] of inserciones) {
    const sentencia = sentenciaDeInsercion(tabla, columnas, filas)
    if (sentencia) sentencias.push(sentencia)
  }

  await transaccionar(sentencias)
  return id
}

/**
 * Una sola sentencia para todas las filas de una tabla.
 *
 * Sobre Neon por HTTP cada consulta es una ida y vuelta, así que guardar una
 * receta de doce ingredientes línea por línea serían quince viajes. Así es uno.
 */
function sentenciaDeInsercion(
  tabla: string,
  columnas: string[],
  filas: unknown[][],
): Sentencia | null {
  if (filas.length === 0) return null
  const parametros: unknown[] = []
  const grupos = filas.map((fila) => {
    const marcas = fila.map((valor) => {
      parametros.push(valor)
      return `$${parametros.length}`
    })
    return `(${marcas.join(', ')})`
  })
  return {
    texto: `insert into ${tabla} (${columnas.join(', ')}) values ${grupos.join(', ')}`,
    parametros,
  }
}

/** Las líneas y las fotos se van solas: las claves foráneas son on delete cascade. */
export async function borrarReceta(id: string): Promise<void> {
  await consultar(`delete from recetas where id = $1`, [id])
}

// ─── Fotos ───────────────────────────────────────────────────────────────────

export async function agregarFoto(
  recetaId: string,
  datos: string,
  epigrafe = '',
): Promise<Foto | null> {
  const existe = await consultar<{ id: string }>(`select id from recetas where id = $1`, [recetaId])
  if (existe.length === 0) return null

  const siguiente = await consultar<{ proximo: number }>(
    `select coalesce(max(orden) + 1, 0)::int as proximo from receta_fotos where receta_id = $1`,
    [recetaId],
  )
  const id = nuevoId()
  await consultar(
    `insert into receta_fotos (id, receta_id, datos, epigrafe, orden) values ($1, $2, $3, $4, $5)`,
    [id, recetaId, datos, epigrafe, Number(siguiente[0]?.proximo ?? 0)],
  )
  return { id, epigrafe }
}

export async function borrarFoto(id: string): Promise<void> {
  await consultar(`delete from receta_fotos where id = $1`, [id])
}

/** La imagen en sí. La pide /api/foto/<id>, no las páginas. */
export async function obtenerFotoDatos(id: string): Promise<string | null> {
  const filas = await consultar<{ datos: string }>(
    `select datos from receta_fotos where id = $1`,
    [id],
  )
  return filas[0]?.datos ?? null
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

// ─── Impacto de los cambios de precio ────────────────────────────────────────

/**
 * Los cambios de precio desde una fecha, uno por ingrediente.
 *
 * Se queda con el precio más viejo del período como "anterior" y el más nuevo
 * como "actual": si la harina cambió tres veces esta semana, lo que importa es
 * de dónde salió y dónde está, no cada escalón.
 */
export async function cambiosDePrecio(desdeDias = 7): Promise<CambioDePrecio[]> {
  return (
    await consultar<{
      ingrediente_id: string
      nombre: string
      precio_anterior: unknown
      precio_nuevo: unknown
      cambiado: unknown
    }>(
      `select distinct on (h.ingrediente_id)
              h.ingrediente_id,
              i.nombre,
              first_value(h.precio_anterior) over (
                partition by h.ingrediente_id order by h.cambiado asc
              ) as precio_anterior,
              last_value(h.precio_nuevo) over (
                partition by h.ingrediente_id order by h.cambiado asc
                rows between unbounded preceding and unbounded following
              ) as precio_nuevo,
              max(h.cambiado) over (partition by h.ingrediente_id) as cambiado
         from precio_historial h
         join ingredientes i on i.id = h.ingrediente_id
        where h.cambiado >= now() - ($1 || ' days')::interval
        order by h.ingrediente_id, h.cambiado desc`,
      [String(Math.max(1, Math.round(desdeDias)))],
    )
  )
    .map((f) => ({
      ingredienteId: f.ingrediente_id,
      nombre: f.nombre,
      precioAnterior: nOrNull(f.precio_anterior),
      precioNuevo: n(f.precio_nuevo),
      cambiado: iso(f.cambiado) ?? new Date().toISOString(),
    }))
    // Un cambio que no movió el precio no es un cambio.
    .filter((c) => c.precioAnterior === null || c.precioAnterior !== c.precioNuevo)
}
