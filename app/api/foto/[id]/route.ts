import { obtenerFotoDatos } from '@/lib/datos.ts'

/**
 * Sirve una foto guardada.
 *
 * Las imágenes viven en la base como data URL, pero no viajan dentro de la
 * página: se piden acá y el navegador las cachea. Un id nuevo por imagen hace
 * que el contenido sea inmutable, así que el caché puede ser largo.
 */
export async function GET(
  _pedido: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const datos = await obtenerFotoDatos(id)
  if (!datos) return new Response('No encontrada', { status: 404 })

  const coma = datos.indexOf(',')
  const encabezado = datos.slice(0, coma)
  const tipo = /^data:([^;]+)/.exec(encabezado)?.[1] ?? 'image/jpeg'

  let cuerpo: Buffer
  try {
    cuerpo = Buffer.from(datos.slice(coma + 1), 'base64')
  } catch {
    return new Response('Imagen ilegible', { status: 500 })
  }

  return new Response(new Uint8Array(cuerpo), {
    headers: {
      'Content-Type': tipo,
      'Content-Length': String(cuerpo.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
