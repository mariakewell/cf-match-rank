import { createError, defineEventHandler, readFormData } from 'h3';
import { sql } from 'drizzle-orm';
import { matches } from '~/shared/database/schema';
import { checkAuth } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';

/**
 * 按日期批量删除比赛记录。
 */
export default defineEventHandler(async (event) => {
  checkAuth(event);
  const formData = await readFormData(event);
  const date = formData.get('date')?.toString();
  if (!date) throw createError({ statusCode: 400, statusMessage: '请选择日期' });

  const db = useDb(event);
  await db.delete(matches).where(sql`${matches.date} = ${date}`);
  return '批量删除成功';
});
