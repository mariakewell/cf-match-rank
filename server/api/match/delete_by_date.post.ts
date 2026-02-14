import { createError, defineEventHandler, readFormData } from 'h3';
import { inArray, sql } from 'drizzle-orm';
import { matches } from '~/shared/database/schema';
import { checkAuth } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';

/**
 * 按筛选条件批量删除比赛记录。
 */
export default defineEventHandler(async (event) => {
  checkAuth(event);
  const formData = await readFormData(event);
  const idsRaw = formData.get('ids')?.toString();
  const date = formData.get('date')?.toString();

  const db = useDb(event);

  if (idsRaw) {
    let parsedIds: unknown;
    try {
      parsedIds = JSON.parse(idsRaw);
    } catch {
      throw createError({ statusCode: 400, statusMessage: '删除参数格式错误' });
    }

    if (!Array.isArray(parsedIds)) {
      throw createError({ statusCode: 400, statusMessage: '删除参数格式错误' });
    }

    const ids = parsedIds
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (!ids.length) {
      throw createError({ statusCode: 400, statusMessage: '没有可删除的比赛' });
    }

    await db.delete(matches).where(inArray(matches.id, ids));
    return '批量删除成功';
  }

  if (!date) throw createError({ statusCode: 400, statusMessage: '请选择日期' });
  await db.delete(matches).where(sql`${matches.date} = ${date}`);
  return '批量删除成功';
});
