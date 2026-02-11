<script setup lang="ts">
const password = ref('');
const error = ref('');
const router = useRouter();

async function login() {
  try {
    await $fetch('/api/login', {
      method: 'POST',
      body: { password: password.value }
    });
    router.push('/admin');
  } catch (e) {
    error.value = '密码错误';
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 font-sans">
    <div class="bg-white p-8 rounded-[20px] shadow-[0_10px_25px_rgba(0,0,0,0.1)] w-[90%] max-w-[350px] text-center">
      <h2 class="mb-5 font-black text-gray-700 text-2xl">🎾 管理登录</h2>
      <form @submit.prevent="login">
        <input 
          v-model="password"
          type="password" 
          placeholder="请输入管理员密码" 
          class="w-full p-3 mb-4 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-400"
        >
        <div v-if="error" class="text-red-500 text-sm mb-4 font-bold">{{ error }}</div>
        <button class="w-full p-3 bg-blue-500 text-white border-none rounded-xl font-bold cursor-pointer hover:bg-blue-600 transition">
          进入管理系统
        </button>
      </form>
    </div>
  </div>
</template>