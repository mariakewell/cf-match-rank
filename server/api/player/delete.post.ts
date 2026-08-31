import { createError, defineEventHandler, readFormData } from 'h3';
import { sql } from 'drizzle-orm';
import { matches, players } from '~/shared/database/schema';
import { checkAuth } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';

/**
 * 删除球员并清理其相关比赛。
 */
export default defineEventHandler(async (event) => {
  checkAuth(event);
  const formData = await readFormData(event);
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, statusMessage: 'ID Required' });

  const db = useDb(event);
  // matches.p1_id / matches.p2_id 均引用 players.id，必须先清理比赛记录，
  // 否则 SQLite 的外键约束会阻止删除球员并返回 500。
  await db.delete(matches).where(sql`${matches.p1Id} = ${id} OR ${matches.p2Id} = ${id}`);
  await db.delete(players).where(sql`${players.id} = ${id}`);
  return '删除成功';
});
