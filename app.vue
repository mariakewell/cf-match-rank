<template>
  <div class="font-sans antialiased text-gray-900 bg-[#e6f5e6] min-h-screen selection:bg-orange-200 selection:text-orange-900">
    <NuxtLoadingIndicator color="#f97316" />
    <UiToast />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@300;400;500;600;700&display=swap');

body {
  font-family: 'Fredoka', sans-serif;
  background-color: #e6f5e6;
}

/* Page Transition */
.page-enter-active,
.page-leave-active {
  transition: all 0.3s ease-out;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>