import { describe, expect, it } from 'vitest'
import { API_KEY_PREFIX, generateApiKey, hashApiKey, isApiKeyFormat } from '../shared/api-keys'

describe('api keys', () => {
  it('genera key con prefijo caudal_', () => {
    const key = generateApiKey()
    expect(key.startsWith(API_KEY_PREFIX)).toBe(true)
    expect(key.length).toBeGreaterThan(API_KEY_PREFIX.length + 20)
    expect(isApiKeyFormat(key)).toBe(true)
  })

  it('el hash es determinístico y no expone la key', () => {
    const key = generateApiKey()
    const h = hashApiKey(key)
    expect(h).toBe(hashApiKey(key))
    expect(h).not.toContain(key)
    expect(h).toMatch(/^[0-9a-f]{64}$/)
  })

  it('isApiKeyFormat rechaza tokens sin prefijo', () => {
    expect(isApiKeyFormat('')) .toBe(false)
    expect(isApiKeyFormat('solo-el-prefijo')).toBe(false)
    expect(isApiKeyFormat('otro_token')).toBe(false)
  })
})