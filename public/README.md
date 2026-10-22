# Assets

Todo lo que esté acá adentro se sirve tal cual desde la raíz del sitio. Un
archivo en `public/marca/logo.svg` se pide como `/marca/logo.svg`.

**No lleva `public/` en la ruta.** Es el error más común: `/public/marca/logo.svg`
devuelve 404.

## Dónde va cada cosa

| Carpeta | Para qué |
|---|---|
| `marca/` | Logos e isotipos. Hoy: `casita-dulce-completo.png` (con lettering y guirnalda), `casita-dulce-circular.png` (sólo la casa, recortada en círculo) y `casita-dulce.jpeg`. |
| `iconos/` | Íconos sueltos que no sean parte del sistema de trazo de la app (ver abajo). |
| `fondos/` | Texturas o imágenes de fondo. |
| `fotos/` | Fotos fijas del sitio. Las fotos de recetas **no** van acá: esas las sube ella desde la app y viven en la base. |

## Cómo usarlo

```tsx
import Image from 'next/image'

<Image src="/marca/logo.svg" alt="Casita Dulce" width={120} height={32} priority />
```

Para un SVG chico que necesite heredar el color del texto, conviene pegarlo
inline como componente en vez de servirlo desde acá.

## El logo en la barra superior

Hoy la barra usa el ícono `balanza` dibujado en
[components/Icono.tsx](../components/Icono.tsx). Para reemplazarlo por un logo
de verdad, en [components/NavPrincipal.tsx](../components/NavPrincipal.tsx):

```tsx
<Link href="/" className="marca">
  <Image src="/marca/logo.svg" alt="Casita Dulce" width={28} height={28} priority />
  <span className="marca-texto">Casita Dulce</span>
</Link>
```

El `.marca-texto` se esconde solo en pantallas angostas, así que en el teléfono
queda sólo el símbolo. Si el logo ya incluye el nombre, conviene sacar el
`<span>` y dejar una sola imagen.

## Favicon y el ícono de la app

Ya están puestos, generados desde `marca/casita-dulce-circular.png`. Next los
toma por convención desde `app/`, sin importarlos ni declararlos:

| Archivo | Dónde se ve |
|---|---|
| `app/icon.png` | La pestaña del navegador. 512×512, con la transparencia del círculo. |
| `app/apple-icon.png` | Cuando agrega la app a la pantalla de inicio del iPhone. 180×180, aplanado sobre el verde salvia porque iOS no respeta transparencia: sin eso, el círculo saldría sobre negro. |

Para regenerarlos si cambia el logo, están hechos con Pillow redimensionando el
circular.

## Los colores de la marca

Muestreados del logo, por si hacen falta para algo que tenga que convivir con él:

| Color | Hex |
|---|---|
| Verde salvia (el fondo) | `#939F91` |
| Amarillo manteca (casa y lettering) | `#F7D27F` |
| Rosa floral | `#D38D83` |
| Verde oliva (hojas) | `#9A8959` |

**Ojo que no es la paleta de la app.** La app usa Midnight Violet `#440B3D`,
Dark Spruce `#27470E`, Soft Blossom `#F6BDD1` y Lavender Veil `#F6E4F6`. Los
rosas y lilas conversan con las flores del logo, pero el violeta profundo y el
verde salvia no son la misma familia. Si se pone el logo completo en la barra
superior, van a pelearse. Ver la nota en [DESIGN.md](../DESIGN.md).

## Los íconos de la interfaz

Los de la app no son archivos: están dibujados como SVG en
[components/Icono.tsx](../components/Icono.tsx), con un solo sistema de trazo
(1,75 px, puntas rectas, sin relleno). Para agregar uno, se suma al tipo
`Nombre` y al mapa `TRAZOS`. Mantenerlos ahí es lo que hace que todos se vean
de la misma familia y que hereden el color del texto.

## El PDF del presupuesto

[components/ArmarPresupuesto.tsx](../components/ArmarPresupuesto.tsx) arma el PDF
con jsPDF. Para ponerle el logo, hay que traerlo como data URL —jsPDF no lee
rutas— con el mismo helper `traerImagen()` que ya usa para la foto de la receta:

```ts
const logo = await traerImagen('/marca/logo.png')
if (logo) doc.addImage(logo, 'PNG', M, 10, 30, 10)
```

Para esto conviene un **PNG**, no un SVG: jsPDF no incrusta SVG.

## Peso

Todo lo que esté acá se sirve sin procesar y cuenta para lo que descarga el
teléfono. Un logo en SVG pesa unos pocos KB; un PNG mal exportado puede pesar
cientos. Para fotos, usar `next/image`, que las sirve en el tamaño que hace
falta.
