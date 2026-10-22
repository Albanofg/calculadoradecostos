# Diseño

> **Provisional.** Albano va a traer su propia propuesta. Todo lo visual vive en el
> `:root` de `app/globals.css` con clases semánticas, así que reemplazarlo no toca
> la lógica ni los componentes.

**La paleta sale del logo de Casita Dulce**, muestreada de
`public/marca/casita-dulce-completo.png`: verde salvia, amarillo manteca, rosa floral y
verde oliva. El salvia del logo es demasiado claro y apagado para cargar texto o
acciones, así que se lo llevó a profundidad (`--bosque`) y el salvia original quedó
guardado como token de marca.

Antes hubo dos mundos descartados: "Baldosa y Enlozado" (esmalte con bordes negros duros
sobre cemento), que quedó plano y viejo, y una paleta Midnight Violet / Dark Spruce que
se peleaba con el logo.

## El sistema actual

**Profundidad por luz, no por bordes.** Las superficies se separan con sombras suaves
de baja opacidad y un borde de 1px, no con trazos negros. Tres niveles: `--sombra-1`
para reposo, `--sombra-2` para hover, `--sombra-3` para lo que flota.

**El color es acento y dato, no relleno.** Cada sección se identifica con un trazo de
3px al lado del título, no con una banda de color que ocupa media pantalla. El único
color que llena superficie es el verde del precio de venta, porque ése es el número que
importa.

**La jerarquía la hacen el peso y el tamaño.** Los rótulos en mayúscula con
`letter-spacing` quedaron sólo donde aportan. El resto usa escala y peso.

### Tokens

| Grupo | Tokens |
|---|---|
| Marca | `--salvia` `#939f91`, `--manteca` `#f7d27f`, `--rosa-flor` `#d38d83`, `--oliva` `#9a8959` |
| Derivados | `--bosque` `#3f5243`, `--bosque-hondo` `#2e3d31`, `--bosque-claro`, `--bosque-tenue`, `--oliva-hondo` `#7d6c3f`, `--rosa-hondo` `#a15a50`, `--manteca-tenue` |
| Superficies | `--fondo` `#f6f4ef`, `--superficie` `#fff`, `--superficie-2`, `--superficie-3` |
| Bordes | `--borde` `#e3e4db`, `--borde-fuerte` `#cccfc2` |
| Tinta | `--tinta` `#262a24`, `--tinta-media` `#5a6156`, `--tinta-suave` `#656c5d` |
| Acento | `--acento` = `--bosque`, `--acento-fuerte`, `--acento-tenue` |
| Estados | `--alerta` `#9e3122`, `--aviso` `#8a6a1a` + sus fondos |
| Profundidad | `--sombra-1/2/3` teñidas de verde, `--sombra-foco` |
| Forma | `--radio` 18px, `--radio-chico` 12px, `--radio-micro` 8px |
| Espacio | `--e1` 4px … `--e7` 48px |

Los colores por sección (`--marca-color`) son el trazo del título: bosque para
ingredientes, oliva para mano de obra, rosa para extras, gris para datos.

El **amarillo manteca** es el acento de celebración: el chip de descuento por cantidad
y el foco del precio final. Nunca lleva texto claro encima — sólo tinta oscura, que da
10:1.

**El rojo de alerta se separa a propósito del rosa de la marca.** Si el error se
pareciera al acento, dejaría de leerse como error.

Los 17 pares de contraste del sistema pasan 4.5:1. Hay un script de verificación en el
historial de la sesión; conviene volver a correrlo si se toca un color.

### La marca en la interfaz

| Dónde | Archivo |
|---|---|
| Barra superior | `public/marca/casita-dulce-circular.png`, 34px, redondo con filete |
| Pantallas de carga | `public/marca/casita-dulce-completo.png`, 132px, con un latido lento |
| Pestaña del navegador | `app/icon.png`, generado del cuadrado |
| Pantalla de inicio de iPhone | `app/apple-icon.png`, 180px |
| Encabezado del PDF | Banda en `--bosque-hondo`, por ahora sin logo |

### Tipografía

**Archivo** variable, con eje de ancho, servida por `next/font/google`. Grotesca
dibujada en Buenos Aires, con cifras tabulares reales, que es lo que importa cuando hay
columnas de plata. `font-stretch: 110%` para las cifras grandes; 400–650 para el resto.

