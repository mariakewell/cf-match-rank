<script setup lang="ts">
const props = withDefaults(defineProps<{
  startDate: string;
  endDate: string;
  placeholder?: string;
  inputClass?: string;
}>(), {
  placeholder: '选择日期范围',
  inputClass: '',
});

const emit = defineEmits<{
  'update:startDate': [value: string];
  'update:endDate': [value: string];
}>();

interface FlatpickrInstance {
  selectedDates: Date[];
  calendarContainer?: HTMLElement;
  setDate: (dates: string[] | Date[], triggerChange?: boolean, format?: string) => void;
  clear: (emitChangeEvent?: boolean, toInitial?: boolean) => void;
  formatDate: (dateObj: Date, frmt: string) => string;
  close: () => void;
  destroy: () => void;
}

type FlatpickrFn = (
  element: HTMLElement,
  options: Record<string, unknown>,
) => FlatpickrInstance;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ASSET_TIMEOUT_MS = 10000;

const inputRef = ref<HTMLInputElement | null>(null);
let picker: FlatpickrInstance | null = null;
let removeDayDoubleClickListener: (() => void) | null = null;
let removeClearButtonListener: (() => void) | null = null;
let bindPanelTimer: ReturnType<typeof setTimeout> | null = null;
let selectionTipElement: HTMLSpanElement | null = null;

const START_DATE_TIP = '请选择开始日期';
const END_DATE_TIP = '请选择结束日期';

