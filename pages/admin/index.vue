<script setup lang="ts">
const auth = useCookie('auth');
</script>

<template>
  <div v-if="!auth" class="min-h-screen flex items-center justify-center bg-gray-100">
    <form action="/api/login" method="POST" class="bg-white p-8 rounded-[20px] shadow-[0_10px_25px_rgba(0,0,0,0.1)] w-[90%] max-w-[350px] text-center">
      <h2 class="mb-5 font-black text-gray-700 text-2xl">🎾 管理登录</h2>
      <input type="password" name="password" placeholder="请输入管理员密码" class="w-full p-3 mb-4 border-2 border-gray-200 rounded-xl outline-none">
      <button class="w-full p-3 bg-blue-500 text-white border-none rounded-xl font-bold">进入管理系统</button>
    </form>
  </div>

  <div class="max-w-4xl mx-auto p-4 py-8" v-else>
    <div class="flex flex-col mb-6"><NuxtLink to="/" class="btn-primary self-start mb-4 no-underline">查看首页</NuxtLink><h1 class="text-2xl font-black">🛠️ 管理后台</h1></div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <NuxtLink to="/admin/matches" class="card p-6 text-center font-bold text-xl text-green-600">📝 比赛成绩管理</NuxtLink>
      <NuxtLink to="/admin/players-groups" class="card p-6 text-center font-bold text-xl text-blue-500">👤 球员与组别管理</NuxtLink>
      <NuxtLink to="/admin/settings" class="card p-6 text-center font-bold text-xl text-gray-500">⚙️ 网站设置</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.btn-primary { @apply inline-flex items-center justify-center h-[44px] px-6 rounded-xl font-bold text-sm transition-all bg-[#fbbf24] text-[#78350f] shadow-[0_4px_0_#d97706] active:translate-y-[2px] active:shadow-[0_2px_0_#d97706]; }
.card { @apply bg-white rounded-[20px] shadow-[0_8px_0_#d1d5db] border-2 border-[#f3f4f6]; }
</style>
