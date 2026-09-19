import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const KEY_LENGTH = 64
const scryptAsync = promisify(scrypt)

export async function hashPasswordScrypt(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
  return `scrypt$${salt}$${derived.toString('hex')}`
}

export async function verifyPasswordScrypt(stored: string, password: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split('$')
  if (scheme !== 'scrypt' || !salt || !hash) return false

  const expected = Buffer.from(hash, 'hex')
  const candidate = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}