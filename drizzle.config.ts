// 中文注释说明：该配置文件用于项目构建/数据库生成流程。
import type { Config } from 'drizzle-kit';

export default {
  schema: './shared/database/schema.ts',
  out: './drizzle',
  driver: 'd1-http',
  dialect: 'sqlite',
} satisfies Config;