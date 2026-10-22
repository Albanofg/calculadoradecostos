const pesos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const pesosRedondos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const cantidades = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 2,
})

/** $ 1.234,56 — con decimales, para costos y totales. */
export const plata = (v: number): string => pesos.format(Number.isFinite(v) ? v : 0)

/** $ 1.235 — sin decimales, para precios de referencia del catálogo. */
export const plataRedonda = (v: number): string =>
  pesosRedondos.format(Number.isFinite(v) ? v : 0)

export const cantidad = (v: number | null): string =>
  v === null || !Number.isFinite(v) ? '' : cantidades.format(v)

/** 0.75 -> "75%" */
export const porcentaje = (v: number): string =>
  `${cantidades.format(Math.round(v * 1000) / 10)}%`

const fechas = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export const fecha = (iso: string | null): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : fechas.format(d)
}

/** Cuántos días hace que no se toca un precio. Null si nunca se confirmó. */
export function diasDesde(iso: string | null, hoy = new Date()): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const ms = hoy.getTime() - d.getTime()
  return Math.max(0, Math.floor(ms / 86_400_000))
}

export type Frescura = 'sin-precio' | 'fresco' | 'tibio' | 'vencido'

/**
 * Con inflación, un precio de hace dos meses ya miente. Los cortes son
 * deliberadamente cortos y se muestran siempre con una palabra, nunca
 * sólo con un color.
 */
export function frescura(
  precioConfirmado: boolean,
  actualizado: string | null,
  hoy = new Date(),
): Frescura {
  if (!precioConfirmado) return 'sin-precio'
  const dias = diasDesde(actualizado, hoy)
  if (dias === null) return 'sin-precio'
  if (dias <= 30) return 'fresco'
  if (dias <= 75) return 'tibio'
  return 'vencido'
}

export const FRESCURA_TEXTO: Record<Frescura, string> = {
  'sin-precio': 'Falta precio',
  fresco: 'Al día',
  tibio: 'Conviene revisar',
  vencido: 'Desactualizado',
}
