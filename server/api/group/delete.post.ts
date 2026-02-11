import { defineEventHandler, readFormData } from 'h3';
import { sql } from 'drizzle-orm';
import { players, settings } from '~/shared/database/schema';
import { checkAuth } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { loadState } from '~/server/utils/state';

export default defineEventHandler(async (event) => {
  checkAuth(event);
  const formData = await readFormData(event);
  const name = formData.get('name')?.toString() || '';

  const db = useDb(event);
  const state = await loadState(event);
  const groups = state.groups.filter((group) => group !== name);

  await db
    .insert(settings)
    .values({ key: 'groups', value: JSON.stringify(groups) })
    .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(groups) } });

  const allPlayers = await db.select().from(players).all();
  for (const player of allPlayers) {
    if (player.groups.includes(name)) {
      await db.update(players).set({ groups: player.groups.filter((group) => group !== name) }).where(sql`${players.id} = ${player.id}`);
    }
  }

  return '删除成功';
});
