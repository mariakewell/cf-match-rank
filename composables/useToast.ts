import { useState } from '#imports';

/**
 * 全局 Toast 提示管理。
 * show() 用于追加提示并在 3 秒后自动移除。
 */
export const useToast = () => {
  /** 全局提示队列。 */
  const toasts = useState<{id: number, text: string, type: 'success' | 'error'}[]>('toasts', () => []);

  /** 显示一条提示消息。 */
  const show = (text: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    toasts.value.push({ id, text, type });
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id);
    }, 3000);
  };

  return { toasts, show };
};
