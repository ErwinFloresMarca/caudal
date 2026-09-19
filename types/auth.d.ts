import 'nuxt-auth-utils'

declare module 'nuxt-auth-utils' {
  interface User {
    id: number
    email: string
    name: string
  }
}