import { defineEventHandler } from 'h3';
import { useDb } from '~/server/utils/db';
import { players, matches, settings } from '~/shared/database/schema';
import { desc, eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDb(event);

  // Parallel Fetching
  const [allPlayers, allMatches, allSettings] = await Promise.all([
    db.select().from(players).all(),
    db.select().from(matches).orderBy(desc(matches.date), desc(matches.id)).all(),
    db.select().from(settings).all()
  ]);

  // Parse Settings
  const config = {
    title: "🎾 快乐网球积分赛",
    notice: "友谊第一，比赛第二！加油！",
    background: ""
  };
  let groups: string[] = ["U8 红球组", "U10 橙球组"];

  allSettings.forEach(s => {
    if (s.key === 'config') {
      try { Object.assign(config, JSON.parse(s.value)); } catch {}
    }
    if (s.key === 'groups') {
      try { groups = JSON.parse(s.value); } catch {}
    }
  });

  return {
    settings: config,
    groups,
    players: allPlayers,
    matches: allMatches,
    updatedAt: new Date().toISOString()
  };
});