<script setup lang="ts">
import { DEFAULT_RANKING_RULES, type RankingRule, type RankingRuleEnabled } from '~/shared/utils/ranking';
import { normalizeSeasonSettings, type SeasonMode } from '~/shared/utils/season';

const auth = useCookie('auth');
const { data, refresh } = await useFetch('/api/data');
const { show } = useToast();

const rankingRules = ref<RankingRule[]>([...DEFAULT_RANKING_RULES]);
const rankingRuleEnabled = ref<RankingRuleEnabled>({
  score: true,
  wins: true,
  diff: true,
  headToHead: true,
});

const seasonMode = ref<SeasonMode>('off');
const seasonStartDate = ref('');
const seasonEndDate = ref('');
const seasonRecentDays = ref(30);

const ruleMeta: Record<RankingRule, string> = {
  score: '总积分',
  wins: '胜场',
  diff: '净胜分 diff',
  headToHead: '交手记录',
};

watchEffect(() => {
  if (!data.value) return;

  rankingRules.value = data.value.settings.rankingRules?.length
    ? [...data.value.settings.rankingRules]
    : [...DEFAULT_RANKING_RULES];

  const sourceEnabled = data.value.settings.rankingRuleEnabled || {};
  rankingRuleEnabled.value = {
    score: sourceEnabled.score !== false,
    wins: sourceEnabled.wins !== false,
    diff: sourceEnabled.diff !== false,
    headToHead: sourceEnabled.headToHead !== false,
  };

  const season = normalizeSeasonSettings(data.value.settings.seasonSettings);
  seasonMode.value = season.mode;
  seasonStartDate.value = season.startDate;
  seasonEndDate.value = season.endDate;
  seasonRecentDays.value = season.recentDays;
});

const moveRuleUp = (index: number) => {
  if (index === 0) return;
  const next = [...rankingRules.value];
  [next[index - 1], next[index]] = [next[index], next[index - 1]];
  rankingRules.value = next;
};

const moveRuleDown = (index: number) => {
  if (index === rankingRules.value.length - 1) return;
  const next = [...rankingRules.value];
  [next[index], next[index + 1]] = [next[index + 1], next[index]];
  rankingRules.value = next;
};

const handleRuleEnabledChange = (rule: RankingRule, event: Event) => {
  const target = event.target as HTMLInputElement | null;
  rankingRuleEnabled.value = {
    ...rankingRuleEnabled.value,
    [rule]: !!target?.checked,
  };
};

async function saveRules() {
  const fd = new FormData();
  fd.append('rankingRules', JSON.stringify(rankingRules.value));
  fd.append('rankingRuleEnabled', JSON.stringify(rankingRuleEnabled.value));
  fd.append('seasonSettings', JSON.stringify({
    mode: seasonMode.value,
    startDate: seasonStartDate.value,
    endDate: seasonEndDate.value,
    recentDays: seasonRecentDays.value,
  }));

  const resp = await fetch('/api/rules', { method: 'POST', body: fd });
  const text = await resp.text();
  if (resp.ok) {
    show(text || '规则已更新');
    refresh();
  } else {
    show(text || '保存失败', 'error');
  }
}
</script>

