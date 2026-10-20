// Aplica las migraciones de Drizzle que viajan dentro del artefacto de release.
//   node .output/server/migrate.mjs [carpeta-de-migraciones]
// No necesita drizzle-kit ni un checkout del repo: `drizzle-orm` y `pg` ya están
// en .output/server/node_modules (Nitro los traza). Usa la misma tabla
// drizzle.__drizzle_migrations que `drizzle-kit migrate`, así que es idempotente
// y no re-aplica lo que producción ya tiene.
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('✗ DATABASE_URL no está definida en el entorno')
  process.exit(1)
}

const carpeta = process.argv[2] ?? fileURLToPath(new URL('../migrations', import.meta.url))

const client = new Client({ connectionString: url })
await client.connect()
try {
  console.log(`> Migraciones desde ${carpeta}`)
  await migrate(drizzle(client), { migrationsFolder: carpeta })
  console.log('> Migraciones al día')
} finally {
  await client.end()
}
