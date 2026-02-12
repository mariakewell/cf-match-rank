import { createError, defineEventHandler, getRequestURL, readFormData, sendRedirect, setCookie } from 'h3';
import { getAdminPassword } from '~/server/utils/auth';

/**
 * 管理端登录接口。
 * 密码正确后写入 auth Cookie，并跳转到后台首页。
 */
export default defineEventHandler(async (event) => {
  const formData = await readFormData(event);
  const password = formData.get('password')?.toString() || '';
  const adminPassword = getAdminPassword();

    // 校验通过：写入登录 Cookie 并跳转后台。
  if (password === adminPassword) {
    setCookie(event, 'auth', adminPassword, {
      maxAge: 86400,
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    const referer = getRequestURL(event).pathname.startsWith('/api/') ? '/admin' : '/admin';
    return sendRedirect(event, referer, 302);
  }

  throw createError({ statusCode: 403, statusMessage: '密码错误' });
});
