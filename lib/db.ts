import 'server-only'
import { SENTENCIAS } from './esquema.ts'

/**
 * Un solo dialecto SQL para los dos lados.
 *
 * En Vercel corre Postgres de verdad (Neon) vía DATABASE_URL. En local, cuando
 * no hay DATABASE_URL, corre PGlite: Postgres compilado a WASM, en proceso, que
 * guarda en ./.data/pg. Es el mismo Postgres, así que las consultas que pruebo
 * acá son las que corren en producción.
 */

type Fila = Record<string, unknown>
type Consultar = <T = Fila>(texto: string, parametros?: unknown[]) => Promise<T[]>

declare global {
  // eslint-disable-next-line no-var
  var __calcDb: { consultar: Consultar; listo: Promise<void> } | undefined
}

const urlPostgres = () =>
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_POSTGRES_URL ||
  ''

const enProduccion = () => process.env.NODE_ENV === 'production'

async function crearNeon(url: string): Promise<Consultar> {
  const { neon } = await import('@neondatabase/serverless')
  const sql = neon(url)
  // Con las opciones por defecto, query() devuelve las filas directamente.
  return async <T>(texto: string, parametros: unknown[] = []) =>
    (await sql.query(texto, parametros)) as T[]
}

async function crearPglite(): Promise<Consultar> {
  const { mkdir } = await import('node:fs/promises')
  const path = await import('node:path')
  const { PGlite } = await import('@electric-sql/pglite')
  const carpeta = path.join(process.cwd(), '.data', 'pg')
  await mkdir(carpeta, { recursive: true })
  const pg = await PGlite.create(carpeta)
  return async <T>(texto: string, parametros: unknown[] = []) => {
    const r = await pg.query<T>(texto, parametros)
    return r.rows
  }
}

/**
 * Aplicar el esquema cuesta una ida y vuelta por sentencia, y sobre Neon por
 * HTTP eso son ~10 viajes en cada arranque en frío. Si las tablas ya están,
 * una sola consulta alcanza para saberlo.
 */
async function migrar(consultar: Consultar) {
  const yaEsta = await consultar<{ existe: boolean }>(
    `select to_regclass('public.ajustes') is not null as existe`,
  )
  if (yaEsta[0]?.existe) return

  for (const sentencia of SENTENCIAS) {
    try {
      await consultar(sentencia)
    } catch (error) {
      // Dos arranques en frío a la vez pueden chocar creando la misma tabla.
      // Si el objeto ya existe, el que perdió la carrera igual está bien.
      const mensaje = error instanceof Error ? error.message : String(error)
      if (!/already exists|duplicate key|ya existe/i.test(mensaje)) throw error
    }
  }
}

function arrancar() {
  if (globalThis.__calcDb) return globalThis.__calcDb

  let consultarReal: Consultar | null = null
  const abriendo = (async () => {
    const url = urlPostgres()
    consultarReal = url ? await crearNeon(url) : await crearPglite()
    await migrar(consultarReal)
  })()

  // Si el arranque falla, no dejamos la promesa rechazada cacheada para
  // siempre: el próximo pedido vuelve a intentar con el código ya corregido.
  abriendo.catch(() => {
    if (globalThis.__calcDb?.listo === abriendo) globalThis.__calcDb = undefined
  })

  globalThis.__calcDb = {
    consultar: async (texto, parametros) => {
      await abriendo
      return consultarReal!(texto, parametros)
    },
    listo: abriendo,
  }
  return globalThis.__calcDb
}

export const consultar: Consultar = (texto, parametros) =>
  arrancar().consultar(texto, parametros)

export const baseLista = () => arrancar().listo

/** Dónde están guardados los datos, para poder decírselo a quien configura el deploy. */
export const dondeGuarda = (): 'postgres' | 'local' => (urlPostgres() ? 'postgres' : 'local')

/**
 * En producción sin DATABASE_URL no hay dónde guardar: el disco de la función
 * es de sólo lectura, así que PGlite tampoco sirve.
 *
 * Esto se consulta ANTES de tocar la base y las páginas muestran una pantalla
 * de configuración. Tirar una excepción no alcanza: en producción Next censura
 * el mensaje y el navegador recibe un 500 sin explicación, que es justo lo que
 * no querés cuando estás configurando el deploy.
 */
export const faltaConfiguracion = (): boolean => !urlPostgres() && enProduccion()

export const nuevoId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
