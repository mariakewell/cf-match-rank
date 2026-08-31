import { createError, defineEventHandler, readFormData } from 'h3';
import { inArray } from 'drizzle-orm';
import { players } from '~/shared/database/schema';
import { checkAuth } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { loadState } from '~/server/utils/state';

/**
 * 批量覆盖指定球员的所属组别。
 */
export default defineEventHandler(async (event) => {
  checkAuth(event);
  const formData = await readFormData(event);
  const idsValue = formData.get('ids')?.toString() || '';
  const groups = [...new Set(formData.getAll('groups').map((group) => group.toString()))];

  let ids: number[];
  try {
    const parsedIds: unknown = JSON.parse(idsValue);
    if (!Array.isArray(parsedIds)) throw new Error('Invalid IDs');
    ids = [...new Set(parsedIds.map(Number))];
  } catch {
    throw createError({ statusCode: 400, statusMessage: '球员选择无效' });
  }

  if (ids.length === 0 || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw createError({ statusCode: 400, statusMessage: '请至少选择一名球员' });
  }
  if (groups.length === 0) throw createError({ statusCode: 400, statusMessage: '请至少选择一个组别' });

  const state = await loadState(event);
  if (groups.some((group) => !state.groups.includes(group))) {
    throw createError({ statusCode: 400, statusMessage: '所选组别不存在' });
  }

  const db = useDb(event);
  const selectedPlayers = await db.select({ id: players.id }).from(players).where(inArray(players.id, ids)).all();
  if (selectedPlayers.length !== ids.length) {
    throw createError({ statusCode: 404, statusMessage: '部分球员不存在，请刷新后重试' });
  }

  await db.update(players).set({ groups }).where(inArray(players.id, ids));
  return `已调整 ${ids.length} 名球员的组别`;
});
