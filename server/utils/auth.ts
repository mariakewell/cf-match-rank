import { H3Event, createError, getCookie } from 'h3';
import { useRuntimeConfig } from '#imports';

export const getAdminPassword = () => {
  const config = useRuntimeConfig();
  if (!config.adminPassword) {
    throw createError({ statusCode: 500, statusMessage: 'ADMIN_PASSWORD 未配置' });
  }
  return config.adminPassword;
};

export const checkAuth = (event: H3Event) => {
  const authCookie = getCookie(event, 'auth');
  const adminPassword = getAdminPassword();
  if (authCookie !== adminPassword) {
    throw createError({ statusCode: 401, statusMessage: 'No Auth' });
  }
};
