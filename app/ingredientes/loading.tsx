import { Cargando } from '@/components/Cargando.tsx'

export default function CargandoIngredientes() {
  return (
    <Cargando texto="Buscando tus ingredientes…">
      <div className="grilla-catalogo">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="esqueleto" style={{ height: 196 }} />
        ))}
      </div>
    </Cargando>
  )
}
