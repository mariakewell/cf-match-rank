import { defineEventHandler, readBody, createError } from 'h3';
import { useDb } from '~/server/utils/db';
import { settings, players } from '~/shared/database/schema';
import { checkAuth } from '~/server/utils/auth';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  checkAuth(event);
  const body = await readBody<any>(event);
  const db = useDb(event);

  if (body.type === 'config') {
    const config = {
      title: body.title,
      notice: body.notice,
      background: body.background
    };
    await db.insert(settings).values({ key: 'config', value: JSON.stringify(config) })
      .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(config) } });
  } 
  
  else if (body.type === 'groups') {
      // Add or remove groups
      if (!body.groups || !Array.isArray(body.groups)) throw createError({statusCode: 400});
      
      await db.insert(settings).values({ key: 'groups', value: JSON.stringify(body.groups) })
        .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(body.groups) } });

      // If we are deleting a group, we might want to clean up players? 
      // The Worker code removes the group from player.groups
      if (body.action === 'delete') {
          const groupName = body.groupName;
          const allPlayers = await db.select().from(players).all();
          for (const p of allPlayers) {
              if (p.groups.includes(groupName)) {
                  const newGroups = p.groups.filter(g => g !== groupName);
                  await db.update(players).set({ groups: newGroups }).where(eq(players.id, p.id));
              }
          }
      }
  }

  return { success: true };
});