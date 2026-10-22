import { Cargando } from '@/components/Cargando.tsx'

export default function CargandoReceta() {
  return (
    <Cargando texto="Abriendo la receta…">
      <div className="doble">
        <div className="columna">
          <div className="esqueleto" style={{ height: 250 }} />
          <div className="esqueleto" style={{ height: 320 }} />
          <div className="esqueleto" style={{ height: 180 }} />
        </div>
        <div className="columna">
          <div className="esqueleto" style={{ height: 380 }} />
        </div>
      </div>
    </Cargando>
  )
}
