<script setup lang="ts">
definePageMeta({ middleware: async (to, from) => {
  // Simple client-side check, real protection is on API
  const auth = useCookie('auth');
  if (!auth.value) return navigateTo('/admin/login');
}});
</script>

<template>
  <div class="max-w-4xl mx-auto p-4 py-8">
    <div class="flex flex-col mb-6">
      <NuxtLink to="/" class="btn-primary self-start mb-4 no-underline">查看首页</NuxtLink>
      <h1 class="text-2xl font-black">🛠️ 管理后台</h1>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <NuxtLink to="/admin/matches" class="card p-6 text-center font-bold text-xl text-green-600 hover:scale-[1.02] transition">
        📝 比赛成绩管理
      </NuxtLink>
      <NuxtLink to="/admin/players-groups" class="card p-6 text-center font-bold text-xl text-blue-500 hover:scale-[1.02] transition">
        👤 球员与组别管理
      </NuxtLink>
      <NuxtLink to="/admin/settings" class="card p-6 text-center font-bold text-xl text-gray-500 hover:scale-[1.02] transition">
        ⚙️ 网站设置
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.btn-primary { 
  @apply inline-flex items-center justify-center h-[44px] px-6 rounded-xl font-bold text-sm transition-all bg-[#fbbf24] text-[#78350f] shadow-[0_4px_0_#d97706] active:translate-y-[2px] active:shadow-[0_2px_0_#d97706];
}
.card {
  @apply bg-white rounded-[20px] shadow-[0_8px_0_#d1d5db] border-2 border-[#f3f4f6];
}
</style>