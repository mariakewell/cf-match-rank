import { drizzle } from 'drizzle-orm/d1';
import * as schema from '~/shared/database/schema';

/**
 * 从请求上下文中提取 Cloudflare D1 绑定并返回 Drizzle 实例。
 * 这是所有服务端接口访问数据库的统一入口。
 */
export const useDb = (event: any) => {
  // 生产环境下由 Cloudflare Pages 注入 DB 绑定；本地开发通常由 wrangler dev 提供。
  const dbBinding = event.context.cloudflare?.env?.DB;
  
    // 未找到绑定时直接抛错，提示检查 Wrangler/Cloudflare 配置。
  if (!dbBinding) {
    throw new Error('Database binding (DB) not found. Ensure Wrangler is configured.');
  }
  
  return drizzle(dbBinding, { schema });
};
