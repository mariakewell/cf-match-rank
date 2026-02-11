import { createError, defineEventHandler, readFormData } from 'h3';
import { sql } from 'drizzle-orm';
import { matches } from '~/shared/database/schema';
import { checkAuth } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  checkAuth(event);
  const formData = await readFormData(event);
  const id = Number(formData.get('id'));
  if (Number.isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'ID Required' });

  const db = useDb(event);
  await db.delete(matches).where(sql`${matches.id} = ${id}`);
  return '删除成功';
});
