<script setup lang="ts">
// 本文件为页面交互逻辑，所有函数用途均使用中文注释。
const auth = useCookie('auth');
const { show } = useToast();
const { data, refresh } = await useFetch('/api/data');

const today = new Date().toISOString().split('T')[0];
const uploadInputRef = ref<HTMLInputElement | null>(null);
const form = reactive({
  date: today,
  group: '',
  p1_id: '',
  p2_id: '',
  s1: 4,
  s2: 0,
});
const filters = reactive({ startDate: '', endDate: '', player: '' });

/** 根据当前表单组别筛选可选球员。 */
const availablePlayers = computed(() => {
  if (!data.value || !form.group) return [];
  return data.value.players.filter((p) => p.groups.includes(form.group));
});

/** 根据日期范围与球员关键字过滤比赛记录。 */
const filteredMatches = computed(() => {
  if (!data.value) return [];
  return data.value.matches.filter((m) => {
    const p1 = data.value!.players.find((p) => p.id === m.p1_id)?.name || '';
    const p2 = data.value!.players.find((p) => p.id === m.p2_id)?.name || '';
    const dateMatch =
      (!filters.startDate || m.date >= filters.startDate)
      && (!filters.endDate || m.date <= filters.endDate);
    const playerText = filters.player.trim().toLowerCase();
    const playerMatch = playerText === '' || p1.toLowerCase().includes(playerText) || p2.toLowerCase().includes(playerText);
    return dateMatch && playerMatch;
  });
});

/** 根据球员 ID 获取姓名，用于表格展示。 */
const getPlayerName = (id: number) => data.value?.players.find((p) => p.id === id)?.name || '未知';

// 通用表单提交函数：将对象转 FormData 后发送到后端。
async function postForm(url: string, payload: Record<string, any>) {
  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => fd.append(k, String(v)));
  const resp = await fetch(url, { method: 'POST', body: fd });
  const text = await resp.text();
  if (!resp.ok) throw new Error(text || '失败');
  return text;
}

// 保存比赛记录（新增/编辑共用）。
async function saveMatch() {
  try {
    const text = await postForm('/api/match/save', form as any);
    show(text || '保存成功');
    setTimeout(() => refresh(), 300);
  } catch (e: any) {
    show(e.message || '失败', 'error');
  }
}

// 删除单条比赛记录。
async function deleteMatch(id: number) {
  try {
    const text = await postForm('/api/match/delete', { id });
    show(text || '删除成功');
    refresh();
  } catch (e: any) {
    show(e.message || '删除失败', 'error');
  }
}

// 删除筛选结果中的所有比赛。
async function deleteFilteredMatches() {
  const matchIds = filteredMatches.value.map((m) => m.id);
  if (!matchIds.length) {
    show('当前筛选结果为空，无可删除比赛', 'error');
    return;
  }
  if (!confirm(`确定删除当前筛选出的 ${matchIds.length} 场比赛吗？`)) return;

  try {
    const text = await postForm('/api/match/delete_by_date', { ids: JSON.stringify(matchIds) });
    show(text || '删除比赛成功');
    refresh();
  } catch (e: any) {
    show(e.message || '删除失败', 'error');
  }
}

// 打开文件选择器。
function openUploadDialog() {
  uploadInputRef.value?.click();
}

