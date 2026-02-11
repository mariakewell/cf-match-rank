import { createError, defineEventHandler, readBody } from 'h3';
import { eq } from 'drizzle-orm';
import { matches } from '~/shared/database/schema';
import { checkAuth } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  checkAuth(event);
  const body = await readBody<any>(event);
  const db = useDb(event);

  if (!body.group) throw createError({ statusCode: 400, statusMessage: '请选择组别' });
  if (!body.p1Id || !body.p2Id) throw createError({ statusCode: 400, statusMessage: '请选择两位选手' });
  if (body.p1Id === body.p2Id) throw createError({ statusCode: 400, statusMessage: '不能选同一个人' });

  const matchData = {
    date: body.date || new Date().toISOString().split('T')[0],
    group: body.group,
    p1Id: Number(body.p1Id),
    p2Id: Number(body.p2Id),
    s1: Number(body.s1 || 0),
    s2: Number(body.s2 || 0),
  };

  if (body.id) {
    await db.update(matches).set(matchData).where(eq(matches.id, Number(body.id)));
  } else {
    await db.insert(matches).values({ ...matchData, createdAt: new Date() });
  }

  return { success: true };
});