El lettering del logo es manuscrito y no se replica en la interfaz: una script no sirve
para leer tablas de números. El logo pone la voz; Archivo pone la legibilidad.

Todo lo numérico lleva `font-variant-numeric: tabular-nums` para que no baile al tipear.

### Clases

| Clase | Qué es |
|---|---|
| `.campo` + `--ingredientes` / `--mano` / `--extras` / `--datos` / `--presupuesto` | Panel de contenido. El modificador define el color del trazo. |
| `.linea` + `--ingrediente` / `--mano` / `--extra` | Fila de la receta. Apilada en el teléfono, en columnas desde 768px. |
| `.receta-card`, `.receta-foto`, `.receta-cuerpo`, `.receta-acciones` | La card del recetario. |
| `.grilla-recetario` | 1 → 2 → 3 → 4 columnas según ancho. |
| `.tira-fotos`, `.foto-miniatura`, `.subir-foto` | Las fotos dentro de una receta. |
| `.total-caja` | La caja oscura del total. Pegada a la derecha desde 1024px. |
| `.riel` | Riel fijo del teléfono, con blur. Desaparece en escritorio. |
| `.boton` + `--principal` / `--agregar` / `--fantasma` / `--chico` / `--peligro` / `--ancho` | |
| `.marca-estado--*` | Punto + palabra + color. Nunca color solo. |

### Responsive

Un corte real en **1024px**: abajo una columna con riel fijo, arriba dos columnas con
la caja del total pegada. Menores en 768px (las líneas pasan a columnas) y 720px (la
marca se reduce al símbolo y las pestañas pierden los íconos).

### Movimiento

Un vocabulario único en tokens, para que nada invente su propia duración:

| Token | Valor | Para qué |
|---|---|---|
| `--vel-1` | 130ms | Toque: hover, foco |
| `--vel-2` | 220ms | Elemento: aparecer, quitar |
| `--vel-3` | 340ms | Panel: entrar una sección |
| `--vel-4` | 520ms | Pantalla: cambiar de página |
| `--escalon` | 55ms | Retraso entre hermanos en cascada |
| `--ease-salida` | `cubic-bezier(.22,1,.36,1)` | La curva por defecto |
| `--ease-resorte` | `cubic-bezier(.34,1.56,.64,1)` | Sólo para lo que confirma algo |

**El gesto central es la cifra que rueda.** `CifraAnimada` interpola el total con
`requestAnimationFrame` mientras se tipea una cantidad, y la cifra late apenas al
llegar. Un salto seco no comunicaría que el número cambió por lo que se acaba de
escribir. Renderiza en el servidor con su valor real y expone el valor final en
`aria-label`, así el lector de pantalla no escucha cada paso intermedio.

Lo demás: entrada por pantalla (`Transicion` cambia la `key` con la ruta, así se vuelve
a disparar al navegar), cascada de paneles y tarjetas por `nth-child` hasta el quinto,
pastilla que se desliza entre pestañas midiendo su ancho real, tarjetas que levantan 3px
con la foto acercándose 4,5%, el tilde que se dibuja al guardar, flechas que se mueven en
hover, y esqueletos con brillo mientras carga cada ruta.

Las filas se van animadas antes de borrarse (`useSalida`). Eso obligó a que `cambiar`
acepte una función del estado anterior: con el borrado diferido 220ms, dos clicks
seguidos calculados sobre el estado viejo resucitarían la primera fila.

Todo se anula bajo `prefers-reduced-motion`, incluidos los retrasos de cascada, el
`transform` de las tarjetas y la interpolación de las cifras, que pasan a actualizarse
directo.

### Accesibilidad

Objetivos táctiles de 44px, campos de 46px. `inputMode="decimal"` en lo numérico para
que el teléfono abra el teclado de números. Foco con anillo de color de acento. El
estado nunca depende sólo del color: siempre hay una palabra.

## Lo que no está verificado

El diseño se revisó leyendo el HTML renderizado, no en un navegador: las herramientas
de browser se desconectaron en esta sesión. Sin confirmar visualmente: la búsqueda y el
orden del recetario (son client-side), la subida de fotos desde un archivo real, y la
descarga del PDF.
