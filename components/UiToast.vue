<script setup lang="ts">
// 本文件为页面交互逻辑，所有函数用途均使用中文注释。
const { toasts } = useToast();
</script>

<template>
  <div class="fixed top-5 right-5 z-[9999] flex flex-col gap-2">
    <TransitionGroup name="toast">
      <div 
        v-for="toast in toasts" 
        :key="toast.id"
        class="min-w-[200px] px-6 py-3 rounded-2xl text-white font-bold shadow-lg flex items-center gap-2"
        :class="toast.type === 'success' ? 'bg-green-500 border-2 border-green-600' : 'bg-red-500 border-2 border-red-600'"
      >
        <span>{{ toast.type === 'success' ? '✅' : '❌' }}</span>
        {{ toast.text }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>