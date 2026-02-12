<script setup lang="ts">
// 本文件为页面交互逻辑，所有函数用途均使用中文注释。
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
    <div class="bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-600 p-5 border-b border-white/30">
      <h2 class="text-white font-black text-2xl flex items-center gap-2 tracking-wide">🎾 {{ groupName }}</h2>
    </div>

    <div>
      <NuxtLink
        v-for="(player, idx) in players"
        :key="player.id"
        :to="`/player/${player.id}`"
        class="flex items-center justify-between px-4 py-4 border-b border-slate-100 hover:bg-sky-50/60 transition-all cursor-pointer no-underline"
      >
        <div class="flex items-center gap-3">
          <div v-if="idx === 0" class="text-2xl">🥇</div>
          <div v-else-if="idx === 1" class="text-2xl">🥈</div>
          <div v-else-if="idx === 2" class="text-2xl">🥉</div>
          <div v-else class="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">{{ idx + 1 }}</div>
          <div>
            <div class="font-bold text-lg text-slate-800">{{ player.name }}</div>
            <div class="text-sm font-bold text-slate-500">
              <span style="font-family: monospace;">{{ player.matches }}</span>场比赛
              <span style="font-family: monospace; color: #16a34a;">{{ player.wins }}</span>胜
              <span style="font-family: monospace; color: #6b7280;">{{ player.draws }}</span>平
              <span style="font-family: monospace; color: #dc2626;">{{ player.losses }}</span>负
            </div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-3xl leading-none font-black text-blue-600">{{ player.score }}</div>
          <div class="text-[11px] text-slate-400 font-bold tracking-widest mt-1">积分</div>
        </div>
      </NuxtLink>

      <div v-if="players.length === 0" class="p-8 text-center text-slate-400">暂无选手</div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.75);
  width: 100%;
  max-width: 480px;
  margin-inline: auto;
  overflow: hidden;
}
</style>
