import { createError, defineEventHandler, readBody } from 'h3';
import { eq } from 'drizzle-orm';
import { matches } from '~/shared/database/schema';
import { checkAuth } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  checkAuth(event);
  const body = await readBody<any>(event);
  if (!body.date) throw createError({ statusCode: 400, statusMessage: 'Date Required' });
  const db = useDb(event);
  await db.delete(matches).where(eq(matches.date, body.date));
  return { success: true };
});
