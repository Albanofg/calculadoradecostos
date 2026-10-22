import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  costear,
  costoDeLinea,
  costoDeTiempo,
  escalar,
  precioPorCantidad,
  precioUnitarioDePaquete,
  type Ingrediente,
  type Receta,
} from './costeo.ts'

const ing = (over: Partial<Ingrediente> = {}): Ingrediente => ({
  id: 'i1',
  nombre: 'Harina 0000',
  precio: 40,
  unidad: 'KG',
  categoria: 'Básicos',
  precioConfirmado: true,
  actualizado: null,
  notas: null,
  paqueteCantidad: null,
  paquetePrecio: null,
  paqueteUnidad: null,
  ...over,
})

const receta = (over: Partial<Receta> = {}): Receta => ({
  id: 'r1',
  numero: 1,
  nombre: 'Prueba',
  descripcion: '',
  procedimiento: '',
  rinde: null,
  rindeUnidad: 'PORCION',
  esPreparacion: false,
  margen: 0,
  precioManual: null,
  fecha: '2026-10-21',
  ingredientes: [],
  subrecetas: [],
  manoDeObra: [],
  extras: [],
  fotos: [],
  tramos: [],
  ...over,
})

test('KG se cobra por gramo: 500 g de harina a $40/kg = $20', () => {
  const r = costoDeLinea(ing(), 500)
  assert.equal(r.costo, 20)
  assert.equal(r.incierto, false)
})

test('LITRO se cobra por mililitro: 200 ml de crema a $200/L = $40', () => {
  const r = costoDeLinea(ing({ precio: 200, unidad: 'LITRO' }), 200)
  assert.equal(r.costo, 40)
})

test('UNIDAD se multiplica tal cual: 3 oreos a $534 = $1602', () => {
  const r = costoDeLinea(ing({ precio: 534, unidad: 'UNIDAD' }), 3)
  assert.equal(r.costo, 1602)
})

test('un ingrediente sin precio confirmado no vale $0, vale incierto', () => {
  const r = costoDeLinea(ing({ precioConfirmado: false }), 500)
  assert.equal(r.incierto, true)
  assert.equal(r.motivo, 'sin-precio')
})

test('una línea sin ingrediente elegido es incierta, no gratis', () => {
  const r = costoDeLinea(null, 500)
  assert.equal(r.incierto, true)
  assert.equal(r.motivo, 'sin-ingrediente')
})

test('cantidad vacía no es incierta, simplemente todavía no suma', () => {
  const r = costoDeLinea(ing(), null)
  assert.equal(r.costo, 0)
  assert.equal(r.incierto, false)
  assert.equal(r.motivo, 'sin-cantidad')
})

test('el total replica la planilla: ingredientes + mano de obra + extras', () => {
  const catalogo = new Map([['i1', ing()]])
  const c = costear(
    receta({
      ingredientes: [{ id: 'l1', ingredienteId: 'i1', cantidad: 500 }],
      manoDeObra: [{ id: 'm1', concepto: 'Elaboración', minutos: 120, valorHora: 5000 }],
      extras: [{ id: 'e1', concepto: 'Caja', monto: 1200 }],
    }),
    catalogo,
  )
  assert.equal(c.ingredientes, 20)
  assert.equal(c.manoDeObra, 10000)
  assert.equal(c.extras, 1200)
  assert.equal(c.total, 11220)
})

test('la mano de obra se cobra por minuto con tarifa por hora: 90 min a $4000/h = $6000', () => {
  assert.equal(costoDeTiempo(90, 4000), 6000)
})

test('20 minutos a $4000/h son $1333,33 y no se redondean a una hora', () => {
  assert.ok(Math.abs(costoDeTiempo(20, 4000) - 4000 / 3) < 1e-9)
})

test('sin minutos o sin tarifa, la mano de obra no suma', () => {
  assert.equal(costoDeTiempo(null, 4000), 0)
  assert.equal(costoDeTiempo(90, null), 0)
})

