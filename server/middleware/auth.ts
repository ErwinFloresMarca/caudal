import { defineEventHandler } from 'h3'
import { authUserId } from '../utils/auth'

const PUBLIC_PREFIXES = ['/api/_health', '/api/_auth/', '/api/auth/']

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/')) return
  if (PUBLIC_PREFIXES.some((p) => path.startsWith(p))) return
  await authUserId(event)
})