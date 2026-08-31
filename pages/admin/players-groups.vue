<script setup lang="ts">
// 本文件为页面交互逻辑，所有函数用途均使用中文注释。
const auth = useCookie('auth');
const { data, refresh } = await useFetch('/api/data');
const { show } = useToast();

const playerForm = reactive({ id: '', name: '', groups: [] as string[] });
const selectedPlayerIds = ref<number[]>([]);
const batchGroups = ref<string[]>([]);
const searchInput = ref('');
const activeGroup = ref('');

/** 按姓名与组别筛选球员列表。 */
const filteredPlayers = computed(() => {
  if (!data.value) return [];
  const q = searchInput.value.trim().toLowerCase();
  return data.value.players.filter((p) => {
    const matchName = q === '' || p.name.toLowerCase().includes(q);
    const matchGroup = activeGroup.value === '' || p.groups.includes(activeGroup.value);
    return matchName && matchGroup;
  });
});

// 通用表单提交函数：将对象转 FormData 后发送到后端。
async function postForm(url: string, payload: Record<string, any>) {
  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      v.forEach((item) => fd.append(k, String(item)));
    } else {
      fd.append(k, String(v));
    }
  });
  const resp = await fetch(url, { method: 'POST', body: fd });
  const text = await resp.text();
  if (!resp.ok) throw new Error(text || '操作失败');
  return text;
}

// 保存球员信息并刷新列表。
async function savePlayer() {
  try {
    const text = await postForm('/api/player/save', playerForm as any);
    show(text || '保存成功');
    playerForm.id = '';
    playerForm.name = '';
    playerForm.groups = [];
    refresh();
  } catch (e: any) {
    show(e.message || '操作失败', 'error');
  }
}

// 删除球员。
async function deletePlayer(id: number) {
  try {
    const text = await postForm('/api/player/delete', { id });
    show(text || '删除成功');
    selectedPlayerIds.value = selectedPlayerIds.value.filter((selectedId) => selectedId !== id);
    refresh();
  } catch (e: any) {
    show(e.message || '删除失败', 'error');
  }
}

/** 批量更新已选择球员的组别。 */
async function updateSelectedPlayersGroups() {
  try {
    const text = await postForm('/api/player/batch-update-groups', {
      ids: JSON.stringify(selectedPlayerIds.value),
      groups: batchGroups.value,
    });
    show(text || '组别调整成功');
    selectedPlayerIds.value = [];
    batchGroups.value = [];
    refresh();
  } catch (e: any) {
    show(e.message || '组别调整失败', 'error');
  }
}

// 新增组别。
async function addGroup(name: string) {
  try {
    const text = await postForm('/api/group/add', { name });
    show(text || '添加成功');
    refresh();
  } catch (e: any) {
    show(e.message || '操作失败', 'error');
  }
}

// 删除组别。
async function deleteGroup(name: string) {
  try {
    const text = await postForm('/api/group/delete', { name });
    show(text || '删除成功');
    refresh();
  } catch (e: any) {
    show(e.message || '操作失败', 'error');
  }
}

