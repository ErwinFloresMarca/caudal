import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '../server/utils/db'
import { users, fondos, categorias, settings } from '../server/db/schema'
import { eq } from 'drizzle-orm'
import { crearFondo, listarFondos, getFondo, editarFondo, ocultarFondo, parseFondo, fondoActivoUsuario, fondoDefaultUsuario, KEY_FONDO_DEFAULT } from '../server/utils/fondos'
import { setSetting } from '../server/utils/settings'

const hasDb = Boolean(process.env.DATABASE_URL)

let userIdA: number
let userIdB: number
let userIdC: number

beforeAll(async () => {
  if (!hasDb) return
  const [a] = await db.insert(users).values({ email: `fnd-a-${randomUUID()}@test.dev`, name: 'Fondos A' }).returning({ id: users.id })
  const [b] = await db.insert(users).values({ email: `fnd-b-${randomUUID()}@test.dev`, name: 'Fondos B' }).returning({ id: users.id })
  const [c] = await db.insert(users).values({ email: `fnd-c-${randomUUID()}@test.dev`, name: 'Fondos C' }).returning({ id: users.id })
  userIdA = a.id
  userIdB = b.id
  userIdC = c.id
})

afterAll(async () => {
  if (!hasDb) return
  for (const uid of [userIdA, userIdB, userIdC]) {
    await db.delete(settings).where(eq(settings.user_id, uid))
    await db.delete(categorias).where(eq(categorias.user_id, uid))
    await db.delete(fondos).where(eq(fondos.user_id, uid))
    await db.delete(users).where(eq(users.id, uid))
  }
})

describe.skipIf(!hasDb)('repositorio fondos', () => {
  it('parseFondo valida nombre, tipo y moneda_base', () => {
    expect(() => parseFondo({ nombre: '   ', tipo: 'personal' })).toThrow()
    expect(() => parseFondo({ nombre: 'x', tipo: 'otro', moneda_base: 'BOB' })).toThrow()
    expect(() => parseFondo({ nombre: 'x', tipo: 'personal', moneda_base: 'EUR' })).toThrow()
    expect(parseFondo({ nombre: ' Personal ', tipo: 'personal', moneda_base: 'USD' })).toEqual({
      nombre: 'Personal',
      tipo: 'personal',
      moneda_base: 'USD',
      color: null,
      icono: null,
      activo: undefined,
    })
  })

  it('crear / listar / get: CRUD completo en enteros y por moneda', async () => {
    const fondo = await crearFondo(userIdA, {
      nombre: 'Impresión 3D',
      tipo: 'negocio',
      moneda_base: 'BOB',
      color: '#0E6FFF',
      icono: '3d_rotation',
    })
    expect(fondo.id).toBeGreaterThan(0)
    expect(fondo.moneda_base).toBe('BOB')

    const enDb = await getFondo(userIdA, fondo.id)
    expect(enDb?.nombre).toBe('Impresión 3D')

    const lista = await listarFondos(userIdA)
    expect(lista.some((f) => f.id === fondo.id)).toBe(true)
  })

  it('editar cambia nombre/tipo/moneda/color/icono', async () => {
    const fondo = await crearFondo(userIdA, { nombre: 'Viejo', tipo: 'personal', moneda_base: 'BOB' })
    const editado = await editarFondo(userIdA, fondo.id, {
      nombre: 'Nuevo',
      tipo: 'negocio',
      moneda_base: 'USD',
      color: '#E5484D',
      icono: 'storefront',
    })
    expect(editado.nombre).toBe('Nuevo')
    expect(editado.tipo).toBe('negocio')
    expect(editado.moneda_base).toBe('USD')
    expect(editado.color).toBe('#E5484D')
    expect(editado.icono).toBe('storefront')
  })

  it('ocultar pone activo=false sin borrar el registro', async () => {
    const fondo = await crearFondo(userIdA, { nombre: 'A ocultar', tipo: 'personal', moneda_base: 'BOB' })
    const ocultado = await ocultarFondo(userIdA, fondo.id)
    expect(ocultado.activo).toBe(false)

    const enDb = await getFondo(userIdA, fondo.id)
    expect(enDb?.activo).toBe(false)
    expect(enDb).not.toBeNull()

    const lista = await listarFondos(userIdA)
    expect(lista.some((f) => f.id === fondo.id)).toBe(false)
    const todos = await listarFondos(userIdA, { incluirInactivos: true })
    expect(todos.some((f) => f.id === fondo.id)).toBe(true)
  })

  it('editar/ocultar un fondo ajeno lanza 404 y no lo toca', async () => {
    const fondoA = await crearFondo(userIdA, { nombre: 'Solo de A', tipo: 'personal', moneda_base: 'BOB' })
    await expect(editarFondo(userIdB, fondoA.id, { nombre: 'Robado', tipo: 'personal', moneda_base: 'BOB' })).rejects.toMatchObject({ statusCode: 404 })
    await expect(ocultarFondo(userIdB, fondoA.id)).rejects.toMatchObject({ statusCode: 404 })

    const intacto = await getFondo(userIdA, fondoA.id)
    expect(intacto?.nombre).toBe('Solo de A')
    expect(intacto?.activo).toBe(true)
  })

  it('aislamiento: B no ve los fondos de A', async () => {
    const deB = await listarFondos(userIdB)
    const deA = await listarFondos(userIdA)
    expect(deB.some((f) => deA.some((a) => a.id === f.id))).toBe(false)
  })
})

