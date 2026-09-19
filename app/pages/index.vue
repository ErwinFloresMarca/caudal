<template>
  <main class="min-h-screen flex items-center justify-center p-6">
    <div class="card w-full max-w-md p-8 text-center">
      <p class="hs-1">Caudal</p>
      <p class="mt-2 text-ink-muted">
        Control de dinero personal y de emprendimientos.
      </p>
      <p class="mt-6 text-3xl font-extrabold tabular-nums tracking-tight">
        Bs <span class="text-brand">0.00</span>
      </p>
      <p class="mt-1 text-sm text-ink-faint">Saldo inicial</p>
      <div class="mt-8 flex justify-center">
        <button type="button" class="btn-primary">
          <span class="iconify i-lucide--plus" />
          Empezar
        </button>
      </div>
      <p class="mt-8 text-xs text-ink-faint">
        Server: {{ health ? health.state : '…' }} · Sesión:
        {{ health ? JSON.stringify(health.session) : '…' }}
      </p>
    </div>
  </main>
</template>

<script setup lang="ts">
const { data: health } = await useFetch('/api/_health')
</script>