<template>
  <div v-if="!auth" class="min-h-screen flex items-center justify-center bg-gray-100">
    <form action="/api/login" method="POST" class="bg-white p-8 rounded-[20px] shadow-[0_10px_25px_rgba(0,0,0,0.1)] w-[90%] max-w-[350px] text-center">
      <h2 class="mb-5 font-black text-gray-700 text-2xl">🎾 管理登录</h2>
      <input type="password" name="password" placeholder="请输入管理员密码" class="w-full p-3 mb-4 border-2 border-gray-200 rounded-xl outline-none">
      <button class="w-full p-3 bg-blue-500 text-white border-none rounded-xl font-bold">进入管理系统</button>
    </form>
  </div>
  <div class="max-w-4xl mx-auto p-4" v-else>
    <div class="mb-4 flex items-center justify-between">
      <NuxtLink to="/admin" class="btn-primary no-underline">返回导航</NuxtLink>
      <NuxtLink to="/" class="btn-home no-underline">返回首页</NuxtLink>
    </div>

    <div class="card p-6" v-if="data">
      <h2 class="font-bold text-lg mb-4">📐 规则设置</h2>
      <form class="space-y-6" @submit.prevent="saveRules">
        <section>
          <label class="text-xs font-bold text-gray-400">排行榜规则（从上到下依次比较）</label>
          <div class="mt-2 space-y-2">
            <div
              v-for="(rule, index) in rankingRules"
              :key="rule"
              class="flex items-center justify-between border rounded-lg px-3 py-2 bg-gray-50"
            >
              <div class="font-semibold text-gray-700">{{ index + 1 }}. {{ ruleMeta[rule] }}</div>
              <div class="flex items-center gap-3">
                <label class="flex items-center gap-1 text-xs font-semibold text-gray-600">
                  <input
                    type="checkbox"
                    :checked="index === 0 ? true : rankingRuleEnabled[rule] !== false"
                    :disabled="index === 0"
                    @change="handleRuleEnabledChange(rule, $event)"
                  >
                  {{ index === 0 ? '必选' : '启用' }}
                </label>
                <button type="button" class="move-btn" :disabled="index === 0" @click="moveRuleUp(index)">上移</button>
                <button type="button" class="move-btn" :disabled="index === rankingRules.length - 1" @click="moveRuleDown(index)">下移</button>
              </div>
            </div>
          </div>
        </section>

        <section class="space-y-3">
          <label class="text-xs font-bold text-gray-400">赛季设置（仅影响总榜展示，不影响用户手动日期筛选）</label>
          <div class="space-y-2 text-sm">
            <label class="flex items-center gap-2"><input v-model="seasonMode" type="radio" value="off"> 不启用赛季过滤</label>
            <label class="flex items-center gap-2"><input v-model="seasonMode" type="radio" value="dateRange"> 仅统计指定日期范围</label>
            <label class="flex items-center gap-2"><input v-model="seasonMode" type="radio" value="recentDays"> 仅统计当前日期前 N 天</label>
            <label class="flex items-center gap-2"><input v-model="seasonMode" type="radio" value="singleDateAfter"> 统计指定日期之后（含当天）</label>
            <label class="flex items-center gap-2"><input v-model="seasonMode" type="radio" value="singleDateBefore"> 统计指定日期之前（含当天）</label>
          </div>

          <div v-if="seasonMode === 'dateRange'" class="pt-1">
            <DateRangePicker
              :start-date="seasonStartDate"
              :end-date="seasonEndDate"
              input-class="w-full p-2 border rounded"
              placeholder="选择赛季日期范围"
              @update:start-date="seasonStartDate = $event"
              @update:end-date="seasonEndDate = $event"
            />
          </div>

          <div v-if="seasonMode === 'singleDateAfter'" class="pt-1">
            <label class="text-xs font-bold text-gray-400">起始日期</label>
            <input
              v-model="seasonStartDate"
              type="date"
              class="w-full p-2 border rounded"
            >
          </div>

          <div v-if="seasonMode === 'singleDateBefore'" class="pt-1">
            <label class="text-xs font-bold text-gray-400">截止日期</label>
            <input
              v-model="seasonEndDate"
              type="date"
              class="w-full p-2 border rounded"
            >
          </div>

          <div v-if="seasonMode === 'recentDays'" class="pt-1">
            <label class="text-xs font-bold text-gray-400">天数</label>
            <input
              v-model.number="seasonRecentDays"
              type="number"
              min="1"
              max="3650"
              class="w-full p-2 border rounded"
              placeholder="例如 30"
            >
          </div>
        </section>

        <button class="bg-gray-600 text-white py-2 rounded font-bold mt-2 w-full">保存规则设置</button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.btn-primary { @apply inline-flex items-center justify-center h-[44px] px-6 rounded-xl font-bold text-sm transition-all bg-[#fbbf24] text-[#78350f] shadow-[0_4px_0_#d97706] active:translate-y-[2px] active:shadow-[0_2px_0_#d97706]; }
.btn-home { @apply inline-flex items-center justify-center h-[44px] px-4 rounded-xl font-bold text-sm transition-all bg-[#60a5fa] text-white shadow-[0_4px_0_#2563eb] active:translate-y-[2px] active:shadow-[0_2px_0_#2563eb]; }
.card { @apply bg-white rounded-[20px] shadow-[0_8px_0_#d1d5db] border-2 border-[#f3f4f6]; }
.move-btn { @apply px-3 py-1 rounded bg-white border text-sm font-semibold text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed; }
</style>
