// La cookie puede seguir existiendo aunque el servidor la haya invalidado
// ("cerrar todas las sesiones", SPC-047). Se valida contra el servidor.
export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn, clear } = useUserSession()
  const publica = to.path === '/login' || to.path === '/registro' || to.path.startsWith('/auth/')
  if (!loggedIn.value && !publica) return navigateTo('/login')
  if (loggedIn.value && to.path === '/login') return navigateTo('/')
  if (!loggedIn.value || publica) return

  try {
    await useRequestFetch()('/api/auth/me')
  } catch {
    await clear()
    return navigateTo('/login')
  }
})
