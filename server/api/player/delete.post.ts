import { createError, defineEventHandler, readFormData } from 'h3';
import { sql } from 'drizzle-orm';
import { matches, players } from '~/shared/database/schema';
import { checkAuth } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  checkAuth(event);
  const formData = await readFormData(event);
  const id = Number(formData.get('id'));
  if (Number.isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'ID Required' });

  const db = useDb(event);
  await db.delete(players).where(sql`${players.id} = ${id}`);
  await db.delete(matches).where(sql`${matches.p1Id} = ${id} OR ${matches.p2Id} = ${id}`);
  return '删除成功';
});
