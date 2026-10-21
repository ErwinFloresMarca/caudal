// Si el servidor invalida la sesión (SPC-047), cualquier 401 devuelve al login
// en vez de dejar la pantalla con datos vacíos.
export default defineNuxtPlugin(() => {
  const { clear } = useUserSession()
  const original = globalThis.$fetch
  globalThis.$fetch = original.create({
    onResponseError({ response }) {
      if (response?.status !== 401) return
      if (location.pathname === '/login' || location.pathname === '/registro') return
      clear().finally(() => navigateTo('/login'))
    },
  })
})
