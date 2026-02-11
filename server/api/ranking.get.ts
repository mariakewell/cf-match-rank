import { defineCachedEventHandler } from '#imports';
import { calculateStandings, loadState } from '~/server/utils/state';

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
