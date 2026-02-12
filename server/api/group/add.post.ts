import { createError, defineEventHandler, readFormData } from 'h3';
import { settings } from '~/shared/database/schema';
import { checkAuth } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { loadState } from '~/server/utils/state';

/**
 * 新增组别并写回 settings 表中的 groups 配置。
 */
export default defineEventHandler(async (event) => {
  checkAuth(event);
  const formData = await readFormData(event);
  const name = formData.get('name')?.toString().trim();
  if (!name) throw createError({ statusCode: 400, statusMessage: '组别名称不能为空' });

  const db = useDb(event);
  const state = await loadState(event);
  const groups = [...state.groups, name];

  await db
    .insert(settings)
    .values({ key: 'groups', value: JSON.stringify(groups) })
    .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(groups) } });

  return '添加成功';
});
