<script setup lang="ts">
const { data, refresh } = await useFetch('/api/data');
const { show } = useToast();

const form = reactive({
  title: '',
  notice: '',
  background: ''
});

watchEffect(() => {
  if (data.value) {
    form.title = data.value.settings.title;
    form.notice = data.value.settings.notice;
    form.background = data.value.settings.background;
  }
});

async function save() {
  try {
    await $fetch('/api/admin/settings', {
      method: 'POST',
      body: { type: 'config', ...form }
    });
    show('设置已更新');
    refresh();
  } catch(e) { show('保存失败', 'error'); }
}
</script>

<template>
  <div class="max-w-4xl mx-auto p-4">
    <NuxtLink to="/admin" class="btn-primary mb-4 no-underline">返回导航</NuxtLink>
    <div class="card p-6">
      <h2 class="font-bold text-lg mb-4">⚙️ 网站设置</h2>
      <form @submit.prevent="save" class="grid grid-cols-1 gap-4">
        <div>
          <label class="text-xs font-bold text-gray-400">网站标题</label>
          <input v-model="form.title" type="text" class="w-full p-2 border rounded">
        </div>
        <div>
          <label class="text-xs font-bold text-gray-400">滚动公告</label>
          <input v-model="form.notice" type="text" class="w-full p-2 border rounded">
        </div>
        <div>
          <label class="text-xs font-bold text-gray-400">背景图URL (可选)</label>
          <input v-model="form.background" type="url" class="w-full p-2 border rounded">
        </div>
        <button class="bg-gray-600 text-white py-2 rounded font-bold mt-2 hover:bg-gray-700">保存全局设置</button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.btn-primary { @apply inline-flex items-center justify-center h-[44px] px-6 rounded-xl font-bold text-sm transition-all bg-[#fbbf24] text-[#78350f] shadow-[0_4px_0_#d97706] active:translate-y-[2px] active:shadow-[0_2px_0_#d97706]; }
.card { @apply bg-white rounded-[20px] shadow-[0_8px_0_#d1d5db] border-2 border-[#f3f4f6]; }
</style>