import 'server-only'
import { ULTIMA_VERSION, VERSIONES } from './esquema.ts'

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
 * Aplica sólo las versiones que falten.
 *
 * Sobre Neon por HTTP cada sentencia es una ida y vuelta, así que en el caso
 * normal (base al día) esto cuesta una sola consulta: leer la versión.
 */
async function migrar(consultar: Consultar) {
  const actual = await versionActual(consultar)
  if (actual >= ULTIMA_VERSION) return

  for (const { version, sentencias } of VERSIONES) {
    if (version <= actual) continue
    for (const sentencia of sentencias) {
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

  await consultar(
    `insert into ajustes (clave, valor) values ('esquema_version', $1)
     on conflict (clave) do update set valor = excluded.valor`,
    [String(ULTIMA_VERSION)],
  )
}

/**
 * 0 = base vacía. Una base que ya existía antes de que esto estuviera
 * versionado no tiene la marca, pero sí la tabla `ajustes`: ésa es la 1.
 */
async function versionActual(consultar: Consultar): Promise<number> {
  const hayAjustes = await consultar<{ existe: boolean }>(
    `select to_regclass('public.ajustes') is not null as existe`,
  )
  if (!hayAjustes[0]?.existe) return 0

  const marca = await consultar<{ valor: string }>(
    `select valor from ajustes where clave = 'esquema_version'`,
  )
  const guardada = Number(marca[0]?.valor)
  return Number.isFinite(guardada) && guardada > 0 ? guardada : 1
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

  // Una sola migración de rescate por proceso, para que N pedidos fallando a la
  // vez no disparen N migraciones en paralelo.
  let rescate: Promise<void> | null = null

  globalThis.__calcDb = {
    consultar: async (texto, parametros) => {
      await abriendo
      try {
        return await consultarReal!(texto, parametros)
      } catch (error) {
        if (!faltaAlgoDelEsquema(error)) throw error
        // El código quedó adelante del esquema: migramos y reintentamos una vez.
        // Pasa cuando se recarga el código sin reiniciar el proceso, y antes
        // dejaba la app rota hasta un reinicio a mano.
        rescate ??= migrar(consultarReal!).finally(() => {
          rescate = null
        })
        await rescate
        return await consultarReal!(texto, parametros)
      }
    },
    listo: abriendo,
  }
  return globalThis.__calcDb
}

/**
 * Postgres avisa con códigos propios cuando falta una tabla (42P01) o una
 * columna (42703). Cualquier otro error no se reintenta: un dato inválido o una
 * violación de unicidad no se arreglan migrando.
 */
function faltaAlgoDelEsquema(error: unknown): boolean {
  const codigo = (error as { code?: unknown })?.code
  if (codigo === '42703' || codigo === '42P01') return true
  const mensaje = error instanceof Error ? error.message : String(error)
  return /does not exist|no existe/i.test(mensaje) && /column|relation|columna|relación/i.test(mensaje)
}

export const consultar: Consultar = (texto, parametros) =>
  arrancar().consultar(texto, parametros)

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
