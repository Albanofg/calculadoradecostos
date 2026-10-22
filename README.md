# Calculadora de Costos

Costeo de recetas de pastelería. Reemplaza la planilla `CALCULADORA 2026-.xlsx`.

Next.js 16 (App Router) + React 19 + Postgres. Sin Vite.

## Cómo correrla local

```bash
npm install
npm run dev
```

Abre en <http://localhost:3000>. Sin `DATABASE_URL`, usa **PGlite** (Postgres compilado a WASM, en proceso) y guarda en `.data/pg`, que está en `.gitignore`. No hace falta instalar ni levantar nada.

Otros comandos:

```bash
npm test        # 16 tests del motor de costos
npm run build   # build de producción, incluye typecheck
```

## Deploy en Vercel

1. Subí el repo a GitHub e importalo en Vercel.
2. En el proyecto, **Storage → Create Database → Neon (Postgres)**. Vercel inyecta `DATABASE_URL` solo.
3. **Redeploy**, para que la función tome la variable.

Si te salteás el paso 2, la app **no tira un 500**: muestra una pantalla que explica esos dos pasos. Así se ve si el deploy quedó a medias.

No hay migraciones que correr. Al primer pedido la app aplica el esquema de `lib/esquema.ts` (todo `create table if not exists`) y siembra el catálogo inicial una sola vez. Si las tablas ya están, lo detecta con una sola consulta en vez de diez.

Si preferís otro Postgres, alcanza con setear `DATABASE_URL` (también lee `POSTGRES_URL`).

### Por qué el esquema es TypeScript y no un .sql

Porque `readFile(process.cwd() + '/lib/schema.sql')` anda local y **falla en Vercel**: el tracer de Next no sigue rutas armadas en runtime, así que el archivo no entra en el bundle de la función y el primer pedido muere con `ENOENT`. Como constante de TypeScript viaja siempre con el código.

**No hay login.** Cualquiera con el link entra y ve los mismos datos. Fue una decisión explícita; si después querés una clave, el lugar para ponerla es un `middleware.ts` con una cookie, sin tocar nada más.

## Cómo está armado

| Archivo | Qué hace |
|---|---|
| `lib/costeo.ts` | **El motor.** Puro, sin IO, sin React. Las fórmulas de la planilla, celda por celda. |
| `lib/costeo.test.ts` | Los 16 tests que lo fijan. |
| `lib/db.ts` | Un solo dialecto SQL para Neon (prod) y PGlite (local). |
| `lib/esquema.ts` | El esquema, como constante para que llegue a Vercel. |
| `lib/datos.ts` | Consultas y guardado. |
| `lib/semilla.ts` | Catálogo inicial de 39 ingredientes, sin precios. |
| `lib/format.ts` | Plata en pesos, fechas, y la frescura de un precio. |
| `app/globals.css` | **Todo el diseño.** Tokens y clases semánticas. |
| `app/acciones.ts` | Server Actions. |
| `components/` | Presentación. |

### El modelo de costos

Transcripto de la planilla. Está en `lib/costeo.ts` con la celda de origen en cada línea.

- Un ingrediente se **compra** por kilo, litro o unidad, pero se **usa** en gramos, mililitros o unidades. Por eso `precio × cantidad / 1000` para kilo y litro, y `precio × cantidad` para unidad.
- `costo total = ingredientes + mano de obra + packaging`
- `precio de venta = costo total × (1 + margen)`
- El `%` que ella pone es **recargo sobre el costo**, no margen sobre la venta. Un recargo del 100% deja 50% de ganancia real. La app muestra las dos cifras para que no se confunda.

### Las dos cosas que no hay que romper

1. **Una receta guardada apunta a ingredientes, nunca a costos congelados.** Por eso cuando cambiás el precio de la manteca, todas las recetas que la usan se re-cotizan solas. Es lo mejor que tenía la planilla.
2. **Un ingrediente sin precio no vale `$0`, vale desconocido.** La planilla lo costeaba en cero y escondía el error dentro del total. Acá la línea se marca en rojo, el total avisa que es un piso, y el catálogo lleva la cuenta de cuántos faltan.

## Rediseñar

Todo el color, la medida y la tipografía viven en el `:root` de `app/globals.css`. Los componentes usan clases semánticas (`.campo`, `.linea`, `.boton`, `.total-caja`, `.riel`), no utilidades. Cambiar el aspecto es cambiar esa hoja; la lógica no se toca. Ver `DESIGN.md`.
