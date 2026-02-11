<script setup lang="ts">
const { data, refresh } = await useFetch('/api/data');
const { show } = useToast();

const form = reactive({
  date: new Date().toISOString().split('T')[0],
  group: '',
  p1Id: '',
  p2Id: '',
  s1: 4,
  s2: 0
});

const filters = reactive({ date: '', player: '' });

const availablePlayers = computed(() => {
  if (!form.group || !data.value) return [];
  return data.value.players.filter(p => p.groups.includes(form.group));
});

async function saveMatch() {
  try {
    await $fetch('/api/admin/match', { method: 'POST', body: form });
    show('保存成功');
    refresh();
  } catch (e: any) {
    show(e.statusMessage || '保存失败', 'error');
  }
}

async function deleteMatch(id: number) {
  if (!confirm('确定删除?')) return;
  try {
    await $fetch('/api/admin/match', { method: 'DELETE', body: { id } });
    show('删除成功');
    refresh();
  } catch(e) { show('删除失败', 'error'); }
}

async function deleteByDate() {
  if (!filters.date) { show('请先选择筛选日期', 'error'); return; }
  if (!confirm(`确定删除 ${filters.date} 的所有记录?`)) return;
  try {
    await $fetch('/api/admin/match/bulk-delete', { method: 'POST', body: { date: filters.date } });
    show('批量删除成功');
    refresh();
  } catch(e) { show('操作失败', 'error'); }
}

const filteredMatches = computed(() => {
  if (!data.value) return [];
  return data.value.matches.filter(m => {
    const p1 = data.value!.players.find(p => p.id === m.p1Id)?.name || '';
    const p2 = data.value!.players.find(p => p.id === m.p2Id)?.name || '';
    
    const dateMatch = !filters.date || m.date === filters.date;
    const playerMatch = !filters.player || p1.includes(filters.player) || p2.includes(filters.player);
    return dateMatch && playerMatch;
  });
});

const getPlayerName = (id: number) => data.value?.players.find(p => p.id === id)?.name || '未知';
</script>

<template>
  <div class="max-w-4xl mx-auto p-4" v-if="data">
    <NuxtLink to="/admin" class="btn-primary mb-4 no-underline">返回导航</NuxtLink>
    
    <!-- Entry Form -->
    <div class="card p-6 border-l-8 border-l-green-400 mb-6">
      <h2 class="font-bold text-xl mb-4 text-green-600">📝 录入新比分</h2>
      <form @submit.prevent="saveMatch" class="space-y-4">
        <div class="flex flex-wrap gap-3 items-end">
          <div class="flex-1 min-w-[140px]">
            <label class="text-xs font-bold text-gray-400">日期</label>
            <input v-model="form.date" type="date" class="input-field">
          </div>
          <div class="flex-1 min-w-[120px]">
            <label class="text-xs font-bold text-gray-400">组别</label>
            <select v-model="form.group" class="input-field">
              <option value="" disabled>选择组别</option>
              <option v-for="g in data.groups" :key="g" :value="g">{{ g }}</option>
            </select>
          </div>
          <div class="flex-1 min-w-[120px]">
            <label class="text-xs font-bold text-gray-400">选手1</label>
            <select v-model="form.p1Id" class="input-field">
              <option value="" disabled>请选择</option>
              <option v-for="p in availablePlayers" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
          <div class="w-16"><input v-model="form.s1" type="number" class="input-field text-center"></div>
          <div class="font-bold pb-2">:</div>
          <div class="w-16"><input v-model="form.s2" type="number" class="input-field text-center"></div>
          <div class="flex-1 min-w-[120px]">
            <label class="text-xs font-bold text-gray-400">选手2</label>
            <select v-model="form.p2Id" class="input-field">
              <option value="" disabled>请选择</option>
              <option v-for="p in availablePlayers" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
        </div>
        <button class="w-full btn-primary py-3">提交成绩</button>
      </form>
    </div>

    <!-- Match List -->
    <div class="card p-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h2 class="font-bold text-xl">📊 比赛记录</h2>
        <div class="flex flex-wrap gap-2">
          <input v-model="filters.date" type="date" class="border rounded p-2 text-sm h-[40px] rounded-lg">
          <input v-model="filters.player" type="text" placeholder="查询球员..." class="border rounded p-2 text-sm w-32 h-[40px] rounded-lg">
          <button @click="deleteByDate" class="btn-danger text-sm">删除当天</button>
          <a href="/api/admin/match/export" target="_blank" class="btn-success text-sm flex items-center no-underline">📥 导出CSV</a>
        </div>
      </div>
      
      <div class="max-h-96 overflow-y-auto">
        <table class="w-full text-left border-collapse">
          <thead class="sticky top-0 bg-white text-xs text-gray-400 border-b">
            <tr><th class="p-2">日期</th><th class="p-2">对阵</th><th class="p-2 hidden sm:table-cell">组别</th><th class="p-2 text-right">操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="m in filteredMatches" :key="m.id" class="border-b text-sm hover:bg-gray-50">
              <td class="p-2 text-gray-500">{{ m.date }}</td>
              <td class="p-2 font-bold">{{ getPlayerName(m.p1Id) }} <span class="text-blue-500">{{ m.s1 }}:{{ m.s2 }}</span> {{ getPlayerName(m.p2Id) }}</td>
              <td class="p-2 text-xs text-gray-400 hidden sm:table-cell">{{ m.group }}</td>
              <td class="p-2 text-right">
                <button @click="deleteMatch(m.id)" class="text-red-400 font-bold px-2 hover:text-red-600">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
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
.btn-success {
  @apply inline-flex items-center justify-center h-[44px] px-4 rounded-xl font-bold text-sm transition-all bg-[#10b981] text-white shadow-[0_4px_0_#059669] active:translate-y-[2px] active:shadow-[0_2px_0_#059669];
}
.card {
  @apply bg-white rounded-[20px] shadow-[0_8px_0_#d1d5db] border-2 border-[#f3f4f6];
}
.input-field {
  @apply w-full bg-gray-50 border-2 border-gray-200 rounded-lg p-2 h-[44px] outline-none focus:border-blue-400 transition-colors;
}
</style>