/**
 * Achica las fotos en el navegador antes de mandarlas.
 *
 * Una foto de celular son 3 a 8 MB. Guardada así llenaría la base y haría
 * lentísimo el recetario. Redimensionada a 1200px de lado mayor y en JPEG
 * queda en 80 a 150 KB, que para ver una torta en pantalla alcanza y sobra.
 */

const LADO_MAXIMO = 1200
const CALIDAD = 0.82
/** Tope duro, por debajo del límite del Server Action. */
const PESO_MAXIMO = 850_000

export type ResultadoImagen =
  | { ok: true; datos: string; ancho: number; alto: number; peso: number }
  | { ok: false; error: string }

export async function comprimirImagen(archivo: File): Promise<ResultadoImagen> {
  if (!archivo.type.startsWith('image/')) {
    return { ok: false, error: 'Ese archivo no es una imagen.' }
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(archivo)
  } catch {
    return { ok: false, error: 'No pudimos abrir esa imagen. Probá con otra.' }
  }

  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height))
  const ancho = Math.max(1, Math.round(bitmap.width * escala))
  const alto = Math.max(1, Math.round(bitmap.height * escala))

  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  const ctx = lienzo.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return { ok: false, error: 'Tu navegador no pudo procesar la imagen.' }
  }

  // Los JPEG no tienen transparencia: sin esto, un PNG con fondo transparente
  // sale con el fondo en negro.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, ancho, alto)
  ctx.drawImage(bitmap, 0, 0, ancho, alto)
  bitmap.close()

  // Si con la calidad por defecto sigue pesada, bajamos de a poco.
  let calidad = CALIDAD
  let datos = lienzo.toDataURL('image/jpeg', calidad)
  while (datos.length > PESO_MAXIMO && calidad > 0.4) {
    calidad -= 0.12
    datos = lienzo.toDataURL('image/jpeg', calidad)
  }

  if (datos.length > PESO_MAXIMO) {
    return { ok: false, error: 'Esa foto es demasiado grande, incluso achicada.' }
  }

  return { ok: true, datos, ancho, alto, peso: datos.length }
}

export const pesoLegible = (bytes: number): string =>
  bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
