/**
 * El modelo de costos, transcripto del template de Excel que ya usaba.
 *
 * Las fórmulas son las de la planilla, celda por celda:
 *   costo de línea      F13  =IF((E="KG")+(E="LITRO")+(E="GR")+(E="ML"), C*D/1000, C*D)
 *   subtotal ingred.    F42  =SUM(F13:F41)
 *   costo mano de obra  F46  =D*E
 *   subtotal extras     F63  =SUM(F55:F62)
 *   costo total         F69  =F66+F67+F68
 *   costo por porción   F70  =F69/C8
 *   ganancia en $       F72  =F69*D71
 *   precio de venta     F73  =F69+F72
 *   precio por porción  F74  =F73/C8
 *
 * La única diferencia deliberada con la planilla: cuando un ingrediente no
 * tiene precio confirmado, la planilla lo cuesta en $0 silenciosamente
 * (VLOOKUP sin match -> IFERROR -> 0). Acá eso se reporta como incertidumbre
 * en vez de desaparecer dentro del total.
 */

export type Unidad = 'KG' | 'LITRO' | 'UNIDAD'

export const UNIDADES: readonly Unidad[] = ['KG', 'LITRO', 'UNIDAD'] as const

/** Lo que se tipea en una receta, según la unidad en que se compra el ingrediente. */
export const UNIDAD_DE_USO: Record<Unidad, string> = {
  KG: 'g',
  LITRO: 'ml',
  UNIDAD: 'un',
}

export type Ingrediente = {
  id: string
  nombre: string
  /** Precio por KG, por LITRO o por UNIDAD, según `unidad`. */
  precio: number
  unidad: Unidad
  categoria: string
  /** false = la planilla lo tenía en $0, o nunca se confirmó. No es gratis: es desconocido. */
  precioConfirmado: boolean
  actualizado: string | null
  notas: string | null
}

export type LineaIngrediente = {
  id: string
  ingredienteId: string | null
  /** En gramos, mililitros o unidades. Null mientras no escribió nada. */
  cantidad: number | null
}

export type LineaManoDeObra = {
  id: string
  concepto: string
  /** Minutos trabajados. La tarifa sigue siendo por hora. */
  minutos: number | null
  valorHora: number | null
}

/** Minutos a plata, con la tarifa por hora. */
export const costoDeTiempo = (
  minutos: number | null,
  valorHora: number | null,
): number => {
  const m = typeof minutos === 'number' && Number.isFinite(minutos) ? minutos : 0
  const v = typeof valorHora === 'number' && Number.isFinite(valorHora) ? valorHora : 0
  return (m / 60) * v
}

export type LineaExtra = {
  id: string
  concepto: string
  monto: number | null
}

/**
 * El cliente recibe sólo el id: la imagen se pide aparte a /api/foto/<id>, que
 * la sirve cacheada. Mandar el base64 dentro de la página haría que listar
 * veinte recetas pesara megas.
 */
export type Foto = {
  id: string
  epigrafe: string
}

export const urlFoto = (id: string): string => `/api/foto/${id}`

export type Receta = {
  id: string
  numero: number
  nombre: string
  descripcion: string
  /** Los pasos, en texto libre. Es la parte "recetario", no la de costos. */
  procedimiento: string
  /** "Cantidad que rinde (porciones / unidades)". */
  rinde: number | null
  /** Markup sobre el costo, como fracción: 0.5 = 50%. */
  margen: number
  fecha: string
  ingredientes: LineaIngrediente[]
  manoDeObra: LineaManoDeObra[]
  extras: LineaExtra[]
  fotos: Foto[]
}

export type CostoLinea = {
  linea: LineaIngrediente
  ingrediente: Ingrediente | null
  costo: number
  /** El ingrediente no existe, o su precio nunca se confirmó. */
  incierto: boolean
  motivo: 'ok' | 'sin-ingrediente' | 'sin-precio' | 'sin-cantidad'
}

