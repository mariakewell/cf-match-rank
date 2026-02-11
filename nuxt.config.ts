import { defineNuxtConfig } from 'nuxt/config'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt'
  ],
  compatibilityDate: '2026-02-11',
  nitro: {
    preset: 'cloudflare-pages',
    // Define the D1 database binding for local dev and production
    experimental: {
      database: true
    }
  },
  runtimeConfig: {
    // Private keys (server-side only)
    adminPassword: process.env.ADMIN_PASSWORD,
    // Public keys (client-side)
    public: {
      siteTitle: '🎾 TennisRank Edge'
    }
  },
  // Auto-import components from feature directories for Vertical Slice Architecture
  components: [
    { path: '~/features/ranking/components', prefix: 'Ranking' },
    { path: '~/features/match-manager/components', prefix: 'Match' },
    '~/components'
  ],
  imports: {
    dirs: [
      'features/*/composables',
      'features/*/utils',
      'shared/utils'
    ]
  }
})
