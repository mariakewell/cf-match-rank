import { defineEventHandler, readBody, setCookie, createError } from 'h3';
import { useRuntimeConfig } from '#imports';

export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event);
  const config = useRuntimeConfig();

  if (body.password === config.adminPassword) {
    setCookie(event, 'auth', config.adminPassword, {
      maxAge: 86400, // 1 day
      path: '/',
      httpOnly: false, // Allow client access for simple checks if needed, or secure it
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    return { success: true };
  }

  throw createError({ statusCode: 403, statusMessage: '密码错误' });
});