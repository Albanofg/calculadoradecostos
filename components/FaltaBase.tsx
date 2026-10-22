import { Icono } from './Icono.tsx'

/**
 * Lo que ve quien abre la app deployada sin base de datos conectada.
 * Es para el que configura el deploy, no para la pastelera.
 */
export function FaltaBase() {
  return (
    <main className="pagina">
      <div className="vacio">
        <div className="vacio-tarjeta" style={{ maxWidth: '58ch', alignItems: 'flex-start' }}>
          <Icono nombre="alerta" tam={28} />
          <h2>Falta conectar la base de datos</h2>
          <p>
            La app está deployada pero no tiene dónde guardar. Son dos pasos y queda andando:
          </p>
          <ol
            className="pila"
            style={{ margin: 0, paddingLeft: '1.2em', color: 'var(--tinta-suave)', fontSize: 15 }}
          >
            <li>
              En tu proyecto de Vercel, andá a <strong>Storage → Create Database → Neon</strong>.
              Vercel agrega la variable <code>DATABASE_URL</code> sola.
            </li>
            <li>
              Volvé a deployar (<strong>Deployments → … → Redeploy</strong>) para que la tome.
            </li>
          </ol>
          <p style={{ fontSize: 14 }}>
            Las tablas se crean solas en el primer pedido, así que no hay migraciones que correr.
            Si usás otro Postgres, alcanza con definir <code>DATABASE_URL</code> a mano.
          </p>
        </div>
      </div>
    </main>
  )
}
