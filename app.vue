<template>
  <div class="app-shell font-sans antialiased text-gray-900 selection:bg-orange-200 selection:text-orange-900">
    <NuxtLoadingIndicator color="#f97316" />
    <UiToast />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600&display=swap');

html,
body,
#__nuxt {
  min-height: 100%;
}

body {
  margin: 0;
  font-family: 'Fredoka', sans-serif;
  background-color: #e6f5e6;
  color: #374151;
}

.app-shell {
  min-height: 100dvh;
  background-color: #e6f5e6;
  padding: 1rem;
}

.rank-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
  gap: 1.25rem;
  justify-content: center;
  align-items: start;
}

@media (max-width: 640px) {
  .app-shell {
    padding: 0.5rem;
  }

  .rank-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
}
</style>
