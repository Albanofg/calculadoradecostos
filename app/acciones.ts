'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Receta, Unidad } from '@/lib/costeo.ts'
import { UNIDADES } from '@/lib/costeo.ts'
import {
  actualizarIngrediente,
  actualizarPrecio,
  agregarFoto,
  borrarFoto,
  borrarIngrediente,
  borrarReceta,
  crearIngrediente,
  duplicarReceta,
  guardarReceta,
} from '@/lib/datos.ts'

const texto = (v: FormDataEntryValue | null): string => (typeof v === 'string' ? v.trim() : '')

const numero = (v: FormDataEntryValue | null): number | null => {
  if (typeof v !== 'string') return null
  const limpio = v.trim().replace(/\./g, '').replace(',', '.')
  if (limpio === '') return null
  const x = Number(limpio)
  return Number.isFinite(x) ? x : null
}

const unidad = (v: FormDataEntryValue | null): Unidad => {
  const s = texto(v).toUpperCase()
  return (UNIDADES as readonly string[]).includes(s) ? (s as Unidad) : 'KG'
}

export type Resultado = { ok: true } | { ok: false; error: string }

// ─── Ingredientes ────────────────────────────────────────────────────────────

export async function accionCrearIngrediente(
  _previo: Resultado | null,
  datos: FormData,
): Promise<Resultado> {
  const nombre = texto(datos.get('nombre'))
  if (!nombre) return { ok: false, error: 'Poné un nombre para el ingrediente.' }

  const precio = numero(datos.get('precio'))
  if (precio !== null && precio < 0) {
    return { ok: false, error: 'El precio no puede ser negativo.' }
  }

  try {
    await crearIngrediente({
      nombre,
      precio,
      unidad: unidad(datos.get('unidad')),
      categoria: texto(datos.get('categoria')) || 'Básicos',
      notas: texto(datos.get('notas')) || null,
    })
  } catch {
    return { ok: false, error: 'No se pudo guardar. Fijate que el nombre no esté repetido.' }
  }
  revalidatePath('/ingredientes')
  revalidatePath('/')
  return { ok: true }
}

export async function accionEditarIngrediente(
  _previo: Resultado | null,
  datos: FormData,
): Promise<Resultado> {
  const id = texto(datos.get('id'))
  const nombre = texto(datos.get('nombre'))
  if (!id) return { ok: false, error: 'Falta el ingrediente.' }
  if (!nombre) return { ok: false, error: 'Poné un nombre para el ingrediente.' }

  const precio = numero(datos.get('precio'))
  if (precio !== null && precio < 0) {
    return { ok: false, error: 'El precio no puede ser negativo.' }
  }

  try {
    await actualizarIngrediente(id, {
      nombre,
      precio,
      unidad: unidad(datos.get('unidad')),
      categoria: texto(datos.get('categoria')) || 'Básicos',
      notas: texto(datos.get('notas')) || null,
    })
  } catch {
    return { ok: false, error: 'No se pudo guardar. Fijate que el nombre no esté repetido.' }
  }
  revalidatePath('/ingredientes')
  revalidatePath('/')
  revalidatePath('/presupuesto')
  return { ok: true }
}

/** El caso rápido: cambiar sólo el precio y refrescar la fecha. */
export async function accionActualizarPrecio(id: string, precio: number): Promise<Resultado> {
  if (!Number.isFinite(precio) || precio < 0) {
    return { ok: false, error: 'Precio inválido.' }
  }
  await actualizarPrecio(id, precio)
  revalidatePath('/ingredientes')
  revalidatePath('/')
  revalidatePath('/presupuesto')
  return { ok: true }
}

export async function accionBorrarIngrediente(datos: FormData): Promise<void> {
  const id = texto(datos.get('id'))
  if (id) await borrarIngrediente(id)
  revalidatePath('/ingredientes')
  revalidatePath('/')
  revalidatePath('/presupuesto')
}

// ─── Recetas ─────────────────────────────────────────────────────────────────

export async function accionGuardarReceta(receta: Receta): Promise<{ id: string }> {
  const id = await guardarReceta(receta)
  revalidatePath('/presupuesto')
  revalidatePath('/')
  return { id }
}

export async function accionBorrarReceta(datos: FormData): Promise<void> {
  const id = texto(datos.get('id'))
  if (id) await borrarReceta(id)
  revalidatePath('/')
  revalidatePath('/presupuesto')
}

// ─── Fotos ───────────────────────────────────────────────────────────────────

/** Tope de seguridad: las imágenes ya vienen achicadas desde el navegador. */
const MAX_FOTO = 900_000

export async function accionAgregarFoto(
  recetaId: string,
  datos: string,
  epigrafe = '',
): Promise<{ ok: true; foto: { id: string; epigrafe: string } } | { ok: false; error: string }> {
  if (!recetaId) {
    return { ok: false, error: 'Guardá la receta antes de agregarle fotos.' }
  }
  if (!datos.startsWith('data:image/')) {
    return { ok: false, error: 'Ese archivo no es una imagen.' }
  }
  if (datos.length > MAX_FOTO) {
    return { ok: false, error: 'La foto quedó muy pesada. Probá con otra.' }
  }

  const foto = await agregarFoto(recetaId, datos, epigrafe)
  if (!foto) return { ok: false, error: 'No encontramos esa receta.' }

  revalidatePath('/')
  revalidatePath('/presupuesto')
  revalidatePath(`/receta/${recetaId}`)
  return { ok: true, foto }
}

export async function accionBorrarFoto(id: string, recetaId: string): Promise<void> {
  if (!id) return
  await borrarFoto(id)
  revalidatePath('/')
  revalidatePath('/presupuesto')
  revalidatePath(`/receta/${recetaId}`)
}

export async function accionDuplicarReceta(datos: FormData): Promise<void> {
  const id = texto(datos.get('id'))
  if (!id) return
  const nuevo = await duplicarReceta(id)
  revalidatePath('/')
  revalidatePath('/presupuesto')
  if (nuevo) redirect(`/receta/${nuevo}`)
}
