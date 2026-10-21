import { findOrCreateOAuthUser } from '../../utils/users'

const config = useRuntimeConfig()

// Login con Google (SPC-023). Ruta pública: no exige sesión previa.
// Solo se persiste identidad (provider_id, email, name, avatar); nunca tokens.
export default defineOAuthGoogleEventHandler({
  config: {
    clientId: config.oauth.google.id,
    clientSecret: config.oauth.google.secret,
  },
  async onSuccess(event, { user: googleUser }) {
    const user = await findOrCreateOAuthUser({
      provider: 'google',
      providerId: googleUser.sub,
      email: googleUser.email,
      name: googleUser.name,
      avatarUrl: googleUser.picture,
    })

    await setUserSession(event, {
      user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url, session_version: user.session_version },
    })

    return sendRedirect(event, '/')
  },
  async onError(event, error) {
    // No loggear tokens/códigos: solo el mensaje.
    console.error('Google OAuth error:', error?.message ?? 'error desconocido')
    return sendRedirect(event, '/auth/error?provider=google')
  },
})
