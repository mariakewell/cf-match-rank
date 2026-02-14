<script setup lang="ts">
const { data } = await useFetch('/api/data');

useHead(() => {
  const favicon = data.value?.settings?.favicon?.trim();
  return {
    link: favicon
      ? [{ rel: 'icon', href: favicon, type: 'image/png' }]
      : [],
  };
});
</script>

<!-- 中文注释说明：应用根组件，负责挂载页面、布局与全局提示组件。 -->
<template>
  <div class="font-sans antialiased text-gray-900 min-h-screen selection:bg-orange-200 selection:text-orange-900">
    <NuxtLoadingIndicator color="#f97316" />
    <UiToast />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600&display=swap');

body {
  font-family: 'Fredoka', sans-serif;
  background: radial-gradient(circle at top, #eefbf5 0%, #dbeafe 42%, #f8fafc 100%);
  min-height: 100vh;
  margin: 0;
  padding: 0;
  color: #374151;
}

.rank-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
  gap: 1.5rem;
  justify-content: center;
  align-items: start;
}

@media (max-width: 640px) {
  .rank-grid {
    gap: 1rem;
  }
}
</style>