const isValidYmd = (value: string) => {
  if (!DATE_RE.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
};

const getModelDates = () => {
  const startDate = isValidYmd(props.startDate) ? props.startDate : '';
  const endDate = isValidYmd(props.endDate) ? props.endDate : '';

  if (startDate && endDate && endDate < startDate) {
    return [endDate, startDate] as const;
  }

  return [startDate, endDate] as const;
};

const withTimeout = (promise: Promise<void>, label: string) => {
  return Promise.race([
    promise,
    new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} 加载超时`)), ASSET_TIMEOUT_MS);
    }),
  ]);
};

const ensureStyle = () => {
  if (document.querySelector('link[data-flatpickr-css="true"]')) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css';
  link.dataset.flatpickrCss = 'true';
  document.head.appendChild(link);
};

const loadScript = (selector: string, src: string, datasetKey: string) => {
  const existingScript = document.querySelector<HTMLScriptElement>(selector);
  if (existingScript) {
    if (existingScript.dataset.loaded === 'true') {
      return Promise.resolve();
    }

    return withTimeout(new Promise<void>((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error(`${src} 加载失败`)), { once: true });
    }), src);
  }

  return withTimeout(new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset[datasetKey] = 'true';
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => reject(new Error(`${src} 加载失败`)), { once: true });
    document.head.appendChild(script);
  }), src);
};

const ensureFlatpickrAssets = async () => {
  if (!import.meta.client) return false;

  ensureStyle();

  const win = window as typeof window & {
    flatpickr?: FlatpickrFn & { l10ns?: { zh?: unknown } };
  };

  if (!win.flatpickr) {
    await loadScript('script[data-flatpickr-core="true"]', 'https://cdn.jsdelivr.net/npm/flatpickr', 'flatpickrCore');
  }

  if (!win.flatpickr?.l10ns?.zh) {
    await loadScript('script[data-flatpickr-locale-zh="true"]', 'https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/zh.js', 'flatpickrLocaleZh');
  }

  return !!win.flatpickr;
};

const applyModelToPicker = () => {
  if (!picker) return;

  const [startDate, endDate] = getModelDates();
  const nextDates = [startDate, endDate].filter(Boolean);
  const currentDates = picker.selectedDates
    .map((date) => picker?.formatDate(date, 'Y-m-d') || '')
    .filter(Boolean);

  if (nextDates.length === currentDates.length && nextDates.every((value, index) => value === currentDates[index])) {
    return;
  }

  if (nextDates.length === 0) {
    picker.clear(false);
    return;
  }

  picker.setDate(nextDates, false, 'Y-m-d');
};

const bindDayDoubleClick = () => {
  if (!picker?.calendarContainer) return;

  removeDayDoubleClickListener?.();

  const handleDayDoubleClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const dayElement = target.closest('.flatpickr-day');
    if (!(dayElement instanceof HTMLElement)) return;
    if (dayElement.classList.contains('flatpickr-disabled')) return;

    const dayDate = (dayElement as HTMLElement & { dateObj?: Date }).dateObj;
    if (!(dayDate instanceof Date) || !Number.isFinite(dayDate.getTime()) || !picker) return;

    const ymd = picker.formatDate(dayDate, 'Y-m-d');
    picker.setDate([ymd, ymd], true, 'Y-m-d');
    picker.close();
  };

  picker.calendarContainer.addEventListener('dblclick', handleDayDoubleClick);
  removeDayDoubleClickListener = () => {
    picker?.calendarContainer?.removeEventListener('dblclick', handleDayDoubleClick);
  };
};

const bindClearButton = () => {
  if (!picker?.calendarContainer) return;

  removeClearButtonListener?.();

  const calendar = picker.calendarContainer;
  let actionContainer = calendar.querySelector<HTMLElement>('.flatpickr-panel-actions');
  if (!actionContainer) {
    actionContainer = document.createElement('div');
    actionContainer.className = 'flatpickr-panel-actions';
    calendar.appendChild(actionContainer);
  }

  let selectionTip = actionContainer.querySelector<HTMLSpanElement>('.flatpickr-selection-tip');
  if (!selectionTip) {
    selectionTip = document.createElement('span');
    selectionTip.className = 'flatpickr-selection-tip';
    actionContainer.appendChild(selectionTip);
  }
  selectionTipElement = selectionTip;

  let clearButton = actionContainer.querySelector<HTMLButtonElement>('.flatpickr-clear-btn');
  if (!clearButton) {
    clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'flatpickr-clear-btn';
    clearButton.textContent = '清空';
    actionContainer.appendChild(clearButton);
  }

  const handleClearClick = () => {
    if (!picker) return;
    picker.clear(true);
    picker.close();
  };

  clearButton.addEventListener('click', handleClearClick);
  removeClearButtonListener = () => {
    clearButton?.removeEventListener('click', handleClearClick);
  };
};

const updateSelectionTip = () => {
  if (!selectionTipElement || !picker) return;

  const validDates = picker.selectedDates.filter((date) => Number.isFinite(date.getTime()));
  selectionTipElement.textContent = validDates.length === 1 ? END_DATE_TIP : START_DATE_TIP;
};

const bindPanelEnhancements = () => {
  bindDayDoubleClick();
  bindClearButton();
  updateSelectionTip();
};

const scheduleBindPanelEnhancements = (attempt = 0) => {
  if (!picker?.calendarContainer) return;

  bindPanelTimer && clearTimeout(bindPanelTimer);

  const calendar = picker.calendarContainer;
  const isPanelReady = !!calendar.querySelector('.flatpickr-days');
  if (isPanelReady || attempt >= 8) {
    bindPanelEnhancements();
    bindPanelTimer = null;
    return;
  }

  bindPanelTimer = setTimeout(() => {
    scheduleBindPanelEnhancements(attempt + 1);
  }, 16);
};

onMounted(async () => {
  if (!inputRef.value) return;

  const isReady = await ensureFlatpickrAssets();
  const flatpickr = (window as typeof window & { flatpickr?: FlatpickrFn }).flatpickr;
  if (!isReady || !flatpickr) return;

  picker = flatpickr(inputRef.value, {
    mode: 'range',
    dateFormat: 'Y-m-d',
    allowInput: false,
    disableMobile: true,
    locale: 'zh',
    onChange: (selectedDates: Date[]) => {
      const validDates = selectedDates.filter((date) => Number.isFinite(date.getTime()));
      if (validDates.length === 0) {
        emit('update:startDate', '');
        emit('update:endDate', '');
        updateSelectionTip();
        return;
      }

      const startDate = picker?.formatDate(validDates[0], 'Y-m-d') || '';
      const endDate = validDates[1]
        ? picker?.formatDate(validDates[1], 'Y-m-d') || ''
        : '';
      emit('update:startDate', startDate);
      emit('update:endDate', endDate);
      updateSelectionTip();
    },
    onReady: () => {
      scheduleBindPanelEnhancements();
    },
    onOpen: () => {
      scheduleBindPanelEnhancements();
    },
    onMonthChange: () => {
      scheduleBindPanelEnhancements();
    },
    onYearChange: () => {
      scheduleBindPanelEnhancements();
    },
  });

  applyModelToPicker();
});

watch(() => [props.startDate, props.endDate], () => {
  applyModelToPicker();
  updateSelectionTip();
});

onBeforeUnmount(() => {
  removeDayDoubleClickListener?.();
  removeDayDoubleClickListener = null;
  removeClearButtonListener?.();
  removeClearButtonListener = null;
  if (bindPanelTimer) {
    clearTimeout(bindPanelTimer);
    bindPanelTimer = null;
  }
  selectionTipElement = null;
  picker?.destroy();
  picker = null;
});
</script>

<template>
  <input
    ref="inputRef"
    type="text"
    :placeholder="placeholder"
    :class="inputClass"
    readonly
  >
</template>

<style>
.flatpickr-calendar .flatpickr-panel-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 40px;
  padding: 8px;
  border-top: 1px solid #e5e7eb;
}

.flatpickr-calendar .flatpickr-selection-tip {
  color: #6b7280;
  font-size: 12px;
  line-height: 1;
}

.flatpickr-calendar .flatpickr-clear-btn {
  border: 1px solid #d1d5db;
  background: #fff;
  color: #374151;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1;
  padding: 6px 10px;
  cursor: pointer;
}

.flatpickr-calendar .flatpickr-clear-btn:hover {
  background: #f3f4f6;
}
</style>
