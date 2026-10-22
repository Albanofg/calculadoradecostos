# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

`delegated` — Next.js (App Router) + TypeScript + Tailwind CSS, data in Postgres, deployed on Vercel.

Rationale recorded so later work knows the choice was offered: the stack round was presented to the user and went unanswered, so the recommended option was taken and is labeled **[assumed]**. The constraints that forced it are confirmed, not assumed: the deploy target is Vercel (user's words), cross-device sync was explicitly chosen over device-local storage (user's answer), and this project's standing instructions forbid Vite and any `vite-plugin-*` / `@vitejs/*` dependency anywhere in the repo.

## Users

**Primary — confirmed.** One Argentine home-based pastry maker (the user's partner), non-technical. She works from a Google Sheets / Excel **template** (`CALCULADORA 2026-.xlsx`) whose contents are placeholder, not her business. She is the only person who enters data.

Her three situations, in order of how often they happen:

- **Adding what she works with.** This is the main act and the one the template makes tedious. Her real pantry and her real recipes do not exist in any digital form yet, so the app's first job is to let her enter an ingredient or build a recipe quickly, repeatedly, from a phone. Confirmed by the user: *"lo que en realidad necesita es agregar recetas, ingredientes y demás."*
- **Pricing a job.** She has an order or an idea and needs to know what it costs her and what to charge, before answering a client.
- **Keeping prices current.** Ingredient costs move constantly under Argentine inflation, so a price entered two months ago quietly under-prices every recipe built on it. The template has a `ÚLTIMA ACTUALIZACIÓN` column for this but no way to act on it.

**Secondary — confirmed.** The user (her partner, technical) sets the app up, deploys it and holds the access key. He is not a daily user.

## Product Purpose

Replace the spreadsheet with a web app that does the same costing arithmetic, but is usable on a phone and keeps one shared, always-current set of numbers across her devices.

Success is behavioral, not feature-based: she stops opening the spreadsheet. That requires three things the spreadsheet fails at — entering a recipe on a phone without pinch-zooming into cells, knowing at a glance which ingredient prices are stale, and saving a recipe without hand-configuring a Google Apps Script.

## Positioning

The mechanism worth preserving from her workbook, and the one a generic "cost calculator" would get wrong: **a saved recipe stores ingredient references and quantities, never frozen costs.**

Her `📚 RECETAS GUARDADAS` sheet recomputes every historical recipe's cost and sale price from the live `🧂 INGREDIENTES` prices via `VLOOKUP`/`SUMPRODUCT`. So when flour goes up, every recipe that uses flour re-prices itself. Her own sheet says it out loud: *"Los precios de venta se actualizan automáticamente cuando modificás los precios en la hoja INGREDIENTES."*

This is the product. A recipe history that froze its costs at save time would be a worse tool than the spreadsheet it replaced, and in her economy it would be actively dangerous.

## Operating Context

- **Language and locale — confirmed.** Spanish, Argentine, `vos` register throughout her workbook ("Mantené actualizada esta lista", "Completá los datos", "Ingresá las horas"). Currency is Argentine pesos, formatted `$ #,##0.00` in her summary cells and `$ #,##0` in price-reference cells.
- **Devices — confirmed.** Phone and laptop. The user named phones, tablets, 720p and 1080p as required targets.
- **Physical scene — confirmed by inference from the artifact.** A home kitchen and a kitchen table. Phone use happens with hands that have been in butter and flour; laptop use happens when quoting a client. Both are indoor, daytime-to-evening, well-lit domestic settings.
- **Tiempo en minutos, tarifa por hora — decidido con el usuario (2026-10-22).** La planilla pedía `HORAS`, pero decorar una torta lleva veinte minutos y nadie piensa eso como "0,33 horas". El campo pasó a minutos y la tarifa quedó por hora, que sí es como se piensa una tarifa. Se guarda en minutos y no en horas fraccionarias porque con `numeric(10,2)` 40 minutos serían `0.67` horas y al reconvertir darían 40,2.
- **Her working units — confirmed.** Ingredients are *stocked* and *priced* per KG, LITRO or UNIDAD, but *used* in grams, millilitres or whole units. Her cost formula encodes exactly this: `precio × cantidad / 1000` for KG/LITRO, `precio × cantidad` for UNIDAD. She enters `500` meaning 500 g of flour priced at `$40/KG`.
- **Her vocabulary — confirmed, must be preserved verbatim.** `INGREDIENTES`, `CANTIDAD`, `PRECIO REF.`, `COSTO`, `MANO DE OBRA`, `$ x HORA`, `PACKAGING Y GASTOS EXTRAS`, `MONTO`, `COSTO TOTAL DE PRODUCCIÓN`, `Costo por porción / unidad`, `% Margen de ganancia deseado`, `Ganancia en $`, `PRECIO DE VENTA SUGERIDO`, `Cantidad que rinde (porciones / unidades)`.
- **Her categories — confirmed, as entered (casing is inconsistent in the source and will be normalized).** Básicos, Lácteos, Especiales, Esencias, Rellenos, Frutas, Decoración, Galletas, Chocolate.
- **Capacity the template allots — confirmed.** 29 ingredient rows, 5 labor rows and 8 expense rows per recipe, all fixed. The template's own sample recipes run 2 to 12 ingredient lines, 0 to 1 labor lines and 1 to 3 expense lines. The app must impose no ceiling at all, and must not design for 29 rows as the common case: rows are added on demand, and the common recipe is under a dozen lines.

## Capabilities and Constraints

**Confirmed costing model, transcribed from the workbook's formulas.** This arithmetic is product truth and may not be "improved" without the user's say:

| Quantity | Formula | Source cell |
|---|---|---|
| Ingredient line cost | `precio × cantidad / 1000` when unit is KG/LITRO/GR/ML; `precio × cantidad` when UNIDAD | `F13` |
| Ingredient subtotal | sum of line costs | `F42` |
| Labor line cost | `minutos / 60 × $porHora` | `F46` (la planilla usaba `horas × $porHora`) |
| Labor subtotal | sum of line costs | `F51` |
| Extras subtotal | sum of `monto` | `F63` |
| **Costo total de producción** | `ingredientes + manoDeObra + extras` | `F69` |
| Costo por porción | `costoTotal / porciones` | `F70` |
| Ganancia en $ | `costoTotal × margen` | `F72` |
| **Precio de venta sugerido** | `costoTotal + ganancia`, i.e. `costoTotal × (1 + margen)` | `F73` |
| Precio por porción | `precioVenta / porciones` | `F74` |

Note on semantics, to be surfaced in the UI rather than silently changed: her `% Margen de ganancia deseado` is a **markup over cost**, not a margin over sale price. At her sheet's recommended 50–100%, a 100% "margen" is actually a 50% margin on revenue. Her instructions sheet recommends 50–100%.

**Confirmed required capabilities.**

- Ingredient list: create, edit, delete. Fields: name, price per unit, unit ∈ {KG, LITRO, UNIDAD}, category, last-updated date, notes.
- Recipe calculator: recipe name, optional description, `cantidad que rinde`, date; ingredient lines, labor lines, extras lines; margin; the full summary above.
- Saved recipe history, re-costed live from current ingredient prices (see Positioning).
- **Fast entry is a capability, not a detail.** Adding an ingredient and adding a recipe line must each be achievable in a few taps on a phone, repeatedly, without leaving the screen or losing place.
- Seed the ingredient catalog with the template's 41 generic pastry ingredients — names, units and categories — **fully editable and deletable** (user's explicit answer: *"si pero que sean editables"*). Because the workbook is a template, its **prices are placeholder and must not be presented as hers**: every seeded ingredient starts as price-unconfirmed so she sets her own. Seeding saves her typing "Harina 0000" and "Dulce de leche"; it never asserts a cost.
- Do **not** seed recipes. The template's sample recipes are placeholder (and carry its typos: `cheescke new york`, `Torta Browmie`). Recipe history starts empty and needs a real empty state that invites the first recipe.
- No login. The app is reachable by anyone with the link, one shared data space. Confirmed by the user, who chose *"Sí pero sin clave"* over a shared key after being told it means zero protection.
- Recipe duplication, automatic portion scaling, and a copy-ready client quote (`presupuesto`) for WhatsApp. All three confirmed by the user.

