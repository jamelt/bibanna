import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  srcDir: 'app/',

  devtools: { enabled: process.env.NODE_ENV !== 'production' },

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
    session: {
      maxAge: 60 * 60 * 24 * 7,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
      },
    },
    databaseUrl: process.env.DATABASE_URL,
    adminEmails: process.env.NUXT_ADMIN_EMAILS || '',
    auth0Domain: process.env.NUXT_AUTH0_DOMAIN,
    auth0ClientId: process.env.NUXT_AUTH0_CLIENT_ID,
    auth0ClientSecret: process.env.NUXT_AUTH0_CLIENT_SECRET,
    oauth: {
      auth0: {
        domain: process.env.NUXT_AUTH0_DOMAIN,
        clientId: process.env.NUXT_AUTH0_CLIENT_ID,
        clientSecret: process.env.NUXT_AUTH0_CLIENT_SECRET,
      },
    },
    stripeSecretKey: process.env.NUXT_STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.NUXT_STRIPE_WEBHOOK_SECRET,
    openaiApiKey: process.env.NUXT_OPENAI_API_KEY,
    googleBooksApiKey: process.env.NUXT_GOOGLE_BOOKS_API_KEY,
    public: {
      appName: 'AnnoBib',
      stripePublishableKey: process.env.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    },
  },

  app: {
    head: {
      title: 'AnnoBib - Bibliography & Annotation Management',
      meta: [
        { charset: 'utf-8' },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, maximum-scale=1',
        },
        {
          name: 'description',
          content: 'Manage your bibliographies, annotations, and research sources with ease.',
        },
        { name: 'theme-color', content: '#4F46E5' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        {
          name: 'apple-mobile-web-app-status-bar-style',
          content: 'default',
        },
        { name: 'apple-mobile-web-app-title', content: 'AnnoBib' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/icons/icon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/icons/icon-16x16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.json' },
      ],
    },
  },

  experimental: {
    payloadExtraction: true,
  },

  image: {
    provider: 'ipx',
    quality: 80,
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
    sharp: {},
  },

  routeRules: {
    '/app/**': { ssr: false },
  },

  nitro: {
    preset: 'node-server',
    alias: {
      '~/server': resolve(rootDir, 'server'),
    },
    experimental: {
      openAPI: true,
    },
    externals: {
      inline: ['pdf-parse', 'mammoth', 'citeproc'],
    },
    esbuild: {
      options: {
        target: 'esnext',
        logOverride: {
          'this-is-undefined-in-esm': 'silent',
        },
      },
    },
    rollupConfig: {
      external: (id: string) => {
        if (id.startsWith('@opentelemetry/') || id.startsWith('@google-cloud/opentelemetry-')) {
          return true
        }
        if (id === 'pino' || id.startsWith('pino/') || id === 'pino-pretty') {
          return true
        }
        return false
      },
      onwarn(warning, warn) {
        if (warning.code === 'THIS_IS_UNDEFINED' && warning.id?.includes('@opentelemetry')) {
          return
        }
        if (
          warning.code === 'CIRCULAR_DEPENDENCY' &&
          (warning.message?.includes('node_modules') ||
            warning.id?.includes('node_modules') ||
            warning.ids?.some((id: string) => id.includes('node_modules')))
        ) {
          return
        }
        warn(warning)
      },
    },
  },

  vite: {
    optimizeDeps: {
      include: [
        'pdf-parse',
        'mammoth',
        'citeproc',
        '@nuxt/ui > prosemirror-state',
        '@nuxt/ui > prosemirror-transform',
        '@nuxt/ui > prosemirror-model',
        '@nuxt/ui > prosemirror-view',
        '@nuxt/ui > prosemirror-gapcursor',
      ],
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/d3')) return 'vendor-d3'
            if (id.includes('node_modules/openai')) return 'vendor-openai'
            if (id.includes('node_modules/langchain') || id.includes('node_modules/@langchain'))
              return 'vendor-langchain'
            if (id.includes('node_modules/stripe')) return 'vendor-stripe'
            if (id.includes('node_modules/prosemirror')) return 'vendor-prosemirror'
          },
        },
        onwarn(warning, warn) {
          if (warning.code === 'THIS_IS_UNDEFINED' && warning.id?.includes('@opentelemetry')) {
            return
          }
          if (
            warning.code === 'CIRCULAR_DEPENDENCY' &&
            (warning.message?.includes('node_modules') ||
              warning.id?.includes('node_modules') ||
              warning.ids?.some((id: string) => id.includes('node_modules')))
          ) {
            return
          }
          warn(warning)
        },
      },
    },
  },

  typescript: {
    strict: true,
    typeCheck: process.env.NUXT_TYPECHECK === 'true',
  },

  compatibilityDate: '2024-01-29',
})
