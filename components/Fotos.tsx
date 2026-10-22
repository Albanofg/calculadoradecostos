'use client'

import { useRef, useState, useTransition } from 'react'
import { urlFoto, type Foto } from '@/lib/costeo.ts'
import { comprimirImagen } from '@/lib/imagen.ts'
import { accionAgregarFoto, accionBorrarFoto } from '@/app/acciones.ts'
import { Icono } from './Icono.tsx'

export function Fotos({
  recetaId,
  fotos,
  onCambio,
}: {
  recetaId: string
  fotos: Foto[]
  onCambio: (fotos: Foto[]) => void
}) {
  const entrada = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, iniciar] = useTransition()

  const guardada = Boolean(recetaId)

  const elegir = async (archivos: FileList | null) => {
    if (!archivos || archivos.length === 0) return
    setError(null)
    setSubiendo(true)

    const nuevas: Foto[] = []
    for (const archivo of Array.from(archivos)) {
      const imagen = await comprimirImagen(archivo)
      if (!imagen.ok) {
        setError(imagen.error)
        continue
      }
      const r = await accionAgregarFoto(recetaId, imagen.datos)
      if (r.ok) nuevas.push(r.foto)
      else setError(r.error)
    }

    if (nuevas.length > 0) onCambio([...fotos, ...nuevas])
    setSubiendo(false)
    if (entrada.current) entrada.current.value = ''
  }

  const quitar = (id: string) => {
    onCambio(fotos.filter((f) => f.id !== id))
    iniciar(async () => {
      await accionBorrarFoto(id, recetaId)
    })
  }

  return (
    <section className="campo campo--datos">
      <header className="campo-cabeza">
        <h2>Fotos</h2>
      </header>
      <div className="campo-cuerpo">
        {!guardada ? (
          <p className="nota">
            Guardá la receta primero y después le podés agregar fotos.
          </p>
        ) : null}

        <div className="tira-fotos">
          {fotos.map((foto) => (
            <figure key={foto.id} className="foto-miniatura">
              <img
                src={urlFoto(foto.id)}
                alt={foto.epigrafe || 'Foto de la receta'}
                loading="lazy"
                decoding="async"
              />
              <button
                type="button"
                className="foto-quitar"
                onClick={() => quitar(foto.id)}
                aria-label="Quitar esta foto"
              >
                <Icono nombre="cruz" tam={15} />
              </button>
            </figure>
          ))}

          <button
            type="button"
            className="subir-foto"
            onClick={() => entrada.current?.click()}
            disabled={!guardada || subiendo}
          >
            <Icono nombre="camara" tam={22} />
            {subiendo ? 'Subiendo…' : 'Agregar'}
          </button>
        </div>

        <input
          ref={entrada}
          type="file"
          accept="image/*"
          multiple
          className="solo-lectores"
          onChange={(e) => elegir(e.target.files)}
        />

        {error ? <p className="nota nota--error">{error}</p> : null}

        {guardada && fotos.length === 0 && !subiendo ? (
          <p className="nota">
            Sacale una foto al resultado. Sirve para acordarte cómo quedó y para
            mandársela al cliente con el presupuesto.
          </p>
        ) : null}
      </div>
    </section>
  )
}
