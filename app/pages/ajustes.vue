<script setup lang="ts">
const request = useRequestFetch()
const { user, clear } = useUserSession()
const colorMode = useColorMode()

// Apariencia
const OPCIONES_MODO = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'system', label: 'Sistema' },
]
const modo = computed({
  get: () => colorMode.preference,
  set: (v: string) => { colorMode.preference = v },
})

const { data: ajustes, refresh } = await useAsyncData('ajustes', () => request<{ perfil: { id: number; nombre: string; email: string; timezone: string; tiene_password: boolean }; moneda_base: 'BOB' | 'USD'; tasa: { actual: { valor: number; fecha: string } | null; historial: { valor: number; fecha: string }[] } }>('/api/ajustes'))
const { data: keys, refresh: refreshKeys } = await useAsyncData('api-keys', () => request<{ id: number; nombre: string; created_at: string; last_used_at: string | null }[]>('/api/api-keys'))

const perfil = computed(() => ajustes.value?.perfil ?? null)
const fechaCorta = (f: string | null) => (f ? new Date(f).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Nunca')

// Perfil
const perfilAbierto = ref(false)
const pf = reactive({ nombre: '', email: '', timezone: 'UTC' })
const pfError = ref('')
function abrirPerfil() {
  if (perfil.value) {
    pf.nombre = perfil.value.nombre
    pf.email = perfil.value.email
    pf.timezone = perfil.value.timezone
  }
  pfError.value = ''
  perfilAbierto.value = true
}
async function guardarPerfil() {
  pfError.value = ''
  try {
    await $fetch('/api/ajustes/perfil', { method: 'PATCH', body: { nombre: pf.nombre, email: pf.email, timezone: pf.timezone } })
    await refresh()
    perfilAbierto.value = false
  } catch (e) {
    pfError.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'No se pudo guardar'
  }
}

// Seguridad
const passAbierto = ref(false)
const pw = reactive({ actual: '', nueva: '' })
const pwError = ref('')
const pwOk = ref('')
function abrirPass() {
  pw.actual = ''
  pw.nueva = ''
  pwError.value = ''
  passAbierto.value = true
}
async function cambiarPass() {
  pwError.value = ''
  try {
    await $fetch('/api/ajustes/password', { method: 'POST', body: { actual: pw.actual, nueva: pw.nueva } })
    passAbierto.value = false
    pwOk.value = 'Contraseña actualizada.'
    setTimeout(() => (pwOk.value = ''), 4000)
  } catch (e) {
    pwError.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'No se pudo cambiar'
  }
}

// Moneda y tasa
const prefAbierto = ref(false)
const pref = reactive({ moneda_base: 'BOB' as 'BOB' | 'USD', tasa: '' })
const prefError = ref('')
function abrirPref() {
  pref.moneda_base = ajustes.value?.moneda_base ?? 'BOB'
  pref.tasa = ajustes.value?.tasa.actual ? String(ajustes.value.tasa.actual.valor) : ''
  prefError.value = ''
  prefAbierto.value = true
}
async function guardarPref() {
  prefError.value = ''
  const body: Record<string, unknown> = { moneda_base: pref.moneda_base }
  if (pref.tasa.trim()) body.tasa = pref.tasa
  try {
    await $fetch('/api/ajustes/preferencias', { method: 'PATCH', body })
    await refresh()
    prefAbierto.value = false
  } catch (e) {
    prefError.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'No se pudo guardar'
  }
}

// API keys
const keyAbierta = ref(false)
const keyNombre = ref('')
const keyCreada = ref('')
const keyError = ref('')
function abrirKey() {
  keyNombre.value = ''
  keyCreada.value = ''
  keyError.value = ''
  keyAbierta.value = true
}
async function crearKey() {
  keyError.value = ''
  try {
    const r = await $fetch<{ key: string }>('/api/api-keys', { method: 'POST', body: { nombre: keyNombre.value || 'API key' } })
    keyCreada.value = r.key
    await refreshKeys()
  } catch (e) {
    keyError.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'No se pudo crear'
  }
}
const keyPorRevocar = ref<number | null>(null)
const revocarAbierto = computed({ get: () => keyPorRevocar.value != null, set: (v: boolean) => { if (!v) keyPorRevocar.value = null } })
async function revocarKey() {
  if (keyPorRevocar.value == null) return
  await $fetch(`/api/api-keys/${keyPorRevocar.value}`, { method: 'DELETE' })
  keyPorRevocar.value = null
  await refreshKeys()
}

// Sesión
async function cerrarSesion() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/login')
}