**Confirmed constraints.**

- No Vite, no `vite.config.*`, no `@vitejs/*`, no `vite-plugin-*`, no `vite`/`vite build` script. Standing project instruction, no exceptions.
- Git operations and deployments belong to the user. This build is edits plus local verification only.
- Must be responsive across phone, tablet, 1280×720 and 1920×1080.

**Explicitly undecided — not invented here.**

- Whether a price-unconfirmed ingredient should be selectable in a recipe at all, or only flagged once used. The template silently costs it at `$0`, which is the behavior worth improving; the exact remedy is a design decision, not a product fact.
- Whether the ingredient catalog needs archiving as distinct from deletion.
- Her real labor rate, her real margin, and her real categories. The template's values (`$1000/h`, `$5000/h`, margins of 0%, 60%, 100%, 150%) are placeholder and must not be presented as defaults that look like advice. The one defensible default comes from the template's own instructions sheet, which recommends 50–100%, and it ships labeled as a suggestion.

## Brand Commitments

None established. The product has no name, logo, typeface or palette the user made binding. The workbook's emoji-per-sheet convention (🧂 🧮 📚) and its `🧁` cupcake motif are her own habit, recorded as observed context, not as an identity the app must adopt.

## Evidence on Hand

**The one real artifact is the template itself, and it is evidence of a *method*, not of a business.** The user was explicit: *"es solo un template… nada de lo que está ahí es data real."*

