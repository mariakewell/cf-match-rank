import { defineEventHandler, setHeaders } from 'h3';
import { loadState } from '~/server/utils/state';
import { checkAuth } from '~/server/utils/auth';

/**
 * 导出比赛记录为 CSV 文件，供后台下载归档。
 */
export default defineEventHandler(async (event) => {
  checkAuth(event);
  const state = await loadState(event);

  let csvContent = '\uFEFF时间,选手1,比分,选手2,胜方,组别\n';
    // 遍历比赛记录并拼接 CSV 行内容。
  for (const m of state.matches) {
    const p1 = state.players.find((p) => p.id === m.p1_id)?.name || '未知';
    const p2 = state.players.find((p) => p.id === m.p2_id)?.name || '未知';
    let winner = '平局';
    if (m.s1 > m.s2) winner = p1;
    else if (m.s2 > m.s1) winner = p2;
    const scoreStr = `="${m.s1}:${m.s2}"`;
    csvContent += `${m.date},${p1},${scoreStr},${p2},${winner},${m.group}\n`;

  }

  setHeaders(event, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="matches_export_${new Date().toISOString().split('T')[0]}.csv"`,
  });

  return csvContent;
});
