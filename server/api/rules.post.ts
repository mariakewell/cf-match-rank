import { defineEventHandler, readFormData } from 'h3';
import { settings } from '~/shared/database/schema';
import { checkAuth } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { loadState } from '~/server/utils/state';
import { DEFAULT_RANKING_RULES, type RankingRule, type RankingRuleEnabled } from '~/shared/utils/ranking';
import { normalizeSeasonSettings, type SeasonSettings } from '~/shared/utils/season';

export default defineEventHandler(async (event) => {
  checkAuth(event);
  const formData = await readFormData(event);
  const state = await loadState(event);

  const rankingRulesInput = formData.get('rankingRules')?.toString();
  let rankingRules: RankingRule[] = state.settings.rankingRules;
  if (rankingRulesInput) {
    try {
      const parsedRules = JSON.parse(rankingRulesInput);
      if (
        Array.isArray(parsedRules)
        && parsedRules.length === DEFAULT_RANKING_RULES.length
        && parsedRules.every((rule) => DEFAULT_RANKING_RULES.includes(rule))
      ) {
        rankingRules = parsedRules;
      }
    } catch {
      rankingRules = state.settings.rankingRules;
    }
  }

  const rankingRuleEnabledInput = formData.get('rankingRuleEnabled')?.toString();
  let rankingRuleEnabled: RankingRuleEnabled = state.settings.rankingRuleEnabled || {};
  if (rankingRuleEnabledInput) {
    try {
      const parsedEnabled = JSON.parse(rankingRuleEnabledInput);
      if (parsedEnabled && typeof parsedEnabled === 'object') {
        const nextEnabled: RankingRuleEnabled = {};
        DEFAULT_RANKING_RULES.forEach((rule) => {
          const value = (parsedEnabled as Record<string, unknown>)[rule];
          nextEnabled[rule] = typeof value === 'boolean' ? value : true;
        });
        rankingRuleEnabled = nextEnabled;
      }
    } catch {
      rankingRuleEnabled = state.settings.rankingRuleEnabled || {};
    }
  }

  const seasonInput = formData.get('seasonSettings')?.toString();
  let seasonSettings: SeasonSettings = normalizeSeasonSettings(state.settings.seasonSettings);
  if (seasonInput) {
    try {
      seasonSettings = normalizeSeasonSettings(JSON.parse(seasonInput));
    } catch {
      seasonSettings = normalizeSeasonSettings(state.settings.seasonSettings);
    }
  }

  const nextSettings = {
    ...state.settings,
    rankingRules,
    rankingRuleEnabled,
    seasonSettings,
  };

  const db = useDb(event);
  await db
    .insert(settings)
    .values({ key: 'config', value: JSON.stringify(nextSettings) })
    .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(nextSettings) } });

  return '规则设置保存成功';
});
