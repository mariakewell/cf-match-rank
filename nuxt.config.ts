// 中文注释说明：该配置文件用于项目构建/数据库生成流程。
import { defineNuxtConfig } from 'nuxt/config'

// 框架配置说明见官方文档。
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt'
  ],
  compatibilityDate: '2026-02-11',
  nitro: {
    preset: 'cloudflare-pages',
    // 配置 D1 数据库绑定，供本地与生产环境使用
    experimental: {
      database: true
    }
  },
  runtimeConfig: {
    // 私有配置（仅服务端可见）
    adminPassword: process.env.ADMIN_PASSWORD,
    // 公共配置（前端可读取）
    public: {
      siteTitle: '🎾 TennisRank Edge'
    }
  },
  // 按功能目录自动导入组件（贴合 Vertical Slice 架构）
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
