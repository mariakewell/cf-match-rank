import { createError, defineEventHandler, readBody } from 'h3';
import { eq } from 'drizzle-orm';
import { players } from '~/shared/database/schema';
import { checkAuth } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  checkAuth(event);
  const body = await readBody<any>(event);
  const db = useDb(event);

  const name = body.name?.trim();
  if (!name) throw createError({ statusCode: 400, statusMessage: '姓名不能为空' });
  if (!body.groups || body.groups.length === 0) throw createError({ statusCode: 400, statusMessage: '请至少选择一个组别' });

  const allPlayers = await db.select().from(players).all();
  const existing = allPlayers.find((p) => p.name.toLowerCase() === name.toLowerCase() && (!body.id || p.id !== Number(body.id)));
  if (existing) {
    throw createError({ statusCode: 400, statusMessage: '球员姓名已存在，请使用其他姓名' });
  }

  if (body.id) {
    await db.update(players).set({ name, groups: body.groups }).where(eq(players.id, Number(body.id)));
  } else {
    await db.insert(players).values({ name, groups: body.groups, createdAt: new Date() });
  }

  return { success: true };
});
