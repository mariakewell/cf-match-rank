import { sql } from 'drizzle-orm';
import { matches, players, settings } from '~/shared/database/schema';
import { useDb } from '~/server/utils/db';

/**
 * 系统默认数据。
 * 当数据库为空时会自动初始化为该内容。
 */
export const DEFAULT_DATA = {
  settings: {
    title: '🎾 快乐网球积分赛',
    notice: '友谊第一，比赛第二！加油！',
    background: '',
  },
  groups: ['U8 红球组', 'U10 橙球组'],
  players: [
    { id: 1, name: '喜羊羊', groups: ['U10 橙球组'] },
    { id: 2, name: '美羊羊', groups: ['U10 橙球组'] },
    { id: 3, name: '沸羊羊', groups: ['U8 红球组'] },
  ],
  matches: [] as Array<{ id: number; date: string; group: string; p1_id: number; p2_id: number; s1: number; s2: number }>,
};

export type AppDbState = typeof DEFAULT_DATA;

/**
 * 读取数据库并拼装前端所需的应用状态结构。
 */
export async function loadState(event: any): Promise<AppDbState> {
  const db = useDb(event);

  const [allPlayers, allMatches, allSettings] = await Promise.all([
    db.select().from(players).orderBy(sql`${players.id} asc`).all(),
    db.select().from(matches).orderBy(sql`${matches.date} desc`, sql`${matches.id} desc`).all(),
    db.select().from(settings).all(),
  ]);

  let config = { ...DEFAULT_DATA.settings };
  let groups = [...DEFAULT_DATA.groups];

  // 解析站点配置与组别配置，失败时回退默认值。
  allSettings.forEach((s) => {
    if (s.key === 'config') {
      try {
        config = { ...config, ...JSON.parse(s.value) };
      } catch {
        // 保持默认值
      }
    }
    if (s.key === 'groups') {
      try {
        groups = JSON.parse(s.value);
      } catch {
        // 保持默认值
      }
    }
  });

  // 首次启动数据库为空时，自动写入初始化数据。
  if (allPlayers.length === 0 && allMatches.length === 0 && allSettings.length === 0) {
    await seedDefaultData(event);
    return loadState(event);
  }

  return {
    settings: config,
    groups,
    players: allPlayers.map((p) => ({ id: p.id, name: p.name, groups: p.groups })),
    matches: allMatches.map((m) => ({
      id: m.id,
      date: m.date,
      group: m.group,
      p1_id: m.p1Id,
      p2_id: m.p2Id,
      s1: m.s1,
      s2: m.s2,
    })),
  };
}

/**
 * 向空库写入最小可用默认数据。
 */
async function seedDefaultData(event: any) {
  const db = useDb(event);

  await db
    .insert(settings)
    .values([
      { key: 'config', value: JSON.stringify(DEFAULT_DATA.settings) },
      { key: 'groups', value: JSON.stringify(DEFAULT_DATA.groups) },
    ])
    .onConflictDoNothing();

  for (const player of DEFAULT_DATA.players) {
    await db.insert(players).values({
      id: player.id,
      name: player.name,
      groups: player.groups,
      createdAt: new Date(),
    });
  }
}

/**
 * 按组别计算积分榜（积分/胜平负/净胜分）。
 */
export function calculateStandings(state: AppDbState) {
  const standings: Record<string, any[]> = {};
  state.groups.forEach((g) => (standings[g] = []));

  // 先把球员分配到各自组别并初始化统计字段。
  state.players.forEach((p) => {
    p.groups.forEach((g) => {
      if (!standings[g]) standings[g] = [];
      standings[g].push({ ...p, score: 0, matches: 0, wins: 0, draws: 0, diff: 0 });
    });
  });

  // 遍历比赛并累计双方数据。
  state.matches.forEach((m) => {
    const groupName = m.group;
    if (!standings[groupName]) return;
    const p1 = standings[groupName].find((p) => p.id === m.p1_id);
    const p2 = standings[groupName].find((p) => p.id === m.p2_id);
    if (p1 && p2) {
      p1.score += m.s1;
      p2.score += m.s2;
      p1.matches += 1;
      p2.matches += 1;
      if (m.s1 > m.s2) p1.wins++;
      else if (m.s1 < m.s2) p2.wins++;
      else {
        p1.draws++;
        p2.draws++;
      }
      p1.diff += m.s1 - m.s2;
      p2.diff += m.s2 - m.s1;
    }
  });

  // 补全负场并按“积分 > 胜场”排序。
  Object.keys(standings).forEach((g) => {
    standings[g].forEach((p) => {
      p.losses = p.matches - p.wins - p.draws;
    });
    standings[g].sort((a, b) => b.score - a.score || b.wins - a.wins);
  });

  return standings;
}
