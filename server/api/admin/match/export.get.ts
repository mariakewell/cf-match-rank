import { defineEventHandler, setHeaders } from 'h3';
import { useDb } from '~/server/utils/db';
import { matches, players } from '~/shared/database/schema';
import { desc } from 'drizzle-orm';
import { checkAuth } from '~/server/utils/auth';

export default defineEventHandler(async (event) => {
  checkAuth(event);
  const db = useDb(event);

  const [allMatches, allPlayers] = await Promise.all([
    db.select().from(matches).orderBy(desc(matches.date), desc(matches.id)).all(),
    db.select().from(players).all()
  ]);

  const playerMap = new Map(allPlayers.map(p => [p.id, p.name]));

  let csvContent = '\uFEFF时间,选手1,比分,选手2,胜方\n';

  allMatches.forEach(m => {
    const p1 = playerMap.get(m.p1Id) || '未知';
    const p2 = playerMap.get(m.p2Id) || '未知';
    
    let winner = '平局';
    if (m.s1 > m.s2) winner = p1;
    else if (m.s2 > m.s1) winner = p2;

    const scoreStr = `="${m.s1}:${m.s2}"`; // Excel formatted string
    csvContent += `${m.date},${p1},${scoreStr},${p2},${winner}\n`;
  });

  setHeaders(event, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="matches_export_${new Date().toISOString().split('T')[0]}.csv"`
  });

  return csvContent;
});