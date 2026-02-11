<script setup lang="ts">
const { show } = useToast();

// Fetch all data raw
const { data } = await useFetch('/api/data');

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
    
    const p1 = result[groupName].find(p => p.id === m.p1_id);
    const p2 = result[groupName].find(p => p.id === m.p2_id);
    
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
  window.location.href = '/';
};

const bgStyle = computed(() => {
  if (data.value?.settings?.background) {
    return {
      backgroundImage: `linear-gradient(160deg, rgba(15,23,42,0.6), rgba(30,64,175,0.25)), url('${data.value.settings.background}')`,
      backgroundSize: 'cover, cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      backgroundRepeat: 'no-repeat',
      backgroundBlendMode: 'soft-light'
    };
  }
  return {};
});
</script>

<template>
  <div class="min-h-screen pb-24" :style="bgStyle">
    <div class="max-w-7xl mx-auto px-3 sm:px-6 pt-8 md:pt-12">
      <!-- Header -->
      <header class="text-center mb-6 animate-fade-in-down" v-if="data">
        <h1 class="text-4xl md:text-6xl font-black text-white drop-shadow-[0_10px_30px_rgba(15,23,42,0.55)] mb-3 tracking-tight">
          {{ data.settings.title }}
        </h1>
        <div class="inline-block bg-white/90 backdrop-blur-md text-slate-700 px-4 py-2 rounded-full font-bold text-sm border border-white/70 shadow-lg">
          📢 {{ data.settings.notice }}
        </div>
      </header>

      <!-- Filter Card -->
      <div class="bg-white/90 backdrop-blur-md rounded-3xl shadow-[0_16px_40px_rgba(30,41,59,0.18)] border border-white/80 p-5 mb-8 max-w-xl mx-auto">
        <div class="flex flex-col gap-3">
          <div class="text-slate-600 font-bold text-sm text-center">
            {{ displayDate ? `📅 正在查看 ${displayDate} 的积分:` : '📅 查看特定日期积分' }}
          </div>
          <div class="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <input 
              v-model="filterDate"
              type="date" 
              class="w-full sm:w-[180px] bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100 outline-none transition-all h-[44px]"
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
      <div v-else class="rank-grid">
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
          class="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-3 rounded-2xl font-bold shadow-[0_10px_30px_rgba(16,185,129,0.4)] inline-block hover:scale-105 hover:brightness-110 transition-all"
        >
          管理后台
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-primary { 
  @apply inline-flex items-center justify-center h-[44px] px-6 rounded-xl font-bold text-sm transition-all bg-gradient-to-r from-amber-300 to-orange-400 text-orange-900 shadow-[0_10px_20px_rgba(251,146,60,0.45)] hover:brightness-105 active:translate-y-[1px];
}
.btn-danger {
  @apply inline-flex items-center justify-center h-[44px] px-4 rounded-xl font-bold text-sm transition-all bg-gradient-to-r from-rose-400 to-red-500 text-white shadow-[0_10px_20px_rgba(244,63,94,0.35)] hover:brightness-105 active:translate-y-[1px];
}
</style>
