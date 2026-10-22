# Diseño

Mundo visual: **Baldosa y Enlozado**. Lo decidió la tirada `3e5ef73e` de Impeccable y lo acotó una restricción puesta por el usuario, que manda sobre todo lo demás:

> no tiene que parecer excel, tiene que ser visualmente cómodo […] mucho menos en el teléfono

Por eso **no hay grilla de celdas en ninguna parte**. Cada sección de costo es un campo con borde visible, y en el teléfono cada ingrediente es una tarjeta apilada, nunca una fila con columnitas.

> Este diseño es provisional por decisión del usuario, que va a traer una propuesta propia una vez que la app funcione. La separación entre tokens y lógica existe para que ese cambio sea barato.

## De dónde sale

La cocina argentina como sistema, no como tema: el **enlozado** (campos de esmalte saturado con un labio negro duro) y la **baldosa calcárea** (módulos separados por juntas de cemento). De ahí salen las tres reglas que gobiernan todo:

1. Un campo de color siempre tiene borde negro. El borde es la estructura, no un adorno.
2. El dato vive sobre cemento o blanco. El esmalte es para encabezados y cifras de resumen, nunca detrás de una tabla de números.
3. Nada de gradientes, sombras, vidrio ni esquinas redondeadas más allá de los 2px que tiene un labio de enlozado real.

## Tokens

Todos en el `:root` de `app/globals.css`. Rediseñar es cambiarlos.

### Superficies

| Token | Valor | Uso |
|---|---|---|
| `--cemento` | `#ede6d8` | Fondo de página |
| `--cemento-hondo` | `#e2d9c7` | Fondo hundido, barra superior |
| `--junta` | `#c9bfac` | Filetes y bordes suaves |
| `--crema` | `#f9f5ec` | Interior de los campos |
| `--rim` | `#17181a` | El borde duro, 2px |

### Esmaltes

Cada sección de costo tiene el suyo, y ese color la identifica en toda la app.

| Token | Valor | Dueño |
|---|---|---|
| `--teal` | `#0e5250` | Ingredientes |
| `--ocre` | `#8f540d` | Mano de obra |
| `--bordo` | `#7e241b` | Packaging y extras |
| `--grafito` | `#17181a` | Datos de la receta y la caja del total |

Los cuatro pasan 4.5:1 contra `--tinta-sobre-esmalte` (`#f7f2e7`).

### Estados

`--alerta` `#a3241c` para precio faltante, `--aviso` `#7d5700` para precio viejo. **Nunca van solos**: siempre con una palabra (`FALTA PRECIO`, `DESACTUALIZADO`) y un borde. Un daltónico tiene que poder usar la app.

## Tipografía

**Archivo**, variable, con eje de ancho, servida por `next/font/google`. Es una grotesca dibujada en Buenos Aires y tiene cifras tabulares de verdad, que es lo que importa cuando hay columnas de plata.

- Display y cifras grandes: `font-stretch: 125%`, peso 700, `letter-spacing: -0.03em`
- Interfaz: 400 a 600
- Rótulos: 11px, mayúsculas, `letter-spacing: 0.1em`
- Todo lo numérico lleva `font-variant-numeric: tabular-nums`

## Clases

| Clase | Qué es |
|---|---|
| `.campo` + `.campo--ingredientes` / `--mano` / `--extras` / `--datos` | Un panel esmaltado. El modificador define `--esmalte`. |
| `.linea` + `.linea--ingrediente` / `--mano` / `--extra` | Una fila de la receta. Apilada en el teléfono, en columnas desde 768px. |
| `.linea--incierta` | La fila cuyo ingrediente no tiene precio. |
| `.boton` + `--principal` / `--agregar` / `--fantasma` / `--chico` / `--peligro` | Detentes. El de agregar es de borde punteado. |
| `.total-caja` | La caja grafito. Pegada a la derecha desde 1024px. |
| `.riel` | El riel fijo del teléfono. Desaparece en escritorio. |
| `.marca-estado--*` | Palabra + forma + color, nunca color solo. |
| `.vacio` | El estado vacío, con el motivo de baldosa de fondo. |

## Responsive

Un solo corte real, **1024px**: abajo es una columna con riel fijo, arriba son dos columnas con la caja del total pegada. Hay cortes menores en 768px (las líneas pasan a columnas) y 720px (la barra superior se reduce al símbolo y las pestañas pierden los íconos para entrar las tres en 375px).

Verificado sin scroll horizontal en 375, 768, 1280 y 1920.

## Movimiento

Un solo gesto: `asentarse`, 260ms con `cubic-bezier(0.22, 1, 0.36, 1)`, desde un estado ya visible. Se anula entero bajo `prefers-reduced-motion`.

## Accesibilidad

Objetivos táctiles de 44px para arriba, campos de 48px. `inputMode="decimal"` en todo lo numérico, así el teléfono abre el teclado de números. Foco visible con el mismo borde duro del sistema. Selección de texto, scrollbars y controles nativos teñidos desde la paleta.

## Lo que falta

- El review formal de Impeccable y el documentador no corrieron: el usuario decidió rediseñar después, así que se priorizó que la app funcione.
- El catálogo todavía no tiene ordenamiento por "más usados", que sería lo natural cuando la lista crezca.
