import { H3Event, createError, getCookie } from 'h3';
import { useRuntimeConfig } from '#imports';

/**
 * 读取管理员密码配置。
 * 该函数统一负责校验运行时配置，避免各接口重复判断。
 */
export const getAdminPassword = () => {
  const config = useRuntimeConfig();
  if (!config.adminPassword) {
    throw createError({ statusCode: 500, statusMessage: 'ADMIN_PASSWORD 未配置' });
  }
  return config.adminPassword;
};

/**
 * 校验当前请求是否已经登录管理端。
 * 通过比较 auth Cookie 与管理员密码实现最小化鉴权。
 */
export const checkAuth = (event: H3Event) => {
  const authCookie = getCookie(event, 'auth');
  const adminPassword = getAdminPassword();
  if (authCookie !== adminPassword) {
    throw createError({ statusCode: 401, statusMessage: 'No Auth' });
  }
};
