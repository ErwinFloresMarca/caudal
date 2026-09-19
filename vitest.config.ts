import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'

// Carga .env para que los tests de BD tengan DATABASE_URL (solo si no está en el ambiente).
const envPath = fileURLToPath(new URL('./.env', import.meta.url))
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)="?([^"\n]*)"?/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

export default defineConfig({
  resolve: {
    alias: {
      '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'shared/**/*.test.ts'],
  },
})