import 'server-only'
import type { Unidad } from './costeo.ts'
import { consultar, nuevoId } from './db.ts'

/**
 * Catálogo inicial para que no arranque con la pantalla vacía.
 *
 * Son los ingredientes genéricos del template, limpiados: sin duplicados
 * (venían "manteca" y "Manteca", "queso mascarpone" y "mascarpone"), con las
 * categorías corregidas (la manteca estaba en "Frutas") y con la capitalización
 * pareja.
 *
 * Los precios NO se siembran. Los del template son de relleno, y un precio
 * inventado es peor que ninguno: haría que una receta cueste algo que no es.
 * Arrancan sin confirmar, para que ella ponga los suyos.
 */

type Semilla = { nombre: string; unidad: Unidad; categoria: string }

export const CATALOGO_INICIAL: Semilla[] = [
  // Básicos
  { nombre: 'Harina 0000', unidad: 'KG', categoria: 'Básicos' },
  { nombre: 'Harina leudante', unidad: 'KG', categoria: 'Básicos' },
  { nombre: 'Premezcla', unidad: 'KG', categoria: 'Básicos' },
  { nombre: 'Azúcar', unidad: 'KG', categoria: 'Básicos' },
  { nombre: 'Azúcar impalpable', unidad: 'KG', categoria: 'Básicos' },
  { nombre: 'Azúcar mascabo', unidad: 'KG', categoria: 'Básicos' },
  { nombre: 'Fécula de maíz', unidad: 'KG', categoria: 'Básicos' },
  { nombre: 'Levadura', unidad: 'KG', categoria: 'Básicos' },
  { nombre: 'Bicarbonato', unidad: 'KG', categoria: 'Básicos' },
  { nombre: 'Sal', unidad: 'KG', categoria: 'Básicos' },
  { nombre: 'Huevo', unidad: 'UNIDAD', categoria: 'Básicos' },
  { nombre: 'Aceite', unidad: 'LITRO', categoria: 'Básicos' },

  // Lácteos
  { nombre: 'Manteca', unidad: 'KG', categoria: 'Lácteos' },
  { nombre: 'Leche', unidad: 'LITRO', categoria: 'Lácteos' },
  { nombre: 'Crema de leche', unidad: 'LITRO', categoria: 'Lácteos' },
  { nombre: 'Queso crema', unidad: 'KG', categoria: 'Lácteos' },
  { nombre: 'Queso mascarpone', unidad: 'KG', categoria: 'Lácteos' },

  // Chocolate
  { nombre: 'Chocolate con leche', unidad: 'KG', categoria: 'Chocolate' },
  { nombre: 'Chocolate blanco', unidad: 'KG', categoria: 'Chocolate' },
  { nombre: 'Chocolate semiamargo', unidad: 'KG', categoria: 'Chocolate' },
  { nombre: 'Cacao amargo', unidad: 'KG', categoria: 'Chocolate' },

  // Rellenos
  { nombre: 'Dulce de leche', unidad: 'KG', categoria: 'Rellenos' },
  { nombre: 'Mermelada', unidad: 'KG', categoria: 'Rellenos' },

  // Galletas
  { nombre: 'Chocolinas', unidad: 'KG', categoria: 'Galletas' },
  { nombre: 'Galletitas María', unidad: 'KG', categoria: 'Galletas' },
  { nombre: 'Galletitas Oreo', unidad: 'KG', categoria: 'Galletas' },

  // Frutas
  { nombre: 'Frutillas', unidad: 'KG', categoria: 'Frutas' },
  { nombre: 'Frutos rojos', unidad: 'KG', categoria: 'Frutas' },
  { nombre: 'Banana', unidad: 'KG', categoria: 'Frutas' },
  { nombre: 'Limón', unidad: 'KG', categoria: 'Frutas' },

  // Decoración
  { nombre: 'Nueces', unidad: 'KG', categoria: 'Decoración' },
  { nombre: 'Coco rallado', unidad: 'KG', categoria: 'Decoración' },
  { nombre: 'Cerezas al marrasquino', unidad: 'KG', categoria: 'Decoración' },
  { nombre: 'Azúcar granulada', unidad: 'KG', categoria: 'Decoración' },
  { nombre: 'Rocklets', unidad: 'KG', categoria: 'Decoración' },

  // Esencias
  { nombre: 'Esencia de vainilla', unidad: 'LITRO', categoria: 'Esencias' },
  { nombre: 'Ralladura de limón', unidad: 'KG', categoria: 'Esencias' },

  // Especiales
  { nombre: 'Café', unidad: 'KG', categoria: 'Especiales' },
  { nombre: 'Gelatina sin sabor', unidad: 'KG', categoria: 'Especiales' },
]

export const CATEGORIAS = [
  'Básicos',
  'Lácteos',
  'Chocolate',
  'Rellenos',
  'Galletas',
  'Frutas',
  'Decoración',
  'Esencias',
  'Especiales',
] as const

/** Una vez confirmada en este proceso, no volvemos a preguntar por la semilla. */
let yaSembrado = false

/** Corre una sola vez: si ya hay algo cargado, no toca nada. */
export async function sembrarSiHaceFalta(): Promise<boolean> {
  if (yaSembrado) return false

  const marca = await consultar<{ valor: string }>(
    `select valor from ajustes where clave = 'semilla'`,
  )
  if (marca.length > 0) {
    yaSembrado = true
    return false
  }

  const hay = await consultar<{ total: unknown }>(`select count(*)::int as total from ingredientes`)
  if (Number(hay[0]?.total ?? 0) === 0) {
    for (const s of CATALOGO_INICIAL) {
      await consultar(
        `insert into ingredientes (id, nombre, precio, unidad, categoria, precio_confirmado)
         values ($1, $2, 0, $3, $4, false)
         on conflict (lower(trim(nombre))) do nothing`,
        [nuevoId(), s.nombre, s.unidad, s.categoria],
      )
    }
  }
  await consultar(
    `insert into ajustes (clave, valor) values ('semilla', $1)
     on conflict (clave) do nothing`,
    [new Date().toISOString()],
  )
  yaSembrado = true
  return true
}
