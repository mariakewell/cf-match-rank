<script setup lang="ts">
// 本文件为页面交互逻辑，所有函数用途均使用中文注释。
const auth = useCookie('auth');
const { data, refresh } = await useFetch('/api/data');
const { show } = useToast();

const form = reactive({ title: '', notice: '', background: '' });
/** 当远端设置变化时，同步到本地编辑表单。 */
watchEffect(() => {
  if (data.value) {
    form.title = data.value.settings.title;
    form.notice = data.value.settings.notice;
    form.background = data.value.settings.background;
  }
});

// 保存全局设置。
async function save() {
  const fd = new FormData();
  fd.append('title', form.title);
  fd.append('notice', form.notice);
  fd.append('background', form.background);
  const resp = await fetch('/api/settings', { method: 'POST', body: fd });
  const text = await resp.text();
  if (resp.ok) {
    show(text || '设置已更新');
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
    <NuxtLink to="/admin" class="btn-primary mb-4 no-underline">返回导航</NuxtLink>
    <div class="card p-6" v-if="data"><h2 class="font-bold text-lg mb-4">⚙️ 网站设置</h2>
      <form @submit.prevent="save" class="grid grid-cols-1 gap-4">
        <div><label class="text-xs font-bold text-gray-400">网站标题</label><input v-model="form.title" type="text" class="w-full p-2 border rounded"></div>
        <div><label class="text-xs font-bold text-gray-400">滚动公告</label><input v-model="form.notice" type="text" class="w-full p-2 border rounded"></div>
        <div><label class="text-xs font-bold text-gray-400">背景图URL (可选)</label><input v-model="form.background" type="url" class="w-full p-2 border rounded"></div>
        <button class="bg-gray-600 text-white py-2 rounded font-bold mt-2">保存全局设置</button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.btn-primary { @apply inline-flex items-center justify-center h-[44px] px-6 rounded-xl font-bold text-sm transition-all bg-[#fbbf24] text-[#78350f] shadow-[0_4px_0_#d97706] active:translate-y-[2px] active:shadow-[0_2px_0_#d97706]; }
.card { @apply bg-white rounded-[20px] shadow-[0_8px_0_#d1d5db] border-2 border-[#f3f4f6]; }
</style>