// Datos
const borrarAbierto = ref(false)
const confirmacion = ref('')
const borrarError = ref('')
async function borrarCuenta() {
  borrarError.value = ''
  try {
    await $fetch('/api/ajustes/borrar-cuenta', { method: 'POST', body: { confirmacion: confirmacion.value } })
    await clear()
    await navigateTo('/login')
  } catch (e) {
    borrarError.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'No se pudo borrar'
  }
}
</script>

<template>
  <section class="max-w-3xl">
    <div class="mb-6">
      <h1 class="hs-1">Ajustes</h1>
      <p class="mt-1 text-ink-muted">Tu perfil, seguridad y preferencias.</p>
    </div>

    <p v-if="pwOk" class="mb-4 rounded-xl bg-[rgb(15_164_127/0.10)] px-4 py-2 text-sm text-positive">{{ pwOk }}</p>

    <div class="flex flex-col gap-4">
      <!-- Perfil -->
      <div class="card flex items-center justify-between gap-4 p-5">
        <div class="min-w-0">
          <p class="text-sm font-semibold text-ink">Perfil</p>
          <p class="truncate text-sm text-ink-muted">{{ perfil?.nombre }} · {{ perfil?.email }} · {{ perfil?.timezone }}</p>
        </div>
        <button type="button" class="btn-secondary h-10 shrink-0 px-4 text-sm" @click="abrirPerfil">Editar</button>
      </div>

      <!-- Apariencia -->
      <div class="card flex items-center justify-between gap-4 p-5">
        <div>
          <p class="text-sm font-semibold text-ink">Apariencia</p>
          <p class="text-sm text-ink-muted">Tema de la interfaz</p>
        </div>
        <USelect v-model="modo" :items="OPCIONES_MODO" class="w-36" />
      </div>

      <!-- Seguridad -->
      <div class="card flex items-center justify-between gap-4 p-5">
        <div>
          <p class="text-sm font-semibold text-ink">Seguridad</p>
          <p class="text-sm text-ink-muted">{{ perfil?.tiene_password ? 'Cambiar contraseña' : 'Tu cuenta usa Google' }}</p>
        </div>
        <button type="button" class="btn-secondary h-10 shrink-0 px-4 text-sm" :disabled="!perfil?.tiene_password" @click="abrirPass">Cambiar</button>
      </div>

      <!-- Moneda y tasa -->
      <div class="card flex items-center justify-between gap-4 p-5">
        <div class="min-w-0">
          <p class="text-sm font-semibold text-ink">Moneda y tasa</p>
          <p class="truncate text-sm text-ink-muted">
            Base {{ ajustes?.moneda_base }} · Tasa paralelo {{ ajustes?.tasa.actual ? ajustes.tasa.actual.valor : '—' }}
            <span v-if="ajustes?.tasa.actual">({{ fechaCorta(ajustes.tasa.actual.fecha) }})</span>
          </p>
        </div>
        <button type="button" class="btn-secondary h-10 shrink-0 px-4 text-sm" @click="abrirPref">Editar</button>
      </div>

      <!-- Categorías y Fondos -->
      <div class="card flex items-center justify-between gap-4 p-5">
        <div>
          <p class="text-sm font-semibold text-ink">Categorías y fondos</p>
          <p class="text-sm text-ink-muted">Se gestionan dentro de cada fondo.</p>
        </div>
        <NuxtLink to="/fondos" class="btn-secondary h-10 shrink-0 px-4 text-sm">Ir a fondos</NuxtLink>
      </div>

      <!-- API keys -->
      <div class="card p-5">
        <div class="mb-3 flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-ink">API keys (MCP)</p>
            <p class="text-sm text-ink-muted">Para conectar el asistente. Se muestran una sola vez al crearlas.</p>
          </div>
          <button type="button" class="btn-primary h-10 shrink-0 px-4 text-sm" @click="abrirKey">Crear</button>
        </div>
        <ul class="divide-y divide-border">
          <li v-for="k in keys ?? []" :key="k.id" class="flex items-center justify-between gap-3 py-3">
            <span class="flex flex-col">
              <span class="text-sm text-ink">{{ k.nombre }}</span>
              <span class="text-xs text-ink-faint">Último uso: {{ fechaCorta(k.last_used_at) }}</span>
            </span>
            <button type="button" class="btn-secondary h-9 px-3 text-xs text-negative" @click="keyPorRevocar = k.id">Revocar</button>
          </li>
          <li v-if="!(keys ?? []).length" class="py-4 text-center text-sm text-ink-muted">Aún no creaste API keys.</li>
        </ul>
      </div>

      <!-- Sesión -->
      <div class="card flex items-center justify-between gap-4 p-5">
        <div>
          <p class="text-sm font-semibold text-ink">Sesión</p>
          <p class="text-sm text-ink-muted">{{ user?.email }}</p>
        </div>
        <button type="button" class="btn-secondary h-10 shrink-0 px-4 text-sm" @click="cerrarSesion">Cerrar sesión</button>
      </div>

      <!-- Datos -->
      <div class="card flex items-center justify-between gap-4 border-negative p-5">
        <div>
          <p class="text-sm font-semibold text-negative">Borrar cuenta</p>
          <p class="text-sm text-ink-muted">Elimina todos tus datos. No se puede deshacer.</p>
        </div>
        <button type="button" class="btn-primary h-10 shrink-0 bg-negative px-4 text-sm hover:bg-negative" @click="borrarAbierto = true">Borrar</button>
      </div>
    </div>

    <!-- Perfil slideover -->
    <USlideover v-model:open="perfilAbierto" title="Editar perfil">
      <template #body>
        <div class="flex flex-col gap-4">
          <label class="flex flex-col gap-1"><span class="text-sm text-ink-muted">Nombre</span><input v-model="pf.nombre" type="text" class="input-field"></label>
          <label class="flex flex-col gap-1"><span class="text-sm text-ink-muted">Email</span><input v-model="pf.email" type="email" class="input-field"></label>
          <label class="flex flex-col gap-1">
            <span class="text-sm text-ink-muted">Zona horaria</span>
            <input v-model="pf.timezone" type="text" list="tz" placeholder="America/La_Paz" class="input-field">
            <datalist id="tz">
              <option value="UTC" /><option value="America/La_Paz" /><option value="America/Argentina/Buenos_Aires" /><option value="America/Lima" /><option value="America/Bogota" /><option value="America/Mexico_City" /><option value="Europe/Madrid" />
            </datalist>
          </label>
          <p v-if="pfError" class="text-sm text-negative">{{ pfError }}</p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary h-11 px-5 text-sm" @click="perfilAbierto = false">Cancelar</button>
          <button type="button" class="btn-primary h-11 px-5 text-sm" @click="guardarPerfil">Guardar</button>
        </div>
      </template>
    </USlideover>

    <!-- Password slideover -->
    <USlideover v-model:open="passAbierto" title="Cambiar contraseña">
      <template #body>
        <div class="flex flex-col gap-4">
          <label class="flex flex-col gap-1"><span class="text-sm text-ink-muted">Contraseña actual</span><input v-model="pw.actual" type="password" class="input-field"></label>
          <label class="flex flex-col gap-1"><span class="text-sm text-ink-muted">Nueva contraseña</span><input v-model="pw.nueva" type="password" class="input-field"></label>
          <p v-if="pwError" class="text-sm text-negative">{{ pwError }}</p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary h-11 px-5 text-sm" @click="passAbierto = false">Cancelar</button>
          <button type="button" class="btn-primary h-11 px-5 text-sm" @click="cambiarPass">Cambiar</button>
        </div>
      </template>
    </USlideover>

    <!-- Preferencias slideover -->
    <USlideover v-model:open="prefAbierto" title="Moneda y tasa">
      <template #body>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <span class="text-sm text-ink-muted">Moneda base de consolidación</span>
            <div class="grid grid-cols-2 gap-2">
              <button type="button" class="h-11 rounded-xl border text-sm font-semibold transition-colors" :class="pref.moneda_base === 'BOB' ? 'border-brand bg-surface-tint text-ink' : 'border-border-strong text-ink-muted hover:bg-surface-hover'" @click="pref.moneda_base = 'BOB'">BOB</button>
              <button type="button" class="h-11 rounded-xl border text-sm font-semibold transition-colors" :class="pref.moneda_base === 'USD' ? 'border-brand bg-surface-tint text-ink' : 'border-border-strong text-ink-muted hover:bg-surface-hover'" @click="pref.moneda_base = 'USD'">USD</button>
            </div>
          </div>
          <label class="flex flex-col gap-1"><span class="text-sm text-ink-muted">Tasa paralelo (BOB por USD)</span><input v-model="pref.tasa" type="text" inputmode="decimal" placeholder="6,96" class="input-field"></label>
          <div v-if="ajustes?.tasa.historial.length">
            <p class="mb-1 text-xs text-ink-muted">Historial</p>
            <ul class="text-xs text-ink-faint">
              <li v-for="(h, i) in ajustes.tasa.historial.slice(0, 5)" :key="i">{{ fechaCorta(h.fecha) }} · {{ h.valor }}</li>
            </ul>
          </div>
          <p v-if="prefError" class="text-sm text-negative">{{ prefError }}</p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary h-11 px-5 text-sm" @click="prefAbierto = false">Cancelar</button>
          <button type="button" class="btn-primary h-11 px-5 text-sm" @click="guardarPref">Guardar</button>
        </div>
      </template>
    </USlideover>

    <!-- Crear API key -->
    <UModal v-model:open="keyAbierta" title="Crear API key">
      <template #body>
        <div class="flex flex-col gap-4">
          <template v-if="!keyCreada">
            <label class="flex flex-col gap-1"><span class="text-sm text-ink-muted">Nombre</span><input v-model="keyNombre" type="text" placeholder="Ej. Asistente personal" class="input-field"></label>
            <p class="text-xs text-ink-faint">La clave se muestra una sola vez. Cópiala y guárdala.</p>
          </template>
          <template v-else>
            <p class="text-sm text-ink-muted">Cópiala ahora, no se volverá a mostrar:</p>
            <code class="block break-all rounded-xl bg-surface-muted p-3 text-xs text-ink">{{ keyCreada }}</code>
          </template>
          <p v-if="keyError" class="text-sm text-negative">{{ keyError }}</p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button v-if="!keyCreada" type="button" class="btn-secondary h-11 px-5 text-sm" @click="keyAbierta = false">Cancelar</button>
          <button v-if="!keyCreada" type="button" class="btn-primary h-11 px-5 text-sm" @click="crearKey">Crear</button>
          <button v-else type="button" class="btn-primary h-11 px-5 text-sm" @click="keyAbierta = false">Listo</button>
        </div>
      </template>
    </UModal>

    <!-- Revocar -->
    <UModal v-model:open="revocarAbierto" title="Revocar API key">
      <template #body><p class="text-sm text-ink-muted">¿Revocar esta API key? El asistente dejará de funcionar con ella.</p></template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary h-11 px-5 text-sm" @click="keyPorRevocar = null">Cancelar</button>
          <button type="button" class="btn-primary h-11 bg-negative px-5 text-sm" @click="revocarKey">Revocar</button>
        </div>
      </template>
    </UModal>

    <!-- Borrar cuenta -->
    <UModal v-model:open="borrarAbierto" title="Borrar cuenta">
      <template #body>
        <div class="flex flex-col gap-3">
          <p class="text-sm text-ink-muted">Esto elimina tu usuario y todos tus datos. Escribe <strong>BORRAR</strong> para confirmar.</p>
          <input v-model="confirmacion" type="text" placeholder="BORRAR" class="input-field">
          <p v-if="borrarError" class="text-sm text-negative">{{ borrarError }}</p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary h-11 px-5 text-sm" @click="borrarAbierto = false">Cancelar</button>
          <button type="button" class="btn-primary h-11 bg-negative px-5 text-sm" :disabled="confirmacion !== 'BORRAR'" @click="borrarCuenta">Borrar cuenta</button>
        </div>
      </template>
    </UModal>
  </section>
</template>
