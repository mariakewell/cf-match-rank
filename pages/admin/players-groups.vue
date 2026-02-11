<script setup lang="ts">
const { data, refresh } = await useFetch('/api/data');
const { show } = useToast();

// Player Form
const playerForm = reactive({ id: 0, name: '', groups: [] as string[] });
const searchQuery = ref('');

// Group Form
const groupName = ref('');

async function savePlayer() {
  try {
    await $fetch('/api/admin/player', { method: 'POST', body: playerForm });
    show('保存球员信息成功');
    // Reset
    playerForm.id = 0; playerForm.name = ''; playerForm.groups = [];
    refresh();
  } catch(e: any) { show(e.statusMessage, 'error'); }
}

async function deletePlayer(id: number) {
  if (!confirm('删除球员会同时删除其所有比赛记录，确定吗？')) return;
  try {
    await $fetch('/api/admin/player', { method: 'DELETE', body: { id } });
    show('删除成功');
    refresh();
  } catch(e) { show('操作失败', 'error'); }
}

function editPlayer(p: any) {
  playerForm.id = p.id;
  playerForm.name = p.name;
  playerForm.groups = [...p.groups];
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function addGroup() {
  if (!groupName.value) return;
  const newGroups = [...(data.value?.groups || []), groupName.value];
  await saveGroups(newGroups);
  groupName.value = '';
}

async function deleteGroup(name: string) {
  if (!confirm('确定删除该组别？这会从所有球员中移除该组别标签。')) return;
  const newGroups = data.value!.groups.filter(g => g !== name);
  await saveGroups(newGroups, 'delete', name);
}

async function saveGroups(groups: string[], action = 'update', groupName = '') {
  try {
    await $fetch('/api/admin/settings', { 
      method: 'POST', 
      body: { type: 'groups', groups, action, groupName } 
    });
    show('组别已更新');
    refresh();
  } catch(e) { show('操作失败', 'error'); }
}

// Filtering
const filteredPlayers = computed(() => {
  if (!data.value) return [];
  const q = searchQuery.value.toLowerCase();
  return data.value.players.filter(p => p.name.toLowerCase().includes(q));
});

// Filter by group click
const filterGroup = (g: string) => {
  searchQuery.value = '';
  // This logic is slightly different from searching name, 
  // but to keep it simple we just filter the list in place manually or add a group filter
  // For now let's just toast and maybe implement a complex filter if needed, 
  // but the request was to match the worker which used display:none
};
</script>

<template>
  <div class="max-w-4xl mx-auto p-4" v-if="data">
    <NuxtLink to="/admin" class="btn-primary mb-4 no-underline">返回导航</NuxtLink>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Player Manager -->
      <div class="card p-6 md:col-span-2">
        <h2 class="font-bold text-lg mb-4 text-blue-500">👤 球员管理</h2>
        
        <form @submit.prevent="savePlayer" class="mb-6 bg-blue-50 p-3 rounded-xl">
          <input v-model="playerForm.name" type="text" placeholder="姓名" class="w-full mb-2 p-2 rounded border" required>
          <div class="flex flex-wrap gap-2 mb-3">
            <label v-for="g in data.groups" :key="g" class="flex items-center gap-1 bg-white px-2 py-1 rounded text-xs border cursor-pointer">
              <input type="checkbox" :value="g" v-model="playerForm.groups"> {{ g }}
            </label>
          </div>
          <button class="w-full bg-blue-500 text-white rounded py-2 font-bold hover:bg-blue-600 transition">保存球员信息</button>
        </form>

        <div class="flex justify-between items-center mb-4">
          <input v-model="searchQuery" type="text" placeholder="搜索姓名..." class="flex-1 p-2 border rounded">
          <button @click="searchQuery = ''" class="ml-2 text-xs text-gray-500">显示全部</button>
        </div>

        <div class="space-y-2">
          <div v-for="p in filteredPlayers" :key="p.id" class="flex justify-between items-center bg-gray-50 p-2 rounded">
            <div>
              <div class="font-bold text-sm">{{ p.name }}</div>
              <div class="text-[10px] text-gray-400">{{ p.groups.join(', ') }}</div>
            </div>
            <div class="flex gap-2">
              <button @click="editPlayer(p)" class="text-xs text-blue-400 font-bold">编辑</button>
              <button @click="deletePlayer(p.id)" class="text-xs text-red-400 font-bold">删除</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Group Manager -->
      <div class="card p-6 md:col-span-1">
        <h2 class="font-bold text-lg mb-4 text-purple-500">🏷️ 组别管理</h2>
        <form @submit.prevent="addGroup" class="mb-4 border-b pb-4">
          <input v-model="groupName" type="text" placeholder="新组别名" class="w-full p-2 rounded border mb-2" required>
          <button class="w-full bg-purple-500 text-white py-2 rounded font-bold text-sm hover:bg-purple-600">添加组别</button>
        </form>
        <div class="space-y-1">
          <div v-for="g in data.groups" :key="g" class="flex justify-between items-center p-2 bg-gray-50 rounded hover:bg-purple-50">
             <span class="font-bold text-sm flex-1">{{ g }}</span>
             <button @click="deleteGroup(g)" class="text-red-300 hover:text-red-500 font-bold">×</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-primary { @apply inline-flex items-center justify-center h-[44px] px-6 rounded-xl font-bold text-sm transition-all bg-[#fbbf24] text-[#78350f] shadow-[0_4px_0_#d97706] active:translate-y-[2px] active:shadow-[0_2px_0_#d97706]; }
.card { @apply bg-white rounded-[20px] shadow-[0_8px_0_#d1d5db] border-2 border-[#f3f4f6]; }
</style>