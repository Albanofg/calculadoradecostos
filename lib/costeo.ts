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
  /**
   * Lo que compró, tal cual: "5 kg a $23.000". `precio` sigue siendo el
   * canónico por KG/LITRO/UNIDAD y sale de dividir estos dos. Se guardan para
   * poder mostrar y editar lo que ella realmente pagó, en vez de obligarla a
   * recordar la división.
   */
  paqueteCantidad: number | null
  paquetePrecio: number | null
  /** En qué venía: 150 **g**, 5 **kg**. Null si nunca se cargó. */
  paqueteUnidad: UnidadPaquete | null
}

/** En qué puede venir un paquete. Un sobre viene en gramos, no en kilos. */
export type UnidadPaquete = 'G' | 'KG' | 'ML' | 'LITRO' | 'UNIDAD'

/** Cuántas unidades canónicas (kilo, litro, unidad) entran en cada una. */
const EN_UNIDAD_CANONICA: Record<UnidadPaquete, number> = {
  G: 0.001,
  KG: 1,
  ML: 0.001,
  LITRO: 1,
  UNIDAD: 1,
}

/** Qué unidades de paquete tienen sentido según cómo se mide el ingrediente. */
export const PAQUETES_POSIBLES: Record<Unidad, readonly UnidadPaquete[]> = {
  KG: ['G', 'KG'],
  LITRO: ['ML', 'LITRO'],
  UNIDAD: ['UNIDAD'],
}

export const PAQUETE_TEXTO: Record<UnidadPaquete, string> = {
  G: 'g',
  KG: 'kg',
  ML: 'ml',
  LITRO: 'L',
  UNIDAD: 'un',
}

/**
 * De "150 g a $3.000" a "$20.000 el kilo", o de "5 kg a $23.000" a "$4.600".
 *
 * La unidad importa: sin ella, 150 se leería como 150 kilos y el precio por
 * kilo saldría mil veces más barato.
 */
