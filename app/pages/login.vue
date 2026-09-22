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
  </div>
</template>
