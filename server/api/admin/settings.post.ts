import { createError, defineEventHandler, readBody } from 'h3';
import { eq } from 'drizzle-orm';
import { players, settings } from '~/shared/database/schema';
import { checkAuth } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { loadState } from '~/server/utils/state';

export default defineEventHandler(async (event) => {
  checkAuth(event);
  const body = await readBody<any>(event);
  const db = useDb(event);

  if (body.type === 'config') {
    const state = await loadState(event);
    const config = {
      title: body.title?.trim() || state.settings.title,
      notice: body.notice?.trim() || state.settings.notice,
      background: body.background?.trim() || state.settings.background,
    };
    await db.insert(settings).values({ key: 'config', value: JSON.stringify(config) })
      .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(config) } });
    return { success: true };
  }

  if (body.type === 'groups') {
    if (!body.groups || !Array.isArray(body.groups)) throw createError({ statusCode: 400 });
    await db.insert(settings).values({ key: 'groups', value: JSON.stringify(body.groups) })
      .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(body.groups) } });

    if (body.action === 'delete') {
      const groupName = body.groupName;
      const allPlayers = await db.select().from(players).all();
      for (const p of allPlayers) {
        if (p.groups.includes(groupName)) {
          await db.update(players).set({ groups: p.groups.filter((g) => g !== groupName) }).where(eq(players.id, p.id));
        }
      }
    }
    return { success: true };
  }

  return { success: true };
});