// 上传表格文件并批量导入比赛记录。
async function importRecords(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  try {
    const fd = new FormData();
    fd.append('file', file);
    const resp = await fetch('/api/match/import', { method: 'POST', body: fd });
    const text = await resp.text();
    if (!resp.ok) throw new Error(text || '上传失败');
    show(text || '上传成功');
    await refresh();
  } catch (e: any) {
    show(e.message || '上传失败', 'error');
  } finally {
    target.value = '';
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

  <div class="max-w-4xl mx-auto p-4" v-else-if="data">
    <div class="mb-4 flex items-center justify-between">
      <NuxtLink to="/admin" class="btn-primary no-underline">返回导航</NuxtLink>
      <NuxtLink to="/" class="btn-home no-underline">返回首页</NuxtLink>
    </div>

    <div class="card p-6 border-l-8 border-l-green-400">
      <div class="flex items-center justify-between mb-4 gap-3">
        <h2 class="font-bold text-xl text-green-600">📝 录入新比分</h2>
        <button type="button" class="btn-upload text-sm" @click="openUploadDialog">📤 上传</button>
        <input ref="uploadInputRef" type="file" accept=".csv,.xls,.xlsx,.xlsm,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" class="hidden" @change="importRecords">
      </div>
      <form @submit.prevent="saveMatch" class="space-y-4">
        <div class="flex flex-wrap gap-3 items-end">
          <div class="flex-1 min-w-[140px]"><label class="text-xs font-bold text-gray-400">日期</label><input v-model="form.date" type="date" class="input-field"></div>
          <div class="flex-1 min-w-[120px]"><label class="text-xs font-bold text-gray-400">组别</label><select v-model="form.group" class="input-field"><option value="">选择组别</option><option v-for="g in data.groups" :key="g" :value="g">{{ g }}</option></select></div>
          <div class="flex-1 min-w-[120px]"><label class="text-xs font-bold text-gray-400">选手1</label><select v-model="form.p1_id" class="input-field"><option value="">组别优先</option><option v-for="p in availablePlayers" :key="p.id" :value="p.id">{{ p.name }}</option></select></div>
          <div class="w-16"><input v-model="form.s1" type="number" class="input-field text-center"></div>
          <div class="font-bold pb-2">:</div>
          <div class="w-16"><input v-model="form.s2" type="number" class="input-field text-center"></div>
          <div class="flex-1 min-w-[120px]"><label class="text-xs font-bold text-gray-400">选手2</label><select v-model="form.p2_id" class="input-field"><option value="">组别优先</option><option v-for="p in availablePlayers" :key="p.id" :value="p.id">{{ p.name }}</option></select></div>
        </div>
        <button class="w-full btn-primary py-3">提交成绩</button>
      </form>
    </div>

    <div class="card p-6 mt-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h2 class="font-bold text-xl">📊 比赛记录</h2>
        <div class="flex flex-wrap gap-2">
          <input v-model="filters.startDate" type="date" class="border rounded p-2 text-sm" title="开始日期">
          <input v-model="filters.endDate" type="date" class="border rounded p-2 text-sm" title="结束日期">
          <input v-model="filters.player" type="text" placeholder="查询球员..." class="border rounded p-2 text-sm w-32">
          <button class="btn-danger text-sm" @click="deleteFilteredMatches">删除比赛</button>
          <a href="/api/match/export" target="_blank" class="btn-success text-sm no-underline">📥 导出CSV</a>
        </div>
      </div>
      <div class="max-h-96 overflow-y-auto"><table class="w-full text-left"><thead class="sticky top-0 bg-white text-xs text-gray-400 border-b"><tr><th class="p-2">日期</th><th class="p-2">对阵</th><th class="p-2 hidden sm:table-cell">组别</th><th class="p-2 text-right">操作</th></tr></thead><tbody>
        <tr v-for="m in filteredMatches" :key="m.id" class="border-b text-sm">
          <td class="p-2 text-gray-500">{{ m.date }}</td>
          <td class="p-2 font-bold">{{ getPlayerName(m.p1_id) }} <span class="text-blue-500">{{ m.s1 }}:{{ m.s2 }}</span> {{ getPlayerName(m.p2_id) }}</td>
          <td class="p-2 text-xs text-gray-400 hidden sm:table-cell">{{ m.group }}</td>
          <td class="p-2 text-right"><button class="text-red-400 font-bold px-2" @click="deleteMatch(m.id)">删除</button></td>
        </tr>
      </tbody></table></div>
    </div>
  </div>
</template>

<style scoped>
.btn-primary { @apply inline-flex items-center justify-center h-[44px] px-6 rounded-xl font-bold text-sm transition-all bg-[#fbbf24] text-[#78350f] shadow-[0_4px_0_#d97706] active:translate-y-[2px] active:shadow-[0_2px_0_#d97706]; }
.btn-home { @apply inline-flex items-center justify-center h-[44px] px-4 rounded-xl font-bold text-sm transition-all bg-[#60a5fa] text-white shadow-[0_4px_0_#2563eb] active:translate-y-[2px] active:shadow-[0_2px_0_#2563eb]; }
.btn-danger { @apply inline-flex items-center justify-center h-[44px] px-4 rounded-xl font-bold text-sm transition-all bg-[#f87171] text-white shadow-[0_4px_0_#b91c1c] active:translate-y-[2px] active:shadow-[0_2px_0_#b91c1c]; }
.btn-success { @apply inline-flex items-center justify-center h-[44px] px-4 rounded-xl font-bold text-sm transition-all bg-[#10b981] text-white shadow-[0_4px_0_#059669] active:translate-y-[2px] active:shadow-[0_2px_0_#059669]; }
.btn-upload { @apply inline-flex items-center justify-center h-[44px] px-4 rounded-xl font-bold text-sm transition-all bg-[#3b82f6] text-white shadow-[0_4px_0_#1d4ed8] active:translate-y-[2px] active:shadow-[0_2px_0_#1d4ed8]; }
.input-field { @apply w-full bg-gray-50 border-2 rounded-lg p-2 h-[44px]; }
.card { @apply bg-white rounded-[20px] shadow-[0_8px_0_#d1d5db] border-2 border-[#f3f4f6]; }
</style>
