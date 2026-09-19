// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-06-30',
  ssr: true,
  devtools: { enabled: false },

  modules: ['@nuxt/ui', 'nuxt-auth-utils', '@nuxt/eslint', '@vite-pwa/nuxt'],

  css: ['~/assets/css/main.css'],

  typescript: {
    strict: true,
  },

  colorMode: {
    preference: 'light',
    fallback: 'light',
  },

  runtimeConfig: {
    sessionPassword: '',
    databaseUrl: '',
  },

  devServer: {
    port: process.env.PORT ? Number(process.env.PORT) : 3071,
  },

  pwa: {
    registerType: 'autoUpdate',
    devOptions: { enabled: false },
    manifest: {
      name: 'Caudal',
      short_name: 'Caudal',
      description: 'Control de dinero personal y de emprendimientos',
      lang: 'es',
      theme_color: '#0E6FFF',
      background_color: '#F6F8FC',
      display: 'standalone',
    },
  },

  app: {
    head: {
      title: 'Caudal',
      htmlAttrs: { lang: 'es' },
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
        },
      ],
    },
  },
})