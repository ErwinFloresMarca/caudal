import { describe, expect, it } from 'vitest'
import { hashPasswordScrypt, verifyPasswordScrypt } from '../shared/password'

describe('password scrypt', () => {
  it('hash y verify roundtrip', async () => {
    const hash = await hashPasswordScrypt('supersecret')
    expect(hash.startsWith('scrypt$')).toBe(true)
    expect(hash.split('$')).toHaveLength(3)
    expect(await verifyPasswordScrypt(hash, 'supersecret')).toBe(true)
  })

  it('rechaza contraseña incorrecta', async () => {
    const hash = await hashPasswordScrypt('supersecret')
    expect(await verifyPasswordScrypt(hash, 'otra')).toBe(false)
  })

  it('rechaza formato inválido', async () => {
    expect(await verifyPasswordScrypt('no-format', 'x')).toBe(false)
    expect(await verifyPasswordScrypt('', 'x')).toBe(false)
  })

  it('sale distinto para cada hash (sal aleatoria)', async () => {
    const a = await hashPasswordScrypt('misma')
    const b = await hashPasswordScrypt('misma')
    expect(a).not.toBe(b)
    expect(await verifyPasswordScrypt(a, 'misma')).toBe(true)
    expect(await verifyPasswordScrypt(b, 'misma')).toBe(true)
  })
})