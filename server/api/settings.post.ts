import { defineEventHandler, readFormData } from 'h3';
import { settings } from '~/shared/database/schema';
import { checkAuth } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { loadState } from '~/server/utils/state';

/**
 * 更新全局站点配置（标题、公告、背景图）。
 */
export default defineEventHandler(async (event) => {
  checkAuth(event);
  const formData = await readFormData(event);
  const state = await loadState(event);

  const nextSettings = {
    title: formData.get('title')?.toString().trim() || state.settings.title,
    notice: formData.get('notice')?.toString().trim() || state.settings.notice,
    background: formData.get('background')?.toString().trim() || state.settings.background,
  };

  const db = useDb(event);
  await db
    .insert(settings)
    .values({ key: 'config', value: JSON.stringify(nextSettings) })
    .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(nextSettings) } });

  return '设置保存成功';
});
