import { defineEventHandler, readBody, createError } from 'h3';
import { useDb } from '~/server/utils/db';
import { matches } from '~/shared/database/schema';
import { checkAuth } from '~/server/utils/auth';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  checkAuth(event);
  const body = await readBody<any>(event);
  const db = useDb(event);

  if (!body.date) throw createError({ statusCode: 400, statusMessage: "Date Required" });

  await db.delete(matches).where(eq(matches.date, body.date));
  return { success: true };
});