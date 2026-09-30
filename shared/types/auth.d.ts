declare module '#auth-utils' {
  interface User {
    id: number
    email: string
    name: string
    avatar_url?: string | null
  }

  interface UserSession {
    fondo_activo_id?: number
  }
}

export {}