test('de paquete a unitario: 5 kg a $23.000 son $4.600 el kilo', () => {
  assert.equal(precioUnitarioDePaquete(23000, 5, 'KG'), 4600)
})

test('un sobre de 150 g a $3.000 son $20.000 el kilo, no $20', () => {
  assert.equal(precioUnitarioDePaquete(3000, 150, 'G'), 20000)
})

test('500 ml a $2.500 son $5.000 el litro', () => {
  assert.equal(precioUnitarioDePaquete(2500, 500, 'ML'), 5000)
})

test('sin unidad asume la canónica, que es como se cargaba antes', () => {
  assert.equal(precioUnitarioDePaquete(23000, 5), 4600)
})

test('un paquete sin cantidad no inventa un precio unitario', () => {
  assert.equal(precioUnitarioDePaquete(23000, null), null)
  assert.equal(precioUnitarioDePaquete(23000, 0), null)
  assert.equal(precioUnitarioDePaquete(null, 5), null)
})

test('el precio manual pisa al sugerido y la ganancia se recalcula', () => {
  const c = costear(
    receta({ margen: 0.75, precioManual: 20000, extras: [{ id: 'e1', concepto: 'x', monto: 10000 }] }),
    new Map(),
  )
  assert.equal(c.total, 10000)
  assert.equal(c.precioSugerido, 17500)
  assert.equal(c.precioVenta, 20000)
  assert.equal(c.esPrecioManual, true)
  assert.equal(c.ganancia, 10000)
})

test('un precio manual en cero o negativo se ignora: vale el sugerido', () => {
  for (const malo of [0, -500]) {
    const c = costear(
      receta({ margen: 0.5, precioManual: malo, extras: [{ id: 'e1', concepto: 'x', monto: 1000 }] }),
      new Map(),
    )
    assert.equal(c.precioVenta, 1500)
    assert.equal(c.esPrecioManual, false)
  }
})

test('una preparación aporta su costo a prorrata de lo que rinde', () => {
  const catalogo = new Map([['i1', ing({ precio: 1000 })]])
  // La crema rinde 500 g y cuesta $500 (500 g de un ingrediente a $1000/kg).
  const crema = receta({
    id: 'crema',
    nombre: 'Crema',
    esPreparacion: true,
    rinde: 500,
    rindeUnidad: 'G',
    ingredientes: [{ id: 'l1', ingredienteId: 'i1', cantidad: 500 }],
  })
  const torta = receta({
    id: 'torta',
    subrecetas: [{ id: 's1', subId: 'crema', cantidad: 200 }],
  })
  const c = costear(torta, catalogo, new Map([['crema', crema]]))
  // 200 g de 500 que rinde, sobre un costo de $500 => $200
  assert.equal(c.preparaciones, 200)
  assert.equal(c.total, 200)
})

test('un ciclo entre preparaciones no cuelga: se marca y no suma', () => {
  const a = receta({ id: 'a', subrecetas: [{ id: 's1', subId: 'b', cantidad: 10 }], rinde: 10 })
  const b = receta({ id: 'b', subrecetas: [{ id: 's2', subId: 'a', cantidad: 10 }], rinde: 10 })
  const c = costear(a, new Map(), new Map([['a', a], ['b', b]]))
  assert.equal(c.total, 0)
  assert.equal(c.incierto, true)
})

test('sin recetario, una preparación queda incompleta y no vale cero', () => {
  const t = receta({ subrecetas: [{ id: 's1', subId: 'crema', cantidad: 100 }] })
  const c = costear(t, new Map())
  assert.equal(c.lineasSub[0].motivo, 'incompleta')
  assert.equal(c.incierto, true)
})