describe.skipIf(!hasDb)('fondo por defecto', () => {
  it('sin default usa el primer fondo por id, no el alfabéticamente primero', async () => {
    const zeta = await crearFondo(userIdC, { nombre: 'Zeta Zeta', tipo: 'personal', moneda_base: 'BOB' })
    const alfa = await crearFondo(userIdC, { nombre: 'Alfa Alfa', tipo: 'personal', moneda_base: 'BOB' })
    expect(zeta.id).toBeLessThan(alfa.id)
    // El listado sigue alfabético (lo que ve el selector), pero el default no depende de eso.
    expect((await listarFondos(userIdC))[0]?.nombre).toBe('Alfa Alfa')
    expect((await fondoDefaultUsuario(userIdC))?.id).toBe(zeta.id)
    expect((await fondoActivoUsuario(userIdC, null))?.id).toBe(zeta.id)
  })

  it('el default elegido manda; el fondo de la sesión manda sobre el default', async () => {
    const cs = await listarFondos(userIdC)
    const alfa = cs.find((f) => f.nombre === 'Alfa Alfa')!
    const zeta = cs.find((f) => f.nombre === 'Zeta Zeta')!
    await setSetting(userIdC, KEY_FONDO_DEFAULT, alfa.id)
    expect((await fondoActivoUsuario(userIdC, null))?.id).toBe(alfa.id)
    expect((await fondoActivoUsuario(userIdC, zeta.id))?.id).toBe(zeta.id)
  })

  it('un default oculto no se usa', async () => {
    const alfa = (await listarFondos(userIdC)).find((f) => f.nombre === 'Alfa Alfa')!
    const zeta = (await listarFondos(userIdC)).find((f) => f.nombre === 'Zeta Zeta')!
    await ocultarFondo(userIdC, alfa.id)
    expect((await fondoDefaultUsuario(userIdC))?.id).toBe(zeta.id)
  })

  it('aislamiento: el default y la sesión no cruzan usuarios', async () => {
    const deA = await crearFondo(userIdA, { nombre: 'Default de A', tipo: 'personal', moneda_base: 'BOB' })
    await setSetting(userIdA, KEY_FONDO_DEFAULT, deA.id)
    expect((await fondoDefaultUsuario(userIdA))?.id).toBe(deA.id)

    // Un fondo de A no puede ser el activo de la sesión de B: cae al default de B.
    const zeta = (await listarFondos(userIdC)).find((f) => f.nombre === 'Zeta Zeta')!
    expect((await fondoActivoUsuario(userIdC, deA.id))?.id).toBe(zeta.id)
    expect((await fondoDefaultUsuario(userIdC))?.id).not.toBe(deA.id)
  })
})