import { useDb } from '~/server/utils/db';
import { players, matches } from '~/shared/database/schema';
import { desc } from 'drizzle-orm';
import { defineCachedEventHandler } from '#imports';

/**
 * FEATURE: Ranking
 * Strategy: SWR (Stale-While-Revalidate)
 * This ensures the user gets an instant response (cached), while the background worker
 * updates the cache for the next user.
 */
export default defineCachedEventHandler(async (event) => {
  const db = useDb(event);

  // Parallel Fetching for minimal latency
  const [allPlayers, allMatches] = await Promise.all([
    db.select().from(players).all(),
    db.select().from(matches).orderBy(desc(matches.date)).all()
  ]);

  // Business Logic: Calculate Standings (Moved to server for performance/caching)
  // This mimics the original 'calculateStandings' but runs on the Edge
  const groupsRaw = new Set<string>();
  allPlayers.forEach(p => p.groups.forEach(g => groupsRaw.add(g)));
  const groups = Array.from(groupsRaw);

  const standings: Record<string, any[]> = {};
  
  groups.forEach(g => {
    standings[g] = [];
    
    // Filter players in this group
    const groupPlayers = allPlayers.filter(p => p.groups.includes(g));
    
    groupPlayers.forEach(p => {
      const stats = {
        id: p.id,
        name: p.name,
        score: 0,
        matches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        diff: 0
      };
      
      // Calculate stats based on matches in this group
      allMatches.filter(m => m.group === g).forEach(m => {
        if (m.p1Id === p.id || m.p2Id === p.id) {
          stats.matches++;
          const isP1 = m.p1Id === p.id;
          const myScore = isP1 ? m.s1 : m.s2;
          const opScore = isP1 ? m.s2 : m.s1;
          
          stats.score += myScore; // Accumulate raw score points
          stats.diff += (myScore - opScore);
          
          if (myScore > opScore) stats.wins++;
          else if (myScore < opScore) stats.losses++;
          else stats.draws++;
        }
      });
      
      standings[g].push(stats);
    });

    // Sort: Score desc, then Wins desc
    standings[g].sort((a, b) => b.score - a.score || b.wins - a.wins);
  });

  return {
    updatedAt: new Date().toISOString(),
    standings,
    groups
  };
}, {
  swr: true,
  maxAge: 10, // Revalidate every 10 seconds if requested
  name: 'ranking-data'
});