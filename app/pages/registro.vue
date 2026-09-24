<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { fetch: fetchSession } = useUserSession()
const state = reactive({ name: '', email: '', password: '', moneda_base: 'BOB' as 'BOB' | 'USD', terms: false })
const error = ref('')
const cargando = ref(false)

const fortaleza = computed(() => {
  const p = state.password
  let s = 0
  if (p.length >= 8) s++
  if (/[A-Z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  if (!p) return { label: '—', color: 'text-ink-faint' }
  if (s >= 3) return { label: 'Fuerte', color: 'text-positive' }
  if (s === 2) return { label: 'Media', color: 'text-warning' }
  return { label: 'Débil', color: 'text-negative' }
})

async function crear() {
  error.value = ''
  if (!state.name.trim()) {
    error.value = 'El nombre es obligatorio'
    return
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(state.email)) {
    error.value = 'Email no válido'
    return
  }
  if (state.password.length < 8) {
    error.value = 'La contraseña debe tener al menos 8 caracteres'
    return
  }
  if (!state.terms) {
    error.value = 'Debes aceptar los términos y la política de privacidad'
    return
  }
  cargando.value = true
  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: { name: state.name, email: state.email, password: state.password, moneda_base: state.moneda_base },
    })
    await fetchSession()
    await navigateTo('/')
  } catch (e) {
    error.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'No se pudo crear la cuenta'
  } finally {
    cargando.value = false
  }
}
</script>

<template>
  <div class="card p-8">
    <div class="flex items-center gap-2">
      <span class="grid h-9 w-9 place-items-center rounded-full bg-brand text-white">
        <UIcon name="i-material-symbols-water-drop" class="size-5" />
      </span>
      <span class="text-xl font-extrabold tracking-tight text-ink">Caudal</span>
    </div>

    <h1 class="mt-6 hs-2">Crear cuenta en Caudal</h1>
    <p class="mt-1 text-sm text-ink-muted">Empieza a ordenar tu dinero en minutos.</p>

    <div class="mt-6">
      <BotonGoogle>Registrarse con Google</BotonGoogle>
    </div>

    <div class="my-5 flex items-center gap-3">
      <span class="h-px flex-1 bg-border" />
      <span class="text-xs text-ink-faint">o con tu correo</span>
      <span class="h-px flex-1 bg-border" />
    </div>

    <form class="flex flex-col gap-4" @submit.prevent="crear">
      <label class="flex flex-col gap-1">
        <span class="text-sm text-ink-muted">Nombre completo</span>
        <input v-model="state.name" type="text" required autocomplete="name" placeholder="Carlos Mendoza" class="input-field">
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm text-ink-muted">Correo electrónico</span>
        <input v-model="state.email" type="email" required autocomplete="email" placeholder="carlos@ejemplo.com" class="input-field">
      </label>
      <label class="flex flex-col gap-1">
        <span class="flex items-center justify-between">
          <span class="text-sm text-ink-muted">Contraseña</span>
          <span class="text-xs" :class="fortaleza.color">Seguridad: {{ fortaleza.label }}</span>
        </span>
        <input v-model="state.password" type="password" required autocomplete="new-password" placeholder="••••••••" class="input-field">
      </label>

      <fieldset class="flex flex-col gap-2">
        <legend class="text-sm text-ink-muted">Moneda principal de trabajo</legend>
        <div class="grid grid-cols-2 gap-2">
          <label
            v-for="m in [{ v: 'BOB', t: 'Bolivianos' }, { v: 'USD', t: 'Dólar' }]"
            :key="m.v"
            class="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors"
            :class="state.moneda_base === m.v ? 'border-brand bg-surface-tint text-ink' : 'border-border-strong text-ink-muted hover:bg-surface-hover'"
          >
            <input v-model="state.moneda_base" type="radio" :value="m.v" class="sr-only">
            <span class="font-semibold">{{ m.v }}</span>
            <span class="text-xs">{{ m.t }}</span>
          </label>
        </div>
      </fieldset>

      <label class="flex items-start gap-2 text-sm text-ink-muted">
        <input v-model="state.terms" type="checkbox" class="mt-0.5">
        <span>Acepto los <a href="#" class="ol-link">términos</a> y la <a href="#" class="ol-link">política de privacidad</a>.</span>
      </label>

      <p v-if="error" class="text-sm text-negative">{{ error }}</p>
      <button type="submit" class="btn-primary w-full" :disabled="cargando">
        {{ cargando ? 'Creando…' : 'Crear cuenta' }}
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-ink-muted">
      ¿Ya tienes cuenta?
      <NuxtLink to="/login" class="ol-link">Inicia sesión</NuxtLink>
    </p>
  </div>
</template>
