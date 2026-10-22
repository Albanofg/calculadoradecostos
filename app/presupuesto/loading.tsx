import { Cargando } from '@/components/Cargando.tsx'

export default function CargandoPresupuesto() {
  return (
    <Cargando texto="Armando el presupuesto…">
      <div className="doble">
        <div className="columna">
          <div className="esqueleto" style={{ height: 290 }} />
          <div className="esqueleto" style={{ height: 240 }} />
        </div>
        <div className="columna">
          <div className="esqueleto" style={{ height: 330 }} />
        </div>
      </div>
    </Cargando>
  )
}
