<script setup lang="ts">
import { format } from 'date-fns';
const { show } = useToast();

// Fetch all data raw
const { data, refresh } = await useFetch('/api/data');

// Client-side State
const filterDate = ref('');
const displayDate = ref('');

// Computation Logic (Ported from Worker)
const standings = computed(() => {
  if (!data.value) return {};
  
  const rawMatches = data.value.matches;
  const rawPlayers = data.value.players;
  const rawGroups = data.value.groups;
  
  // Filter matches
  const filteredMatches = filterDate.value 
    ? rawMatches.filter(m => m.date === filterDate.value)
    : rawMatches;

  // Init Standings
  const result: Record<string, any[]> = {};
  rawGroups.forEach(g => result[g] = []);

  // Map Players to Groups
  rawPlayers.forEach(p => {
    p.groups.forEach(g => {
      if (!result[g]) result[g] = [];
      result[g].push({ 
        ...p, 
        score: 0, matches: 0, wins: 0, draws: 0, losses: 0 
      });
    });
  });

  // Calculate Scores
  filteredMatches.forEach(m => {
    const groupName = m.group;
    if (!result[groupName]) return;
    
    const p1 = result[groupName].find(p => p.id === m.p1Id);
    const p2 = result[groupName].find(p => p.id === m.p2Id);
    
    if (p1 && p2) {
      p1.score += m.s1;
      p2.score += m.s2;
      p1.matches += 1;
      p2.matches += 1;
      
      if (m.s1 > m.s2) p1.wins++;
      else if (m.s1 < m.s2) p2.wins++;
      else { p1.draws++; p2.draws++; }
    }
  });

  // Sort: Score desc, Wins desc
  Object.keys(result).forEach(g => {
    result[g].forEach(p => {
      p.losses = p.matches - p.wins - p.draws;
    });
    result[g].sort((a, b) => b.score - a.score || b.wins - a.wins);
  });

  return result;
});

const applyFilter = () => {
  if (!filterDate.value) {
    show('请先选择日期', 'error');
    return;
  }
  displayDate.value = filterDate.value;
  show(`已更新为 ${filterDate.value} 的数据`);
};

const resetFilter = () => {
  filterDate.value = '';
  displayDate.value = '';
  show('已显示全部数据');
};

const bgStyle = computed(() => {
  if (data.value?.settings?.background) {
    return {
      backgroundImage: `url('${data.value.settings.background}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      backgroundRepeat: 'no-repeat'
    };
  }
  return {};
});
</script>

<template>
  <div class="min-h-screen pb-20" :style="bgStyle">
    <div class="max-w-6xl mx-auto px-2 sm:px-4 pt-8">
      <!-- Header -->
      <header class="text-center mb-6 animate-fade-in-down" v-if="data">
        <h1 class="text-4xl md:text-5xl font-black text-orange-600 mb-2 tracking-tight">
          {{ data.settings.title }}
        </h1>
        <div class="inline-block bg-yellow-300 text-yellow-800 px-4 py-1 rounded-full font-bold text-sm transform -rotate-1">
          📢 {{ data.settings.notice }}
        </div>
      </header>

      <!-- Filter Card -->
      <div class="bg-white rounded-2xl shadow-[0_8px_0_#d1d5db] border-2 border-gray-100 p-4 mb-6 max-w-sm mx-auto">
        <div class="flex flex-col gap-3">
          <div class="text-gray-500 font-bold text-sm text-center">
            {{ displayDate ? `📅 正在查看 ${displayDate} 的积分:` : '📅 查看特定日期积分' }}
          </div>
          <div class="flex flex-col sm:flex-row gap-2 justify-center items-center">
            <input 
              v-model="filterDate"
              type="date" 
              class="w-[150px] bg-gray-50 border-2 border-gray-100 rounded-xl p-2 text-sm focus:border-orange-400 outline-none transition-all h-[44px]"
            >
            <div class="flex gap-2">
              <button @click="applyFilter" class="btn-primary">查询</button>
              <button @click="resetFilter" class="btn-danger">全部</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="!data" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="i in 2" :key="i" class="h-64 bg-gray-200 rounded-3xl animate-pulse"></div>
      </div>

      <!-- Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
        <RankingLeaderboardCard 
          v-for="group in data.groups" 
          :key="group"
          :group-name="group"
          :players="standings[group]"
        />
      </div>

      <!-- Footer -->
      <div class="text-center mt-12">
        <NuxtLink 
          to="/admin" 
          class="bg-green-600 text-white px-6 py-3 rounded-xl font-bold shadow-xl inline-block hover:scale-105 transition-transform"
        >
          管理后台
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-primary { 
  @apply inline-flex items-center justify-center h-[44px] px-6 rounded-xl font-bold text-sm transition-all bg-[#fbbf24] text-[#78350f] shadow-[0_4px_0_#d97706] active:translate-y-[2px] active:shadow-[0_2px_0_#d97706];
}
.btn-danger {
  @apply inline-flex items-center justify-center h-[44px] px-4 rounded-xl font-bold text-sm transition-all bg-[#f87171] text-white shadow-[0_4px_0_#b91c1c] active:translate-y-[2px] active:shadow-[0_2px_0_#b91c1c];
}
</style>