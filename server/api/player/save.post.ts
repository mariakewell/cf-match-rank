import { createError, defineEventHandler, readFormData } from 'h3';
import { and, sql } from 'drizzle-orm';
import { players } from '~/shared/database/schema';
import { checkAuth } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  checkAuth(event);
  const formData = await readFormData(event);
  const db = useDb(event);

  const idValue = formData.get('id')?.toString() || '';
  const id = idValue ? Number(idValue) : null;
  const name = formData.get('name')?.toString().trim() || '';
  const groups = formData.getAll('groups').map((group) => group.toString());

  if (!name) throw createError({ statusCode: 400, statusMessage: '姓名不能为空' });
  if (groups.length === 0) throw createError({ statusCode: 400, statusMessage: '请至少选择一个组别' });

  const allPlayers = await db.select().from(players).all();
  const existingPlayer = allPlayers.find((p) => p.name.toLowerCase() === name.toLowerCase() && (!id || p.id !== id));
  if (existingPlayer) {
    throw createError({ statusCode: 400, statusMessage: '球员姓名已存在，请使用其他姓名' });
  }

  if (id) {
    await db.update(players).set({ name, groups }).where(sql`${players.id} = ${id}`);
  } else {
    await db.insert(players).values({ name, groups, createdAt: new Date() });
  }

  return '保存成功';
});
