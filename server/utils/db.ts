import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../db/schema'

const globalDb = globalThis as unknown as { __caudalDb?: NodePgDatabase<typeof schema> }

function createDb() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL || '' })
  return drizzle(pool, { schema })
}

// Singleton: un solo pool por proceso (dev con HMR recicla el guard globalThis).
export const db = globalDb.__caudalDb ?? createDb()
globalDb.__caudalDb = db