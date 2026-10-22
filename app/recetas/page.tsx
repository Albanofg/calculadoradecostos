import { redirect } from 'next/navigation'

/** El recetario pasó a ser la pantalla principal. Los links viejos siguen andando. */
export default function RecetasViejo() {
  redirect('/')
}
