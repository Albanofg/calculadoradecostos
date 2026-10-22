import { Cargando } from '@/components/Cargando.tsx'

export default function CargandoRecetario() {
  return (
    <Cargando texto="Abriendo el recetario…">
      <div className="grilla-recetario">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="esqueleto esqueleto--tarjeta" />
        ))}
      </div>
    </Cargando>
  )
}
