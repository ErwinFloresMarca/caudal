import {
  pgTable,
  integer,
  text,
  boolean,
  date,
  timestamp,
  jsonb,
  real,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core'
import type { Cadencia } from '../../shared/recurrentes'

export const moneda = ['BOB', 'USD'] as const
export type Moneda = (typeof moneda)[number]

function id(name: string) {
  return integer(name).generatedAlwaysAsIdentity().primaryKey()
}

export const users = pgTable('users', {
  id: id('id'),
  email: text('email').notNull(),
  name: text('name').notNull(),
  password_hash: text('password_hash'),
  avatar_url: text('avatar_url'),
  timezone: text('timezone').notNull().default('UTC'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('users_email_idx').on(t.email),
])

export type User = typeof users.$inferSelect

export const oauthAccounts = pgTable('oauth_accounts', {
  id: id('id'),
  user_id: integer('user_id').notNull().references(() => users.id),
  provider: text('provider').notNull(),
  provider_id: text('provider_id').notNull(),
  email: text('email'),
  name: text('name'),
  avatar_url: text('avatar_url'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('oauth_accounts_provider_provider_id_idx').on(t.provider, t.provider_id),
  index('oauth_accounts_user_id_idx').on(t.user_id),
])

export type OAuthAccount = typeof oauthAccounts.$inferSelect

export const apiKeys = pgTable('api_keys', {
  id: id('id'),
  user_id: integer('user_id').notNull().references(() => users.id),
  nombre: text('nombre').notNull(),
  key_hash: text('key_hash').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  last_used_at: timestamp('last_used_at', { withTimezone: true }),
}, (t) => [
  uniqueIndex('api_keys_key_hash_idx').on(t.key_hash),
  index('api_keys_user_id_idx').on(t.user_id),
])

export type ApiKey = typeof apiKeys.$inferSelect

export const fondos = pgTable('fondos', {
  id: id('id'),
  user_id: integer('user_id').notNull().references(() => users.id),
  nombre: text('nombre').notNull(),
  tipo: text('tipo').notNull(),
  moneda_base: text('moneda_base').notNull().default('BOB'),
  color: text('color'),
  icono: text('icono'),
  activo: boolean('activo').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('fondos_user_id_idx').on(t.user_id),
])

export type Fondo = typeof fondos.$inferSelect

export const cuentas = pgTable('cuentas', {
  id: id('id'),
  user_id: integer('user_id').notNull().references(() => users.id),
  fondo_id: integer('fondo_id').notNull().references(() => fondos.id),
  nombre: text('nombre').notNull(),
  tipo: text('tipo').notNull(),
  moneda: text('moneda').notNull().$type<Moneda>(),
  saldo_inicial_centavos: integer('saldo_inicial_centavos').notNull().default(0),
  activa: boolean('activa').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('cuentas_user_id_idx').on(t.user_id),
  index('cuentas_fondo_id_idx').on(t.fondo_id),
])

export type Cuenta = typeof cuentas.$inferSelect

export const categorias = pgTable('categorias', {
  id: id('id'),
  user_id: integer('user_id').notNull().references(() => users.id),
  fondo_id: integer('fondo_id').notNull().references(() => fondos.id),
  nombre: text('nombre').notNull(),
  tipo: text('tipo').notNull(),
  icono: text('icono'),
  color: text('color'),
  es_predefinida: boolean('es_predefinida').notNull().default(false),
  activa: boolean('activa').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('categorias_user_id_idx').on(t.user_id),
  index('categorias_fondo_id_idx').on(t.fondo_id),
])

export type Categoria = typeof categorias.$inferSelect

export const transacciones = pgTable('transacciones', {
  id: id('id'),
  user_id: integer('user_id').notNull().references(() => users.id),
  fondo_id: integer('fondo_id').notNull().references(() => fondos.id),
  cuenta_id: integer('cuenta_id').notNull().references(() => cuentas.id),
  categoria_id: integer('categoria_id').references(() => categorias.id),
  tipo: text('tipo').notNull(),
  monto_centavos: integer('monto_centavos').notNull(),
  moneda: text('moneda').notNull().$type<Moneda>(),
  tasa_ref: real('tasa_ref'),
  fecha: date('fecha').notNull(),
  nota: text('nota'),
  fuente: text('fuente'),
  grupo_id: integer('grupo_id'),
  // Qué operación creó el grupo (SPC-038). NULL = grupos previos, tratados como aporte.
  grupo_tipo: text('grupo_tipo').$type<'aporte' | 'pago_cuota'>(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('transacciones_user_id_fecha_idx').on(t.user_id, t.fecha),
  index('transacciones_cuenta_id_idx').on(t.cuenta_id),
  index('transacciones_categoria_id_idx').on(t.categoria_id),
])

export type Transaccion = typeof transacciones.$inferSelect

export const transferencias = pgTable('transferencias', {
  id: id('id'),
  user_id: integer('user_id').notNull().references(() => users.id),
  fondo_id: integer('fondo_id').notNull().references(() => fondos.id),
  cuenta_origen_id: integer('cuenta_origen_id').notNull().references(() => cuentas.id),
  cuenta_destino_id: integer('cuenta_destino_id').notNull().references(() => cuentas.id),
  monto_origen_centavos: integer('monto_origen_centavos').notNull(),
  monto_destino_centavos: integer('monto_destino_centavos').notNull(),
  tasa_ref: real('tasa_ref'),
  fecha: date('fecha').notNull(),
  nota: text('nota'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('transferencias_user_id_fecha_idx').on(t.user_id, t.fecha),
])

export type Transferencia = typeof transferencias.$inferSelect

export const recurrentes = pgTable('recurrentes', {
  id: id('id'),
  user_id: integer('user_id').notNull().references(() => users.id),
  fondo_id: integer('fondo_id').notNull().references(() => fondos.id),
  cuenta_id: integer('cuenta_id').notNull().references(() => cuentas.id),
  categoria_id: integer('categoria_id').references(() => categorias.id),
  tipo: text('tipo').notNull(),
  monto_centavos: integer('monto_centavos').notNull(),
  moneda: text('moneda').notNull().$type<Moneda>(),
  cadencia: jsonb('cadencia').notNull().$type<Cadencia>(),
  proxima_fecha: date('proxima_fecha').notNull(),
  activo: boolean('activo').notNull().default(true),
  nota: text('nota'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('recurrentes_user_id_idx').on(t.user_id),
])

export type Recurrente = typeof recurrentes.$inferSelect

export const deudas = pgTable('deudas', {
  id: id('id'),
  user_id: integer('user_id').notNull().references(() => users.id),
  fondo_id: integer('fondo_id').notNull().references(() => fondos.id),
  contraparte: text('contraparte').notNull(),
  direccion: text('direccion').notNull(),
  concepto: text('concepto'),
  monto_total_centavos: integer('monto_total_centavos').notNull(),
  moneda: text('moneda').notNull().$type<Moneda>(),
  fecha_inicio: date('fecha_inicio').notNull(),
  num_cuotas: integer('num_cuotas').notNull(),
  estado: text('estado').notNull().default('pendiente'),
  nota: text('nota'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('deudas_user_id_idx').on(t.user_id),
])

export type Deuda = typeof deudas.$inferSelect

export const cuotas = pgTable('cuotas', {
  id: id('id'),
  deuda_id: integer('deuda_id').notNull().references(() => deudas.id),
  numero: integer('numero').notNull(),
  fecha_vencimiento: date('fecha_vencimiento').notNull(),
  monto_centavos: integer('monto_centavos').notNull(),
  pagada: boolean('pagada').notNull().default(false),
  fecha_pago: date('fecha_pago'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('cuotas_deuda_id_idx').on(t.deuda_id),
])

export type Cuota = typeof cuotas.$inferSelect

export const metasAhorro = pgTable('metas_ahorro', {
  id: id('id'),
  user_id: integer('user_id').notNull().references(() => users.id),
  fondo_id: integer('fondo_id').notNull().references(() => fondos.id),
  nombre: text('nombre').notNull(),
  monto_objetivo_centavos: integer('monto_objetivo_centavos').notNull(),
  moneda: text('moneda').notNull().$type<Moneda>(),
  fecha_objetivo: date('fecha_objetivo'),
  activa: boolean('activa').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('metas_ahorro_user_id_idx').on(t.user_id),
  index('metas_ahorro_fondo_id_idx').on(t.fondo_id),
])

export type MetaAhorro = typeof metasAhorro.$inferSelect

export const aportesMeta = pgTable('aportes_meta', {
  id: id('id'),
  meta_id: integer('meta_id').notNull().references(() => metasAhorro.id),
  cuenta_id: integer('cuenta_id').references(() => cuentas.id),
  // Transacción espejo cuando el aporte descuenta de una cuenta (SPC-044). Null = solo registro.
  transaccion_id: integer('transaccion_id').references(() => transacciones.id),
  monto_centavos: integer('monto_centavos').notNull(),
  fecha: date('fecha').notNull(),
  nota: text('nota'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('aportes_meta_meta_id_idx').on(t.meta_id),
  index('aportes_meta_cuenta_id_idx').on(t.cuenta_id),
])

export type AporteMeta = typeof aportesMeta.$inferSelect

export const presupuestos = pgTable('presupuestos', {
  id: id('id'),
  user_id: integer('user_id').notNull().references(() => users.id),
  fondo_id: integer('fondo_id').notNull().references(() => fondos.id),
  categoria_id: integer('categoria_id').notNull().references(() => categorias.id),
  mes: text('mes').notNull(),
  moneda: text('moneda').notNull().$type<Moneda>(),
  monto_limite_centavos: integer('monto_limite_centavos').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('presupuestos_fondo_categoria_mes_idx').on(t.fondo_id, t.categoria_id, t.mes),
  index('presupuestos_user_id_idx').on(t.user_id),
])

export type Presupuesto = typeof presupuestos.$inferSelect

export const settings = pgTable('settings', {
  user_id: integer('user_id').notNull().references(() => users.id),
  key: text('key').notNull(),
  value: jsonb('value').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.user_id, t.key] }),
])

export type Setting = typeof settings.$inferSelect