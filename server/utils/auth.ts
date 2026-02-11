import { H3Event, getCookie, createError } from 'h3';
import { useRuntimeConfig } from '#imports';

export const checkAuth = (event: H3Event) => {
  const config = useRuntimeConfig();
  const authCookie = getCookie(event, 'auth');
  
  if (authCookie !== config.adminPassword) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }
};