export function precioUnitarioDePaquete(
  paquetePrecio: number | null,
  paqueteCantidad: number | null,
  unidadPaquete: UnidadPaquete = 'KG',
): number | null {
  if (
    paquetePrecio === null ||
    paqueteCantidad === null ||
    !Number.isFinite(paquetePrecio) ||
    !Number.isFinite(paqueteCantidad) ||
    paqueteCantidad <= 0
  ) {
    return null
  }
  const canonica = paqueteCantidad * EN_UNIDAD_CANONICA[unidadPaquete]
  return canonica > 0 ? paquetePrecio / canonica : null
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

/** Un precio que se movió. Lo arma la capa de datos; el tipo vive acá. */
export type CambioDePrecio = {
  ingredienteId: string
  nombre: string
  precioAnterior: number | null
  precioNuevo: number
  cambiado: string
}

/** Una preparación usada adentro de otra receta: un buttercream, un almíbar. */
export type LineaSubreceta = {
  id: string
  subId: string | null
  /** En la unidad en que rinde la preparación (g, ml, unidades o porciones). */
  cantidad: number | null
}

/** "A partir de 3 unidades, las 3 salen $12.000". */
export type Tramo = {
  id: string
  desde: number
  precioTotal: number
}

export type UnidadRinde = 'PORCION' | 'G' | 'ML' | 'UNIDAD'

export const UNIDADES_RINDE: readonly UnidadRinde[] = ['PORCION', 'G', 'ML', 'UNIDAD'] as const

export const RINDE_TEXTO: Record<UnidadRinde, string> = {
  PORCION: 'porciones',
  G: 'gramos',
  ML: 'mililitros',
  UNIDAD: 'unidades',
}

export type Receta = {
  id: string
  numero: number
  nombre: string
  descripcion: string
  /** Los pasos, en texto libre. Es la parte "recetario", no la de costos. */
  procedimiento: string
  /** "Cantidad que rinde (porciones / unidades)". */
  rinde: number | null
  /** En qué unidad rinde. Una preparación rinde gramos, no porciones. */
  rindeUnidad: UnidadRinde
  /** Una preparación existe para usarse dentro de otras recetas. */
  esPreparacion: boolean
  /** Markup sobre el costo, como fracción: 0.5 = 50%. */
  margen: number
  /** Lo que cobra de verdad. null = usar el sugerido que calcula la app. */
  precioManual: number | null
  fecha: string
  ingredientes: LineaIngrediente[]
  subrecetas: LineaSubreceta[]
  manoDeObra: LineaManoDeObra[]
  extras: LineaExtra[]
  fotos: Foto[]
  tramos: Tramo[]
}

export type CostoLinea = {
  linea: LineaIngrediente
  ingrediente: Ingrediente | null
  costo: number
  /** El ingrediente no existe, o su precio nunca se confirmó. */
  incierto: boolean
  motivo: 'ok' | 'sin-ingrediente' | 'sin-precio' | 'sin-cantidad'
}

export type CostoSubreceta = {
  linea: LineaSubreceta
  sub: Receta | null
  costo: number
  incierto: boolean
  motivo: 'ok' | 'sin-preparacion' | 'sin-cantidad' | 'sin-rinde' | 'ciclo' | 'incompleta'
}

export type Costeo = {
  lineas: CostoLinea[]
  lineasSub: CostoSubreceta[]
  ingredientes: number
  /** Lo que aportan las preparaciones. Va aparte para poder mostrarlo. */
  preparaciones: number
  manoDeObra: number
  extras: number
  total: number
  costoPorPorcion: number | null
  /** El que calcula la app: costo × (1 + margen). */
  precioSugerido: number
  /** El que se cobra: el manual si lo hay, si no el sugerido. */
  precioVenta: number
  esPrecioManual: boolean
  /** Siempre precioVenta − total, así sirve igual con precio manual. */
  ganancia: number
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

/**
 * Costea una receta.
 *
 * `recetario` sólo hace falta cuando la receta usa preparaciones adentro. Si no
 * se pasa, esas líneas quedan marcadas como incompletas en vez de valer cero:
 * un costo que falta nunca se reporta como gratis.
 */
export function costear(
  receta: Receta,
  catalogo: Map<string, Ingrediente>,
  recetario?: Map<string, Receta>,
): Costeo {
  return costearCon(receta, catalogo, recetario, new Set())
}

function costearCon(
  receta: Receta,
  catalogo: Map<string, Ingrediente>,
  recetario: Map<string, Receta> | undefined,
  enCurso: Set<string>,
): Costeo {
  const lineas: CostoLinea[] = receta.ingredientes.map((linea) => {
    const ingrediente = linea.ingredienteId ? catalogo.get(linea.ingredienteId) ?? null : null
    const { costo, incierto, motivo } = costoDeLinea(ingrediente, linea.cantidad)
    return { linea, ingrediente, costo, incierto, motivo }
  })

  // Una receta no puede estar adentro de sí misma, ni directa ni a través de
  // otras. Sin esto, A→B→A colgaría el servidor en un bucle infinito.
  const visitados = new Set(enCurso).add(receta.id)

  const lineasSub: CostoSubreceta[] = receta.subrecetas.map((linea) => {
    const vacio = (motivo: CostoSubreceta['motivo'], incierto: boolean): CostoSubreceta => ({
      linea,
      sub: null,
      costo: 0,
      incierto,
      motivo,
    })

    if (!linea.subId) return vacio('sin-preparacion', true)
    if (linea.cantidad === null || !Number.isFinite(linea.cantidad) || linea.cantidad === 0) {
      return vacio('sin-cantidad', false)
    }
    if (visitados.has(linea.subId)) return vacio('ciclo', true)
    if (!recetario) return vacio('incompleta', true)

    const sub = recetario.get(linea.subId) ?? null
    if (!sub) return vacio('sin-preparacion', true)
    if (!sub.rinde || sub.rinde <= 0) {
      return { linea, sub, costo: 0, incierto: true, motivo: 'sin-rinde' }
    }

    const costeoSub = costearCon(sub, catalogo, recetario, visitados)
    const porUnidad = costeoSub.total / sub.rinde
    return {
      linea,
      sub,
      costo: porUnidad * linea.cantidad,
      // Si a la preparación le falta un precio, a esta línea también.
      incierto: costeoSub.incierto,
      motivo: costeoSub.incierto ? 'incompleta' : 'ok',
    }
  })

  const ingredientes = lineas.reduce((acc, l) => acc + l.costo, 0)
  const preparaciones = lineasSub.reduce((acc, l) => acc + l.costo, 0)
  const manoDeObra = receta.manoDeObra.reduce(
    (acc, l) => acc + costoDeTiempo(l.minutos, l.valorHora),
    0,
  )
  const extras = receta.extras.reduce((acc, l) => acc + num(l.monto), 0)

  const total = ingredientes + preparaciones + manoDeObra + extras
  const precioSugerido = total * (1 + receta.margen)

  // El precio manual manda, pero sólo si es un número usable.
  const manual =
    receta.precioManual !== null && Number.isFinite(receta.precioManual) && receta.precioManual > 0
      ? receta.precioManual
      : null
  const precioVenta = manual ?? precioSugerido
  const ganancia = precioVenta - total

  const rinde = receta.rinde && receta.rinde > 0 ? receta.rinde : null

  const sinPrecio = lineas
    .filter((l) => l.motivo === 'sin-precio' && l.linea.cantidad)
    .map((l) => l.ingrediente?.nombre ?? '')
    .filter(Boolean)

  const subsIncompletas = lineasSub
    .filter((l) => l.incierto && l.linea.cantidad)
    .map((l) => l.sub?.nombre ?? 'una preparación')

  return {
    lineas,
    lineasSub,
    ingredientes,
    preparaciones,
    manoDeObra,
    extras,
    total,
    costoPorPorcion: rinde ? total / rinde : null,
    precioSugerido,
    precioVenta,
    esPrecioManual: manual !== null,
    ganancia,
    precioPorPorcion: rinde ? precioVenta / rinde : null,
    margenSobreVenta: precioVenta > 0 ? ganancia / precioVenta : 0,
    sinPrecio: [...sinPrecio, ...subsIncompletas],
    incierto: sinPrecio.length > 0 || subsIncompletas.length > 0,
  }
}

/**
 * El precio unitario de una receta según cuántas se lleven.
 *
 * Los tramos se definen como "a partir de 3, las 3 salen $12.000". Para una
 * cantidad mayor se usa el unitario de ese tramo, así el precio nunca baja al
 * comprar menos ni sube al comprar más.
 */
export function precioPorCantidad(
  precioBase: number,
  tramos: Tramo[],
  cantidad: number,
): { unitario: number; total: number; tramo: Tramo | null } {
  const aplicable = tramos
    .filter((t) => t.desde > 0 && t.desde <= cantidad && t.precioTotal > 0)
    .sort((a, b) => b.desde - a.desde)[0]

  if (!aplicable) {
    return { unitario: precioBase, total: precioBase * cantidad, tramo: null }
  }
  const unitario = aplicable.precioTotal / aplicable.desde
  return { unitario, total: unitario * cantidad, tramo: aplicable }
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
    subrecetas: receta.subrecetas.map((l) => ({
      ...l,
      cantidad: l.cantidad === null ? null : redondear(l.cantidad * factor),
    })),
    manoDeObra: receta.manoDeObra.map((l) => ({
      ...l,
      minutos: l.minutos === null ? null : redondear(l.minutos * factor),
    })),
  }
}