test('tramos: 1 sale $5000 pero 3 salen $12000', () => {
  const tramos = [{ id: 't1', desde: 3, precioTotal: 12000 }]
  assert.deepEqual(precioPorCantidad(5000, tramos, 1).total, 5000)
  assert.equal(precioPorCantidad(5000, tramos, 3).total, 12000)
  assert.equal(precioPorCantidad(5000, tramos, 3).unitario, 4000)
})

test('tramos: con dos tramos gana el más alto que aplique', () => {
  const tramos = [
    { id: 't1', desde: 3, precioTotal: 12000 },
    { id: 't2', desde: 6, precioTotal: 21000 },
  ]
  assert.equal(precioPorCantidad(5000, tramos, 4).unitario, 4000)
  assert.equal(precioPorCantidad(5000, tramos, 6).unitario, 3500)
})

test('el margen es markup sobre el costo, como en la planilla (F73 = F69 + F69*D71)', () => {
  const catalogo = new Map([['i1', ing()]])
  const c = costear(
    receta({ margen: 1, extras: [{ id: 'e1', concepto: 'x', monto: 1000 }] }),
    catalogo,
  )
  assert.equal(c.total, 1000)
  assert.equal(c.ganancia, 1000)
  assert.equal(c.precioVenta, 2000)
})

test('markup del 100% es 50% de margen real sobre la venta', () => {
  const c = costear(
    receta({ margen: 1, extras: [{ id: 'e1', concepto: 'x', monto: 1000 }] }),
    new Map(),
  )
  assert.equal(c.margenSobreVenta, 0.5)
})

test('markup del 50% es 33,3% de margen real sobre la venta', () => {
  const c = costear(
    receta({ margen: 0.5, extras: [{ id: 'e1', concepto: 'x', monto: 1000 }] }),
    new Map(),
  )
  assert.ok(Math.abs(c.margenSobreVenta - 1 / 3) < 1e-9)
})

test('por porción divide costo y precio por el rinde', () => {
  const c = costear(
    receta({ rinde: 10, margen: 0.5, extras: [{ id: 'e1', concepto: 'x', monto: 1000 }] }),
    new Map(),
  )
  assert.equal(c.costoPorPorcion, 100)
  assert.equal(c.precioPorPorcion, 150)
})

test('sin rinde no inventa un por-porción', () => {
  const c = costear(receta({ rinde: null }), new Map())
  assert.equal(c.costoPorPorcion, null)
  assert.equal(c.precioPorPorcion, null)
})

test('rinde en cero no divide por cero', () => {
  const c = costear(receta({ rinde: 0 }), new Map())
  assert.equal(c.costoPorPorcion, null)
})

test('el costeo avisa qué ingredientes entran sin precio', () => {
  const catalogo = new Map([
    ['i1', ing()],
    ['i2', ing({ id: 'i2', nombre: 'Huevo', precioConfirmado: false })],
  ])
  const c = costear(
    receta({
      ingredientes: [
        { id: 'l1', ingredienteId: 'i1', cantidad: 500 },
        { id: 'l2', ingredienteId: 'i2', cantidad: 3 },
      ],
    }),
    catalogo,
  )
  assert.deepEqual(c.sinPrecio, ['Huevo'])
  assert.equal(c.incierto, true)
})

test('escalar multiplica cantidades y minutos, pero no los extras', () => {
  const r = escalar(
    receta({
      rinde: 10,
      ingredientes: [{ id: 'l1', ingredienteId: 'i1', cantidad: 500 }],
      manoDeObra: [{ id: 'm1', concepto: 'x', minutos: 120, valorHora: 5000 }],
      extras: [{ id: 'e1', concepto: 'Caja', monto: 1200 }],
    }),
    20,
  )
  assert.equal(r.rinde, 20)
  assert.equal(r.ingredientes[0].cantidad, 1000)
  assert.equal(r.manoDeObra[0].minutos, 240)
  assert.equal(r.extras[0].monto, 1200)
})

test('escalar sin rinde de origen no hace nada', () => {
  const original = receta({ rinde: null })
  assert.equal(escalar(original, 20), original)
})
