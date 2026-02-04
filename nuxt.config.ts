export default defineNuxtConfig({
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  modules: [
    '@nuxt/ui',
    '@nuxt/icon',
    '@nuxt/image',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    'nuxt-auth-utils',
  ],


  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    auth0Domain: process.env.NUXT_AUTH0_DOMAIN,
    auth0ClientId: process.env.NUXT_AUTH0_CLIENT_ID,
    auth0ClientSecret: process.env.NUXT_AUTH0_CLIENT_SECRET,
    stripeSecretKey: process.env.NUXT_STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.NUXT_STRIPE_WEBHOOK_SECRET,
    openaiApiKey: process.env.NUXT_OPENAI_API_KEY,
    public: {
      appName: 'Bibanna',
      stripePublishableKey: process.env.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    },
  },

  app: {
    head: {
      title: 'Bibanna - Bibliography & Annotation Management',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Manage your bibliographies, annotations, and research sources with ease.' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },

  experimental: {
    payloadExtraction: true,
  },

  image: {
    quality: 80,
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
  },

  routeRules: {
    '/': { prerender: true },
    '/app/**': { ssr: false },
  },

  nitro: {
    preset: 'node-server',
    experimental: {
      openAPI: true,
    },
  },

  typescript: {
    strict: true,
    typeCheck: true,
  },

  compatibilityDate: '2024-01-29',
})
