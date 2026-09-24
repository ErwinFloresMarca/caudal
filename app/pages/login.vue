<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { fetch: fetchSession } = useUserSession()
const state = reactive({ email: '', password: '' })
const error = ref('')
const cargando = ref(false)

async function entrar() {
  error.value = ''
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(state.email)) {
    error.value = 'Email no válido'
    return
  }
  cargando.value = true
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { email: state.email, password: state.password } })
    await fetchSession()
    await navigateTo('/')
  } catch (e) {
    error.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'No se pudo iniciar sesión'
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

    <h1 class="mt-6 hs-2">Entrar a Caudal</h1>
    <p class="mt-1 text-sm text-ink-muted">Tu dinero, en orden.</p>

    <div class="mt-6">
      <BotonGoogle />
    </div>

    <div class="my-5 flex items-center gap-3">
      <span class="h-px flex-1 bg-border" />
      <span class="text-xs text-ink-faint">o con tu correo</span>
      <span class="h-px flex-1 bg-border" />
    </div>

    <form class="flex flex-col gap-4" @submit.prevent="entrar">
      <label class="flex flex-col gap-1">
        <span class="text-sm text-ink-muted">Correo electrónico</span>
        <input v-model="state.email" type="email" required autocomplete="email" placeholder="tu@ejemplo.com" class="input-field">
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm text-ink-muted">Contraseña</span>
        <input v-model="state.password" type="password" required autocomplete="current-password" placeholder="••••••••" class="input-field">
      </label>
      <p v-if="error" class="text-sm text-negative">{{ error }}</p>
      <button type="submit" class="btn-primary w-full" :disabled="cargando">
        {{ cargando ? 'Entrando…' : 'Entrar' }}
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-ink-muted">
      ¿No tienes cuenta?
      <NuxtLink to="/registro" class="ol-link">Regístrate</NuxtLink>
    </p>
  </div>
</template>
