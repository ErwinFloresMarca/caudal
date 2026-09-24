// Sin sesión → /login; con sesión, /login redirige a la app. /auth/error es pública.
export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()
  const publica = to.path === '/login' || to.path === '/registro' || to.path.startsWith('/auth/')
  if (!loggedIn.value && !publica) return navigateTo('/login')
  if (loggedIn.value && to.path === '/login') return navigateTo('/')
})
