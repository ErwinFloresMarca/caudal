<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { fetch: fetchSession } = useUserSession()
const state = reactive({ email: '', password: '' })
const error = ref('')
const cargando = ref(false)

async function entrar() {
  error.value = ''
  cargando.value = true
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { email: state.email, password: state.password } })
    await fetchSession()
    await navigateTo('/')
  } catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    error.value = err?.data?.statusMessage ?? 'No se pudo iniciar sesión'
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

    <h1 class="mt-6 hs-2">Entra a tu cuenta</h1>

    <form class="mt-6 flex flex-col gap-4" @submit.prevent="entrar">
      <label class="flex flex-col gap-1">
        <span class="text-sm text-ink-muted">Email</span>
        <input v-model="state.email" type="email" required autocomplete="email" class="input-field">
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm text-ink-muted">Contraseña</span>
        <input v-model="state.password" type="password" required autocomplete="current-password" class="input-field">
      </label>
      <p v-if="error" class="text-sm text-negative">{{ error }}</p>
      <button type="submit" class="btn-primary w-full" :disabled="cargando">
        {{ cargando ? 'Entrando…' : 'Entrar' }}
      </button>
    </form>

    <div class="my-5 flex items-center gap-3">
      <span class="h-px flex-1 bg-border" />
      <span class="text-xs text-ink-faint">o</span>
      <span class="h-px flex-1 bg-border" />
    </div>

    <a
      href="/auth/google"
      class="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-border-strong bg-surface text-sm font-medium text-ink transition-colors hover:bg-surface-muted"
    >
      <svg class="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" fill="#4285F4" />
        <path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z" fill="#34A853" />
        <path d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.97 0 12s.45 3.84 1.24 5.42l4.04-3.15z" fill="#FBBC05" />
        <path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z" fill="#EA4335" />
      </svg>
      <span>Continuar con Google</span>
    </a>
  </div>
</template>