- `C:\Users\alban\Downloads\CALCULADORA 2026-.xlsx` — 7 sheets, 3 hidden. Fully transcribed: every formula, number format, data validation, and the hidden `⚙️ DETALLE TÉCNICO` engine sheet. **What is real here is the costing model and the vocabulary**, both reproduced above. They are the only things this build inherits.
- 41 generic pastry ingredient names with units and categories — useful as a starter catalog. Their prices, `$0` entries, and `ÚLTIMA ACTUALIZACIÓN` dates are placeholder.
- 10 sample recipes in the engine sheet (`Chocotorta`, `Rosca de Pascua`, `cheescke new york`, `Huevo tableta Oreo`, `Torta Browmie con Frutos Rojos`, and variants). Placeholder. Not seeded.
- One genuine defect in the template, worth designing against rather than reproducing: its sample recipes reference ingredients that are absent from its own master list — `Huevo`, `manteca sancor`, `Galletitas Oreo`, `azucar granulada`. `VLOOKUP` returns no match, `IFERROR` turns that into `0`, and the recipe silently costs those lines at nothing. A costing tool that can quietly value an ingredient at zero is the failure mode this product exists to remove.

**Absences future work must not fabricate:** there are no real ingredient prices, no real recipes, no client names, no sales history, no revenue figures, no testimonials, and no business name. Anything resembling recipe or client content in the UI is illustrative, must read as obviously illustrative, and must never be presented as hers.

## Product Principles

1. **Adding is the main act.** She arrives with an empty catalog and an empty history. Every screen is judged first on how fast it lets her put something new in, and empty states are the common first experience rather than an edge case.
2. **The template's arithmetic is law.** The formulas above are transcribed, not reinterpreted. Where the model is confusing (markup-vs-margin), the app explains it in place; it does not quietly compute something else.
3. **Live re-costing is the feature.** Saved recipes reference ingredients; they never freeze costs. Anything that breaks this breaks the product.
4. **No cost is ever silently zero.** The template's worst behavior is valuing a missing or unpriced ingredient at nothing. An unconfirmed price is a visible state wherever it affects a total, never a `$0` that looks like a real number.
5. **Her words, not ours.** The interface uses the template's vocabulary and `vos` register so she recognizes the tool she already knows how to think in.
6. **A phone with floury hands is the hard case.** Thumb-reachable targets, no horizontal scrolling, no precision tapping, no dense spreadsheet grid on small screens.

## Accessibility & Inclusion

No user-specific need was established. Baseline obligations apply and are non-negotiable given the operating context: WCAG AA contrast, touch targets at or above 44×44 px, numeric keypad input modes for every money and quantity field, full keyboard operability on the laptop, visible focus, and no reliance on color alone to signal a stale or missing price.
