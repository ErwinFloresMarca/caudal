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
    preference: 'system',
    fallback: 'light',
  },

  runtimeConfig: {
    sessionPassword: '',
    databaseUrl: '',
    oauth: {
      google: {
        id: '',
        secret: '',
      },
    },
  },

  devServer: {
    port: process.env.PORT ? Number(process.env.PORT) : 3071,
  },

  pwa: {
    registerType: 'prompt',
    devOptions: { enabled: false },
    manifest: {
      name: 'Caudal',
      short_name: 'Caudal',
      description: 'Control de dinero personal y de emprendimientos',
      lang: 'es',
      theme_color: '#0E6FFF',
      background_color: '#F6F8FC',
      display: 'standalone',
      icons: [
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 3600,
    },
    workbox: {
      // @vite-pwa/nuxt reescribe `.html`→sin extensión en el precache (URLs limpias);
      // en SSR el archivo estático solo se sirve como `/offline.html`, lo dejamos tal cual.
      manifestTransforms: [
        (entries: { url: string; revision: string | null; size: number }[]) => ({ manifest: entries, warnings: [] as string[] }),
      ],
      globPatterns: ['**/*.{js,css,html,png,svg,ico,webp,woff2}'],
      // SSR: no se sirve un shell estático en cada navegación (eso es para SPAs).
      navigateFallback: undefined,
      // Navegaciones: red primero; si falla (offline), se muestra /offline.html.
      // Nunca se cachea HTML SSR (aislamiento entre usuarios).
      runtimeCaching: [
        {
          urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'caudal-navegaciones',
            networkTimeoutSeconds: 4,
            precacheFallback: { fallbackURL: '/offline.html' },
            // No cachear HTML SSR (aislamiento entre usuarios).
            plugins: [{ cacheWillUpdate: async () => null }],
          },
        },
        {
          urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/api/'),
          handler: 'NetworkOnly',
        },
      ],
    },
  },

  app: {
    head: {
      title: 'Caudal',
      htmlAttrs: { lang: 'es' },
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
        },
      ],
      meta: [
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'Caudal' },
      ],
    },
  },
})