export type Costeo = {
  lineas: CostoLinea[]
  ingredientes: number
  manoDeObra: number
  extras: number
  total: number
  costoPorPorcion: number | null
  ganancia: number
  precioVenta: number
  precioPorPorcion: number | null
  /**
   * El "% margen" de la planilla es un markup sobre el costo. Esto es el
   * margen real sobre la venta, que es casi siempre lo que la gente cree
   * estar poniendo: markup 100% -> 50% de margen sobre la venta.
   */
  margenSobreVenta: number
  /** Nombres de ingredientes que entran al total sin precio confirmado. */
  sinPrecio: string[]
  /** El total es un piso, no un número cerrado. */
  incierto: boolean
}

const num = (v: number | null | undefined): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0

/**
 * Costo de una línea de ingrediente.
 *
 * Se compra por KG o por LITRO pero se usa en gramos o mililitros, así que la
 * cantidad se divide por 1000. Lo que se compra por UNIDAD se multiplica tal cual.
 */
export function costoDeLinea(
  ingrediente: Ingrediente | null,
  cantidad: number | null,
): { costo: number; incierto: boolean; motivo: CostoLinea['motivo'] } {
  if (!ingrediente) return { costo: 0, incierto: true, motivo: 'sin-ingrediente' }
  if (cantidad === null || !Number.isFinite(cantidad) || cantidad === 0) {
    return { costo: 0, incierto: false, motivo: 'sin-cantidad' }
  }
  const porUnidadDeUso =
    ingrediente.unidad === 'UNIDAD' ? ingrediente.precio : ingrediente.precio / 1000
  const costo = porUnidadDeUso * cantidad
  if (!ingrediente.precioConfirmado) {
    return { costo: 0, incierto: true, motivo: 'sin-precio' }
  }
  return { costo, incierto: false, motivo: 'ok' }
}

export function costear(receta: Receta, catalogo: Map<string, Ingrediente>): Costeo {
  const lineas: CostoLinea[] = receta.ingredientes.map((linea) => {
    const ingrediente = linea.ingredienteId ? catalogo.get(linea.ingredienteId) ?? null : null
    const { costo, incierto, motivo } = costoDeLinea(ingrediente, linea.cantidad)
    return { linea, ingrediente, costo, incierto, motivo }
  })

  const ingredientes = lineas.reduce((acc, l) => acc + l.costo, 0)
  const manoDeObra = receta.manoDeObra.reduce(
    (acc, l) => acc + costoDeTiempo(l.minutos, l.valorHora),
    0,
  )
  const extras = receta.extras.reduce((acc, l) => acc + num(l.monto), 0)

  const total = ingredientes + manoDeObra + extras
  const ganancia = total * receta.margen
  const precioVenta = total + ganancia

  const rinde = receta.rinde && receta.rinde > 0 ? receta.rinde : null

  const sinPrecio = lineas
    .filter((l) => l.motivo === 'sin-precio' && l.linea.cantidad)
    .map((l) => l.ingrediente?.nombre ?? '')
    .filter(Boolean)

  return {
    lineas,
    ingredientes,
    manoDeObra,
    extras,
    total,
    costoPorPorcion: rinde ? total / rinde : null,
    ganancia,
    precioVenta,
    precioPorPorcion: rinde ? precioVenta / rinde : null,
    margenSobreVenta: precioVenta > 0 ? ganancia / precioVenta : 0,
    sinPrecio,
    incierto: sinPrecio.length > 0,
  }
}

/**
 * Escalar una receta a un rinde nuevo.
 *
 * Multiplica las cantidades de ingredientes y los minutos de mano de obra por el
 * factor. Los extras NO se escalan automáticamente: una caja más grande no
 * cuesta el doble, y duplicar el envío sería mentira. Quedan como estaban para
 * que ella los revise.
 */
export function escalar(receta: Receta, rindeNuevo: number): Receta {
  const rindeActual = receta.rinde
  if (!rindeActual || rindeActual <= 0 || rindeNuevo <= 0) return receta
  const factor = rindeNuevo / rindeActual
  const redondear = (v: number) => Math.round(v * 100) / 100
  return {
    ...receta,
    rinde: rindeNuevo,
    ingredientes: receta.ingredientes.map((l) => ({
      ...l,
      cantidad: l.cantidad === null ? null : redondear(l.cantidad * factor),
    })),
    manoDeObra: receta.manoDeObra.map((l) => ({
      ...l,
      minutos: l.minutos === null ? null : redondear(l.minutos * factor),
    })),
  }
}
