import { sql } from 'drizzle-orm';
import { matches, players, settings } from '~/shared/database/schema';
import { buildStandings, DEFAULT_RANKING_RULES, type RankingRule, type RankingRuleEnabled } from '~/shared/utils/ranking';
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
    rankingRules: DEFAULT_RANKING_RULES,
    rankingRuleEnabled: {
      score: true,
      wins: true,
      diff: true,
      headToHead: true,
    } as RankingRuleEnabled,
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
  const rankingRules = (state.settings.rankingRules as RankingRule[]) || DEFAULT_RANKING_RULES;
  const rankingRuleEnabled = (state.settings.rankingRuleEnabled as RankingRuleEnabled) || DEFAULT_DATA.settings.rankingRuleEnabled;
  return buildStandings({
    groups: state.groups,
    players: state.players,
    matches: state.matches,
    rankingRules,
    rankingRuleEnabled,
  });
}
