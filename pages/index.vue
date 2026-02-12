<script setup lang="ts">
// 本文件为页面交互逻辑，所有函数用途均使用中文注释。
import { onBeforeUnmount, onMounted } from 'vue';
import { buildStandings } from '~/shared/utils/ranking';

const { show } = useToast();

// 拉取全量数据（后续在前端筛选与计算）
const { data } = await useFetch('/api/data');

// 前端筛选与展示状态
const filterDate = ref('');
const displayDate = ref('');
const selectedGroup = ref('');
const groupQuery = ref('');
const showGroupOptions = ref(false);
const groupOptionMode = ref<'dropdown' | 'search'>('dropdown');
const groupSelectorRef = ref<HTMLElement | null>(null);

/** 计算各组积分榜数据。 */
const standings = computed(() => {
  if (!data.value) return {};

  const filteredMatches = filterDate.value
    ? data.value.matches.filter(m => m.date === filterDate.value)
    : data.value.matches;

  return buildStandings({
    groups: data.value.groups,
    players: data.value.players,
    matches: filteredMatches,
    rankingRules: data.value.settings.rankingRules,
    rankingRuleEnabled: data.value.settings.rankingRuleEnabled,
  });
});

const groupOptions = computed(() => data.value?.groups ?? []);

/** 按输入关键字过滤组别候选项。 */
const filteredGroupOptions = computed(() => {
  const query = groupQuery.value.trim().toLowerCase();
  if (!query) return groupOptions.value;

  return groupOptions.value.filter(group => group.toLowerCase().includes(query));
});

/** 返回当前应展示的组别列表（下拉/搜索两种模式）。 */
const visibleGroupOptions = computed(() => {
  if (groupOptionMode.value === 'dropdown') return groupOptions.value;
  return filteredGroupOptions.value;
});

/** 当前选中组别对应的积分榜。 */
const displayedStandings = computed(() => {
  if (!selectedGroup.value) return [];
  return standings.value[selectedGroup.value] ?? [];
});

/** 选择组别并同步输入框文本。 */
const selectGroup = (group: string) => {
  selectedGroup.value = group;
  groupQuery.value = group;
  showGroupOptions.value = false;
};

/** 打开组别下拉列表（非搜索模式）。 */
const openGroupOptions = () => {
  groupOptionMode.value = 'dropdown';
  showGroupOptions.value = true;
};

/** 切换组别下拉列表显示状态。 */
const toggleGroupOptions = () => {
  groupOptionMode.value = 'dropdown';
  showGroupOptions.value = !showGroupOptions.value;
};

/** 处理组别输入：进入搜索模式并自动定位可选组。 */
const handleGroupInput = () => {
  groupOptionMode.value = 'search';
  showGroupOptions.value = true;

  const query = groupQuery.value.trim();
  const exactMatch = groupOptions.value.find(group => group === query);
  if (exactMatch) {
    selectedGroup.value = exactMatch;
    return;
  }

  const firstMatch = filteredGroupOptions.value[0];
  if (firstMatch) selectedGroup.value = firstMatch;
};

/** 应用筛选条件并刷新当前展示日期。 */
const applyFilter = () => {
  if (!selectedGroup.value) {
    show('请先选择组别', 'error');
    return;
  }

  if (!filterDate.value) {
    show('请先选择日期', 'error');
    return;
  }

  displayDate.value = filterDate.value;
  show(`已更新 ${selectedGroup.value} 在 ${filterDate.value} 的积分`);
};

/** 重置筛选条件并恢复默认组别。 */
const resetFilter = () => {
  filterDate.value = '';
  displayDate.value = '';

  if (groupOptions.value.length > 0) {
    selectGroup(groupOptions.value[0]);
  }

  show('已恢复默认筛选');
};

/** 点击组件外部时关闭组别下拉框。 */
const handleOutsideClick = (event: MouseEvent) => {
  if (!groupSelectorRef.value) return;
  if (groupSelectorRef.value.contains(event.target as Node)) return;
  showGroupOptions.value = false;
};

watch(
  () => groupOptions.value,
  (groups) => {
    if (!groups.length) {
      selectedGroup.value = '';
      groupQuery.value = '';
      return;
    }

    if (!selectedGroup.value || !groups.includes(selectedGroup.value)) {
      selectGroup(groups[0]);
    }
  },
  { immediate: true }
);

/** 页面挂载后注册全局点击监听。 */
onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
});

/** 页面卸载前移除全局点击监听。 */
onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick);
});

/** 根据后台配置生成页面背景样式。 */
const bgStyle = computed(() => {
  if (data.value?.settings?.background) {
    return {
      backgroundImage: `linear-gradient(160deg, rgba(15,23,42,0.6), rgba(30,64,175,0.25)), url('${data.value.settings.background}')`,
      backgroundSize: 'cover, cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      backgroundRepeat: 'no-repeat',
      backgroundBlendMode: 'soft-light'
    };
  }
  return {};
});
</script>

