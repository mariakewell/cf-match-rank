import { createError, defineEventHandler, readBody } from 'h3';
import { eq } from 'drizzle-orm';
import { matches } from '~/shared/database/schema';
import { checkAuth } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  checkAuth(event);
  const body = await readBody<any>(event);
  if (!body.id) throw createError({ statusCode: 400, statusMessage: 'ID Required' });
  const db = useDb(event);
  await db.delete(matches).where(eq(matches.id, Number(body.id)));
  return { success: true };
});
