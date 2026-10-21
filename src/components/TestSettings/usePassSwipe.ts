import { useRef, type TouchEvent } from 'react';

/*
 * Свайп по экрану прохождения (теста и задания): влево — дальше, вправо — назад. Засчитывается по отпусканию: от 60 px и с перевесом
 * по горизонтали в 1,8 раза — это не навигация между экранами, а листание шагов внутри одного (общие пороги swipe.ts для него жёстче:
 * вопрос с ответами нельзя пролистать случайным движением при прокрутке). От левого края жест остаётся «назад» из экрана (edgeBack),
 * в полях ввода, ползунках и там, где помечено data-no-swipe, не работает.
 * Что значит «дальше» и «назад» (можно ли без ответа, есть ли ещё шаг), решает экран.
 */
const MIN_DX = 60;
const DOMINANCE = 1.8;
const EDGE = 28;

export function usePassSwipe(enabled: boolean, onSwipe: (dir: 'next' | 'prev') => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const live = useRef({ enabled, onSwipe });
  live.current = { enabled, onSwipe };

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    const blocked = (e.target as Element).closest('input, textarea, select, [data-no-swipe]') || t.clientX < EDGE;
    start.current = e.touches.length === 1 && !blocked ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    const s = start.current;
    start.current = null;
    if (!s || !live.current.enabled) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) < MIN_DX || Math.abs(dx) < Math.abs(dy) * DOMINANCE) return;
    live.current.onSwipe(dx < 0 ? 'next' : 'prev');
  };
  return { onTouchStart, onTouchEnd };
}