<template>
  <div class="min-h-screen pb-24" :style="bgStyle">
    <div class="max-w-7xl mx-auto px-3 sm:px-6 pt-8 md:pt-12">
      <!-- 页面头部 -->
      <header class="text-center mb-6 animate-fade-in-down" v-if="data">
        <h1 class="text-4xl md:text-6xl font-black text-white drop-shadow-[0_10px_30px_rgba(15,23,42,0.55)] mb-3 tracking-tight">
          {{ data.settings.title }}
        </h1>
        <div class="inline-block bg-white/90 backdrop-blur-md text-slate-700 px-4 py-2 rounded-full font-bold text-sm border border-white/70 shadow-lg">
          📢 {{ data.settings.notice }}
        </div>
      </header>

      <!-- 积分查看卡片 -->
      <div class="score-viewer-card bg-white/90 backdrop-blur-md rounded-3xl shadow-[0_16px_40px_rgba(30,41,59,0.18)] border border-white/80 p-4 mb-8 mx-auto">
        <div class="text-slate-600 font-bold text-sm text-center mb-3">
          {{ displayDate ? `📅 ${selectedGroup} · ${displayDate} 积分查看` : `📅 积分查看${selectedGroup ? ` · ${selectedGroup}` : ''}` }}
        </div>

        <div class="controls-row">
          <div ref="groupSelectorRef" class="relative control-item group-control">
            <input
              v-model="groupQuery"
              type="text"
              placeholder="输入或选择组别"
              class="field-input pr-11"
              @focus="openGroupOptions"
              @input="handleGroupInput"
            >
            <button type="button" class="group-toggle" @click="toggleGroupOptions">
              ▾
            </button>

            <div
              v-if="showGroupOptions"
              class="absolute z-20 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-auto"
            >
              <button
                v-for="group in visibleGroupOptions"
                :key="group"
                type="button"
                class="group-option"
                @click="selectGroup(group)"
              >
                {{ group }}
              </button>
              <div v-if="visibleGroupOptions.length === 0" class="px-3 py-2 text-sm text-slate-400">
                无匹配组别
              </div>
            </div>
          </div>

          <input
            v-model="filterDate"
            type="date"
            class="field-input control-item date-control"
          >

          <button @click="applyFilter" class="btn-primary control-item">查询</button>
          <button @click="resetFilter" class="btn-danger control-item">全部</button>
        </div>
      </div>

      <!-- 加载态 -->
      <div v-if="!data" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="i in 2" :key="i" class="h-64 bg-gray-200 rounded-3xl animate-pulse"></div>
      </div>

      <!-- 积分榜区域 -->
      <div v-else class="max-w-xl mx-auto">
        <RankingLeaderboardCard
          :group-name="selectedGroup"
          :players="displayedStandings"
        />
      </div>

      <!-- 页面底部 -->
      <div class="text-center mt-12">
        <NuxtLink
          to="/admin"
          class="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-3 rounded-2xl font-bold shadow-[0_10px_30px_rgba(16,185,129,0.4)] inline-block hover:scale-105 hover:brightness-110 transition-all"
        >
          管理后台
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.controls-row {
  @apply flex flex-wrap gap-3 justify-center;
}

.control-item {
  @apply flex-none;
  min-width: 150px;
}

.group-control {
  width: 210px;
}

.date-control {
  width: 150px;
  min-width: 150px;
  max-width: 150px;
  inline-size: 150px;
}

.score-viewer-card {
  width: fit-content;
  max-width: min(100%, 760px);
}

@media (min-width: 768px) {
  .controls-row {
    flex-wrap: nowrap;
    justify-content: flex-start;
  }
}

.btn-primary {
  @apply inline-flex items-center justify-center h-[44px] px-6 rounded-xl font-bold text-sm transition-all bg-gradient-to-r from-amber-300 to-orange-400 text-orange-900 shadow-[0_10px_20px_rgba(251,146,60,0.45)] hover:brightness-105 active:translate-y-[1px];
}

.btn-danger {
  @apply inline-flex items-center justify-center h-[44px] px-4 rounded-xl font-bold text-sm transition-all bg-gradient-to-r from-rose-400 to-red-500 text-white shadow-[0_10px_20px_rgba(244,63,94,0.35)] hover:brightness-105 active:translate-y-[1px];
}

.field-input {
  @apply w-full bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100 outline-none transition-all h-[44px];
}

.group-toggle {
  @apply absolute right-0 top-0 h-[44px] w-10 text-slate-500 hover:text-slate-700;
}

.group-option {
  @apply w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-sky-50 transition-colors;
}
</style>
