import { useState } from '#imports';

export const useToast = () => {
  const toasts = useState<{id: number, text: string, type: 'success' | 'error'}[]>('toasts', () => []);
  
  const show = (text: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    toasts.value.push({ id, text, type });
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id);
    }, 3000);
  };

  return { toasts, show };
};