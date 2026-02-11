import { defineEventHandler, readBody, createError } from 'h3';
import { useDb } from '~/server/utils/db';
import { players, matches } from '~/shared/database/schema';
import { checkAuth } from '~/server/utils/auth';
import { eq, and, ne } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  checkAuth(event);
  const body = await readBody<any>(event);
  const db = useDb(event);

  if (!body.name) throw createError({ statusCode: 400, statusMessage: "姓名不能为空" });
  if (!body.groups || body.groups.length === 0) throw createError({ statusCode: 400, statusMessage: "请至少选择一个组别" });

  // Check duplicate name
  const existing = await db.select().from(players).where(eq(players.name, body.name)).get();
  if (existing && (!body.id || existing.id !== body.id)) {
    throw createError({ statusCode: 400, statusMessage: "球员姓名已存在" });
  }

  if (body.id) {
    await db.update(players).set({
      name: body.name,
      groups: body.groups
    }).where(eq(players.id, body.id));
  } else {
    await db.insert(players).values({
      name: body.name,
      groups: body.groups,
      createdAt: new Date()
    });
  }

  return { success: true };
});