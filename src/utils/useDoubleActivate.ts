import { useRef, type PointerEvent } from 'react';

/**
 * Двойной клик мышью или двойное касание на элементе (без кнопок и полей внутри).
 * Считаем сами по pointerup: так работает и на телефоне, где dblclick приходит не везде.
 */
export function useDoubleActivate(onActivate: () => void) {
  const last = useRef<{ t: number; x: number; y: number } | null>(null);

  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, a, input, textarea, select')) {
      last.current = null;
      return;
    }
    const prev = last.current;
    const now = { t: e.timeStamp, x: e.clientX, y: e.clientY };
    if (prev && now.t - prev.t < 350 && Math.hypot(now.x - prev.x, now.y - prev.y) < 24) {
      last.current = null;
      // Двойной клик выделяет слово: снимаем выделение, открывается редактор
      window.getSelection()?.removeAllRanges();
      onActivate();
    } else {
      last.current = now;
    }
  };

  return { onPointerUp };
}
