import { defineEventHandler, readFormData } from 'h3';
import { settings } from '~/shared/database/schema';
import { checkAuth } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { loadState } from '~/server/utils/state';
import { DEFAULT_RANKING_RULES, type RankingRule, type RankingRuleEnabled } from '~/shared/utils/ranking';

/**
 * 更新全局站点配置（标题、公告、背景图、站点图标）。
 */
export default defineEventHandler(async (event) => {
  checkAuth(event);
  const formData = await readFormData(event);
  const state = await loadState(event);
  const rankingRulesInput = formData.get('rankingRules')?.toString();
  let rankingRules: RankingRule[] = state.settings.rankingRules;
  let rankingRuleEnabled: RankingRuleEnabled = state.settings.rankingRuleEnabled || {};

  if (rankingRulesInput) {
    try {
      const parsedRules = JSON.parse(rankingRulesInput);
      if (Array.isArray(parsedRules) && parsedRules.every((rule) => DEFAULT_RANKING_RULES.includes(rule))) {
        rankingRules = parsedRules;
      }
    } catch {
      rankingRules = state.settings.rankingRules;
    }
  }

  const rankingRuleEnabledInput = formData.get('rankingRuleEnabled')?.toString();
  if (rankingRuleEnabledInput) {
    try {
      const parsedEnabled = JSON.parse(rankingRuleEnabledInput);
      if (parsedEnabled && typeof parsedEnabled === 'object') {
        const nextEnabled: RankingRuleEnabled = {};
        DEFAULT_RANKING_RULES.forEach((rule) => {
          const value = (parsedEnabled as Record<string, unknown>)[rule];
          if (typeof value === 'boolean') {
            nextEnabled[rule] = value;
          }
        });
        rankingRuleEnabled = nextEnabled;
      }
    } catch {
      rankingRuleEnabled = state.settings.rankingRuleEnabled || {};
    }
  }

  const nextSettings = {
    title: formData.get('title')?.toString().trim() || state.settings.title,
    notice: formData.get('notice')?.toString().trim() || state.settings.notice,
    background: formData.get('background')?.toString().trim() || state.settings.background,
    favicon: formData.get('favicon')?.toString().trim() || state.settings.favicon || '',
    rankingRules,
    rankingRuleEnabled,
  };

  const db = useDb(event);
  await db
    .insert(settings)
    .values({ key: 'config', value: JSON.stringify(nextSettings) })
    .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(nextSettings) } });

  return '设置保存成功';
});
