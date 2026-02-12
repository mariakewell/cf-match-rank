<script setup lang="ts">
// 当前球员详情页依赖 URL 参数中的 id。
const route = useRoute();
const id = Number(route.params.id);
// 拉取全量数据后在前端做筛选。
const { data } = await useFetch('/api/data');

// 历史记录筛选条件：日期 + 对手名。
const filterDate = ref('');
const filterOpponent = ref('');

/** 当前球员对象。 */
const player = computed(() => data.value?.players.find((p) => p.id === id));

/** 当前球员的全部比赛（按日期倒序）。 */
const allMatches = computed(() => {
  if (!data.value) return [];
  return data.value.matches
    .filter((m) => m.p1_id === id || m.p2_id === id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
});

/** 基于筛选条件得到最终展示比赛。 */
const matches = computed(() => {
  if (!data.value) return [];
  return allMatches.value.filter((m) => {
    const isP1 = m.p1_id === id;
    const opponentId = isP1 ? m.p2_id : m.p1_id;
    const opponent = data.value?.players.find((p) => p.id === opponentId)?.name || '未知';
    const dateMatch = filterDate.value === '' || m.date === filterDate.value;
    const oppMatch = filterOpponent.value.trim() === '' || opponent.toLowerCase().includes(filterOpponent.value.trim().toLowerCase());
    return dateMatch && oppMatch;
  });
});

/** 统计胜平负数据，用于头部摘要展示。 */
const stats = computed(() => {
  let wins = 0, draws = 0, losses = 0;
  allMatches.value.forEach((m) => {
    const my = m.p1_id === id ? m.s1 : m.s2;
    const op = m.p1_id === id ? m.s2 : m.s1;
    if (my > op) wins++;
    else if (my === op) draws++;
    else losses++;
  });
  return { total: allMatches.value.length, wins, draws, losses };
});

/** 根据比赛记录计算对手姓名。 */
const getOpponentName = (m: any) => {
  const opId = m.p1_id === id ? m.p2_id : m.p1_id;
  return data.value?.players.find((p) => p.id === opId)?.name || '未知';
};
</script>

<template>
  <div class="min-h-screen flex flex-col items-center p-4" v-if="player">
    <div class="w-full max-w-md">
      <NuxtLink to="/" class="inline-block mb-4 px-4 py-2 bg-white rounded-full font-bold text-blue-500 shadow-sm border">← 返回排行榜</NuxtLink>
      <div class="bg-gradient-to-br from-blue-400 to-indigo-500 p-6 rounded-3xl text-white shadow-lg mb-6 text-center">
        <h1 class="text-3xl font-black">{{ player.name }}</h1>
        <div class="mt-2 text-lg font-bold">{{ stats.total }}场比赛 {{ stats.wins }}胜 {{ stats.draws }}平 {{ stats.losses }}负</div>
      </div>

      <div class="flex flex-col gap-2 mb-4">
        <div class="flex justify-between items-end">
          <h2 class="font-bold text-xl text-gray-700 ml-2">📊 历史战绩</h2>
          <span class="text-xs text-gray-400">显示 {{ matches.length }} 场</span>
        </div>
        <div class="flex gap-2">
          <input v-model="filterDate" type="date" class="bg-white border rounded p-2 text-sm w-1/2">
          <input v-model="filterOpponent" type="text" placeholder="搜对手名..." class="bg-white border rounded p-2 text-sm w-1/2">
        </div>
      </div>

      <div class="flex flex-col gap-3">
        <div v-for="m in matches" :key="m.id" class="bg-white p-4 rounded-xl border-2 border-gray-100 flex justify-between items-center shadow-sm">
          <div>
            <span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{{ m.date }}</span>
            <div class="font-bold text-lg mt-1">vs {{ getOpponentName(m) }}</div>
          </div>
          <div class="text-right">
            <div class="text-2xl font-black"
              :class="{ 'text-green-500': (m.p1_id === id ? m.s1 : m.s2) > (m.p1_id === id ? m.s2 : m.s1), 'text-red-500': (m.p1_id === id ? m.s1 : m.s2) < (m.p1_id === id ? m.s2 : m.s1), 'text-gray-500': m.s1 === m.s2 }">
              {{ m.p1_id === id ? m.s1 : m.s2 }} : {{ m.p1_id === id ? m.s2 : m.s1 }}
            </div>
          </div>
        </div>
        <div v-if="matches.length === 0" class="text-center text-gray-400 py-10">暂无记录</div>
      </div>
    </div>
  </div>
  <div v-else class="text-center pt-20">Loading...</div>
</template>
