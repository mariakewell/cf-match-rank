<script setup lang="ts">
// 本文件为页面交互逻辑，所有函数用途均使用中文注释。
import { Loader2 } from 'lucide-vue-next';

interface Player { id: number; name: string; groups: string[] }

const props = defineProps<{
  groups: string[];
  players: Player[];
}>();

const emit = defineEmits(['saved']);

const isLoading = ref(false);
const formData = reactive({
  date: new Date().toISOString().split('T')[0],
  group: '',
  p1_id: '' as string | number,
  p2_id: '' as string | number,
  s1: 4,
  s2: 0,
});

/** 根据已选组别返回可选球员。 */
const availablePlayers = computed(() => {
  if (!formData.group) return [];
  return props.players.filter((p) => p.groups.includes(formData.group));
});

/** 校验表单是否可提交。 */
const isValid = computed(() => formData.group && formData.p1_id && formData.p2_id && formData.p1_id !== formData.p2_id);

// 提交比分表单并触发父组件刷新。
async function submit() {
  if (!isValid.value) return;
  isLoading.value = true;

  try {
    const fd = new FormData();
    Object.entries(formData).forEach(([k, v]) => fd.append(k, String(v)));
    await $fetch('/api/match/save', { method: 'POST', body: fd });
    emit('saved');
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
    <h2 class="font-bold text-xl text-gray-800 mb-6">📝 录入新比分</h2>

    <form @submit.prevent="submit" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="space-y-1">
          <label class="text-xs font-bold text-gray-500">日期</label>
          <input v-model="formData.date" type="date" class="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-3 py-2.5" />
        </div>

        <div class="space-y-1">
          <label class="text-xs font-bold text-gray-500">组别</label>
          <select v-model="formData.group" class="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-3 py-2.5">
            <option value="" disabled>选择组别</option>
            <option v-for="g in groups" :key="g" :value="g">{{ g }}</option>
          </select>
        </div>
      </div>

      <div class="bg-gray-50 rounded-2xl p-4 border border-gray-200">
        <div class="flex flex-col md:flex-row items-center gap-4 justify-between">
          <div class="flex-1 w-full space-y-2">
            <select v-model="formData.p1_id" :disabled="!formData.group" class="w-full bg-white border-2 border-gray-200 rounded-xl px-3 py-3">
              <option value="" disabled>选手1</option>
              <option v-for="p in availablePlayers" :key="p.id" :value="p.id" :disabled="p.id === formData.p2_id">{{ p.name }}</option>
            </select>
            <input v-model.number="formData.s1" type="number" class="w-full text-center text-3xl font-black text-blue-600 bg-white border-2 border-gray-200 rounded-xl py-2" />
          </div>

          <div class="text-gray-400 font-black text-2xl hidden md:block">VS</div>

          <div class="flex-1 w-full space-y-2">
            <select v-model="formData.p2_id" :disabled="!formData.group" class="w-full bg-white border-2 border-gray-200 rounded-xl px-3 py-3">
              <option value="" disabled>选手2</option>
              <option v-for="p in availablePlayers" :key="p.id" :value="p.id" :disabled="p.id === formData.p1_id">{{ p.name }}</option>
            </select>
            <input v-model.number="formData.s2" type="number" class="w-full text-center text-3xl font-black text-red-500 bg-white border-2 border-gray-200 rounded-xl py-2" />
          </div>
        </div>
      </div>

      <button type="submit" :disabled="!isValid || isLoading" class="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg transition-all disabled:opacity-50 flex justify-center items-center gap-2">
        <Loader2 v-if="isLoading" class="animate-spin w-5 h-5" />
        <span v-else>提交成绩</span>
      </button>
    </form>
  </div>
</template>
