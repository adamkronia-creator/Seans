import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLayer } from './layer';
import { canScrollSideways, edgeTouch } from './swipe';

/*
 * Свайп в сторону как «назад» на экранах, где листать больше нечего (настройка теста, бланк, пример заключения):
 * провели пальцем влево — вернулись на шаг, так же, как по стрелке в шапке. Жест от левого края (utils/edgeBack.ts) остается.
 * Жест не мешает прокрутке вниз (нужно явно горизонтальное движение), полям ввода, окнам и блокам, которые сами
 * прокручиваются вбок.
 */

/** Сколько пройти пальцем влево, чтобы это считалось «назад» */
const DISTANCE = 72;
/** Горизонтальное движение должно сильно перевешивать вертикальное: иначе это прокрутка с дрожанием пальца */
const DOMINANCE = 1.8;
/** Дольше этого движение уже не жест, а медленное перетаскивание */
const MAX_MS = 900;

const NOT_FROM = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [data-no-swipe], [data-hscroll], .sheet, [role="dialog"]';

/** Пока `enabled`, свайп влево внутри `scope` (селектор экрана) вызывает `onBack` */
export function useSwipeBack(scope: string, enabled: boolean, onBack: () => void) {
  const { top } = useLayer();
  const live = useRef({ enabled, onBack });
  useLayoutEffect(() => {
    live.current = { enabled: enabled && top, onBack };
  });

  useEffect(() => {
    let start: { x: number; y: number; t: number } | null = null;

    const onStart = (e: TouchEvent) => {
      start = null;
      if (!live.current.enabled || e.touches.length !== 1 || edgeTouch.active) return;
      const target = e.target instanceof Element ? e.target : null;
      const root = target?.closest(scope);
      if (!target || !root || target.closest(NOT_FROM)) return;
      // Блок, который ещё можно прокрутить влево, сам заберет движение
      for (let n: HTMLElement | null = target as HTMLElement; n && n !== root; n = n.parentElement) {
        if (canScrollSideways(n, -1)) return;
      }
      const t = e.touches[0];
      start = { x: t.clientX, y: t.clientY, t: performance.now() };
    };

    const onEnd = (e: TouchEvent) => {
      const s = start;
      start = null;
      if (!s || !live.current.enabled) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      const selecting = window.getSelection()?.isCollapsed === false;
      if (dx <= -DISTANCE && Math.abs(dx) > Math.abs(dy) * DOMINANCE && performance.now() - s.t < MAX_MS && !selecting) {
        live.current.onBack();
      }
    };

    const cancel = () => {
      start = null;
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', cancel, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', cancel);
    };
  }, [scope]);
}