const newGroup = ref('');
/** 点击组别后仅展示该组球员。 */
const filterByGroup = (groupName: string) => {
  searchInput.value = '';
  activeGroup.value = groupName;
  show(`正在查看: ${groupName}`);
};
/** 清空球员筛选条件并展示全部。 */
const clearPlayerFilter = () => {
  activeGroup.value = '';
  searchInput.value = '';
};
/** 仅选择当前筛选结果中的全部球员。 */
const toggleFilteredPlayers = () => {
  const ids = filteredPlayers.value.map((player) => player.id);
  const allSelected = ids.length > 0 && ids.every((id) => selectedPlayerIds.value.includes(id));
  selectedPlayerIds.value = allSelected
    ? selectedPlayerIds.value.filter((id) => !ids.includes(id))
    : [...new Set([...selectedPlayerIds.value, ...ids])];
};
const isAllFilteredPlayersSelected = computed(() => (
  filteredPlayers.value.length > 0
  && filteredPlayers.value.every((player) => selectedPlayerIds.value.includes(player.id))
));
/** 将球员信息回填到表单，进入编辑态。 */
const editPlayer = (p: any) => {
  playerForm.id = String(p.id);
  playerForm.name = p.name;
  playerForm.groups = [...p.groups];
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
</script>

<template>
  <div v-if="!auth" class="min-h-screen flex items-center justify-center bg-gray-100">
    <form action="/api/login" method="POST" class="bg-white p-8 rounded-[20px] shadow-[0_10px_25px_rgba(0,0,0,0.1)] w-[90%] max-w-[350px] text-center">
      <h2 class="mb-5 font-black text-gray-700 text-2xl">🎾 管理登录</h2>
      <input type="password" name="password" placeholder="请输入管理员密码" class="w-full p-3 mb-4 border-2 border-gray-200 rounded-xl outline-none">
      <button class="w-full p-3 bg-blue-500 text-white border-none rounded-xl font-bold">进入管理系统</button>
    </form>
  </div>

  <div class="max-w-4xl mx-auto p-4" v-else-if="data">
    <div class="mb-4 flex items-center justify-between">
      <NuxtLink to="/admin" class="btn-primary inline-flex">返回导航</NuxtLink>
      <NuxtLink to="/" class="btn-home">返回首页</NuxtLink>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="card p-6 md:col-span-2">
        <h2 class="font-bold text-lg mb-4 text-blue-500">👤 球员管理</h2>
        <form @submit.prevent="savePlayer" class="mb-6 bg-blue-50 p-3 rounded-xl">
          <input type="hidden" v-model="playerForm.id">
          <input v-model="playerForm.name" type="text" placeholder="姓名" class="w-full mb-2 p-2 rounded border" required>
          <div class="flex flex-wrap gap-2 mb-3">
            <label v-for="g in data.groups" :key="g" class="flex items-center gap-1 bg-white px-2 py-1 rounded text-xs border">
              <input type="checkbox" :value="g" v-model="playerForm.groups"> {{ g }}
            </label>
          </div>
          <button class="w-full bg-blue-500 text-white rounded py-2 font-bold">保存球员信息</button>
        </form>
        <div class="flex justify-between items-center mb-4">
          <input v-model="searchInput" type="text" placeholder="搜索姓名..." class="flex-1 p-2 border rounded">
          <button @click="clearPlayerFilter" class="ml-2 text-xs text-gray-500">显示全部</button>
        </div>
        <form v-if="selectedPlayerIds.length > 0" @submit.prevent="updateSelectedPlayersGroups" class="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p class="mb-2 text-sm font-bold text-blue-600">已选择 {{ selectedPlayerIds.length }} 名球员，调整为以下组别：</p>
          <div class="mb-3 flex flex-wrap gap-2">
            <label v-for="g in data.groups" :key="g" class="flex items-center gap-1 rounded border bg-white px-2 py-1 text-xs">
              <input v-model="batchGroups" type="checkbox" :value="g"> {{ g }}
            </label>
          </div>
          <button class="rounded bg-blue-500 px-3 py-2 text-sm font-bold text-white">批量调整组别</button>
        </form>
        <div>
          <label v-if="filteredPlayers.length > 0" class="mb-2 flex items-center gap-2 text-xs text-gray-500">
            <input type="checkbox" :checked="isAllFilteredPlayersSelected" @change="toggleFilteredPlayers">
            全选当前列表
          </label>
          <div v-for="p in filteredPlayers" :key="p.id" class="player-item flex justify-between items-center bg-gray-50 p-2 rounded mb-2">
            <div class="flex min-w-0 items-center gap-2">
              <input v-model="selectedPlayerIds" type="checkbox" :value="p.id" :aria-label="`选择${p.name}`">
              <div><div class="font-bold text-sm">{{ p.name }}</div><div class="text-[10px] text-gray-400">{{ p.groups.join(', ') }}</div></div>
            </div>
            <div class="flex gap-2">
              <button @click="editPlayer(p)" class="text-xs text-blue-400 font-bold">编辑</button>
              <button @click="deletePlayer(p.id)" class="text-xs text-red-400 font-bold">删除</button>
            </div>
          </div>
        </div>
      </div>
      <div class="card p-6 md:col-span-1">
        <h2 class="font-bold text-lg mb-4 text-purple-500">🏷️ 组别管理</h2>
        <p class="text-[10px] text-gray-400 mb-3">提示：点击组别名可查看组内球员</p>
        <form @submit.prevent="addGroup(newGroup)" class="mb-4 border-b pb-4">
          <input v-model="newGroup" type="text" placeholder="新组别名" class="w-full p-2 rounded border mb-2" required>
          <button class="w-full bg-purple-500 text-white py-2 rounded font-bold text-sm">添加组别</button>
        </form>
        <div class="space-y-1">
          <div v-for="g in data.groups" :key="g" class="flex justify-between items-center p-2 bg-gray-50 rounded hover:bg-purple-50 group">
            <span class="font-bold text-sm flex-1" @click="filterByGroup(g)">{{ g }}</span>
            <button @click="deleteGroup(g)" class="text-red-300 hover:text-red-500 font-bold">×</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-primary { @apply inline-flex items-center justify-center h-[44px] px-6 rounded-xl font-bold text-sm transition-all bg-[#fbbf24] text-[#78350f] shadow-[0_4px_0_#d97706] active:translate-y-[2px] active:shadow-[0_2px_0_#d97706]; }
.btn-home { @apply inline-flex items-center justify-center h-[44px] px-4 rounded-xl font-bold text-sm transition-all bg-[#60a5fa] text-white shadow-[0_4px_0_#2563eb] active:translate-y-[2px] active:shadow-[0_2px_0_#2563eb]; }
.card { @apply bg-white rounded-[20px] shadow-[0_8px_0_#d1d5db] border-2 border-[#f3f4f6]; }
</style>
