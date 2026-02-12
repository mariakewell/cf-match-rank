export type RankingRule = 'score' | 'wins' | 'diff' | 'headToHead';
export type RankingRuleEnabled = Partial<Record<RankingRule, boolean>>;

export const DEFAULT_RANKING_RULES: RankingRule[] = ['score', 'wins', 'diff', 'headToHead'];

export interface MatchRecord {
  id: number;
  date: string;
  group: string;
  p1_id: number;
  p2_id: number;
  s1: number;
  s2: number;
}

export interface PlayerRecord {
  id: number;
  name: string;
  groups: string[];
}

export interface StandingItem extends PlayerRecord {
  rank: number;
  score: number;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  diff: number;
}

interface BuildStandingInput {
  groups: string[];
  players: PlayerRecord[];
  matches: MatchRecord[];
  rankingRules?: RankingRule[];
  rankingRuleEnabled?: RankingRuleEnabled;
}

interface HeadToHeadStat {
  winsA: number;
  winsB: number;
  diffA: number;
  diffB: number;
  scoreA: number;
  scoreB: number;
}

function normalizeRules(rules?: RankingRule[]) {
  if (!rules?.length) return DEFAULT_RANKING_RULES;
  const deduped = rules.filter((rule, idx) => rules.indexOf(rule) === idx && DEFAULT_RANKING_RULES.includes(rule));
  const merged = [...deduped, ...DEFAULT_RANKING_RULES.filter((rule) => !deduped.includes(rule))];
  return merged;
}

export function buildActiveRankingRules(rules?: RankingRule[], rankingRuleEnabled?: RankingRuleEnabled): RankingRule[] {
  const normalizedRules = normalizeRules(rules);
  return normalizedRules.filter((rule, idx) => {
    if (idx === 0) return true;
    return rankingRuleEnabled?.[rule] !== false;
  });
}

function getHeadToHeadStat(groupMatches: MatchRecord[], idA: number, idB: number): HeadToHeadStat {
  return groupMatches.reduce((acc, match) => {
    const isDirect = (match.p1_id === idA && match.p2_id === idB) || (match.p1_id === idB && match.p2_id === idA);
    if (!isDirect) return acc;

    const scoreA = match.p1_id === idA ? match.s1 : match.s2;
    const scoreB = match.p1_id === idA ? match.s2 : match.s1;

    acc.scoreA += scoreA;
    acc.scoreB += scoreB;
    acc.diffA += scoreA - scoreB;
    acc.diffB += scoreB - scoreA;

    if (scoreA > scoreB) acc.winsA += 1;
    if (scoreA < scoreB) acc.winsB += 1;

    return acc;
  }, { winsA: 0, winsB: 0, diffA: 0, diffB: 0, scoreA: 0, scoreB: 0 });
}

function createComparator(groupMatches: MatchRecord[], rules: RankingRule[]) {
  return (a: StandingItem, b: StandingItem) => {
    for (const rule of rules) {
      if (rule === 'score' && a.score !== b.score) return b.score - a.score;
      if (rule === 'wins' && a.wins !== b.wins) return b.wins - a.wins;
      if (rule === 'diff' && a.diff !== b.diff) return b.diff - a.diff;
      if (rule === 'headToHead') {
        const h2h = getHeadToHeadStat(groupMatches, a.id, b.id);
        if (h2h.winsA !== h2h.winsB) return h2h.winsB - h2h.winsA;
        if (h2h.diffA !== h2h.diffB) return h2h.diffB - h2h.diffA;
        if (h2h.scoreA !== h2h.scoreB) return h2h.scoreB - h2h.scoreA;
      }
    }
    return a.id - b.id;
  };
}

export function buildStandings({ groups, players, matches, rankingRules, rankingRuleEnabled }: BuildStandingInput) {
  const result: Record<string, StandingItem[]> = {};
  groups.forEach((group) => {
    result[group] = [];
  });

  players.forEach((player) => {
    player.groups.forEach((group) => {
      if (!result[group]) result[group] = [];
      result[group].push({
        ...player,
        rank: 0,
        score: 0,
        matches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        diff: 0,
      });
    });
  });

  matches.forEach((match) => {
    const groupTable = result[match.group];
    if (!groupTable) return;

    const p1 = groupTable.find((item) => item.id === match.p1_id);
    const p2 = groupTable.find((item) => item.id === match.p2_id);
    if (!p1 || !p2) return;

    p1.score += match.s1;
    p2.score += match.s2;
    p1.matches += 1;
    p2.matches += 1;
    p1.diff += match.s1 - match.s2;
    p2.diff += match.s2 - match.s1;

    if (match.s1 > match.s2) p1.wins += 1;
    else if (match.s1 < match.s2) p2.wins += 1;
    else {
      p1.draws += 1;
      p2.draws += 1;
    }
  });

  const rules = buildActiveRankingRules(rankingRules, rankingRuleEnabled);

  Object.keys(result).forEach((group) => {
    result[group].forEach((item) => {
      item.losses = item.matches - item.wins - item.draws;
    });

    const groupMatches = matches.filter((match) => match.group === group);
    const comparator = createComparator(groupMatches, rules);
    result[group].sort(comparator);

    result[group].forEach((player, idx) => {
      if (idx === 0) {
        player.rank = 1;
        return;
      }
      const prev = result[group][idx - 1];
      player.rank = comparator(prev, player) === 0 ? prev.rank : idx + 1;
    });
  });

  return result;
}
