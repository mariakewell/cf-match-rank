import { createError, defineEventHandler, readBody } from 'h3';
import { eq, or } from 'drizzle-orm';
import { matches, players } from '~/shared/database/schema';
import { checkAuth } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  checkAuth(event);
  const body = await readBody<any>(event);
  const pId = Number(body.id);
  if (!pId) throw createError({ statusCode: 400, statusMessage: 'ID Required' });

  const db = useDb(event);
  await db.delete(matches).where(or(eq(matches.p1Id, pId), eq(matches.p2Id, pId)));
  await db.delete(players).where(eq(players.id, pId));

  return { success: true };
});
