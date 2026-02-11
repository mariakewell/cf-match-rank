<script setup lang="ts">
import type { PropType } from 'vue';

interface PlayerStat {
  id: number;
  name: string;
  score: number;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
}

defineProps({
  groupName: { type: String, required: true },
  players: { type: Array as PropType<PlayerStat[]>, required: true }
});
</script>

<template>
  <div class="card overflow-hidden">
    <div class="bg-blue-500 p-4 border-b-4 border-orange-600">
      <h2 class="text-white font-black text-xl flex items-center gap-2">🎾 {{ groupName }}</h2>
    </div>

    <div>
      <NuxtLink
        v-for="(player, idx) in players"
        :key="player.id"
        :to="`/player/${player.id}`"
        class="flex items-center justify-between p-3 border-b border-gray-100 hover:bg-yellow-50 transition cursor-pointer no-underline"
      >
        <div class="flex items-center gap-3">
          <div v-if="idx === 0" class="text-2xl">🥇</div>
          <div v-else-if="idx === 1" class="text-2xl">🥈</div>
          <div v-else-if="idx === 2" class="text-2xl">🥉</div>
          <div v-else class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">{{ idx + 1 }}</div>
          <div>
            <div class="font-bold text-lg text-gray-750">{{ player.name }}</div>
            <div class="text-sm font-bold text-gray-400">
              <span style="font-family: monospace;">{{ player.matches }}</span>场比赛
              <span style="font-family: monospace; color: #16a34a;">{{ player.wins }}</span>胜
              <span style="font-family: monospace; color: #6b7280;">{{ player.draws }}</span>平
              <span style="font-family: monospace; color: #dc2626;">{{ player.losses }}</span>负
            </div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-2xl font-black text-blue-500">{{ player.score }}</div>
          <div class="text-[10px] text-gray-400 font-bold">积分</div>
        </div>
      </NuxtLink>

      <div v-if="players.length === 0" class="p-6 text-center text-gray-400">暂无选手</div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: white;
  border-radius: 20px;
  box-shadow: 0 8px 0 #d1d5db;
  border: 2px solid #f3f4f6;
  width: 100%;
  overflow: hidden;
}
</style>
