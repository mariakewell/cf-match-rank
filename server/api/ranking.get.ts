import { defineCachedEventHandler } from '#imports';
import { calculateStandings, loadState } from '~/server/utils/state';

/**
 * 返回排行榜数据，并开启短时缓存（SWR）。
 * 该接口用于首页排行榜展示，避免每次请求都全量重算。
 */
export default defineCachedEventHandler(async (event) => {
  const db = await loadState(event);
  return {
    standings: calculateStandings(db),
    groups: db.groups,
    updatedAt: new Date().toISOString(),
  };
}, {
  swr: true,
  maxAge: 60,
  name: 'ranking-data',
});
