import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLayer } from './layer';
import { canScrollSideways, edgeTouch, SWIPE_DOMINANCE, swipeCommits, VelocityTracker } from './swipe';

/*
 * Свайп в сторону как «назад» на экранах, где листать больше нечего (настройка теста, бланк, пример заключения):
 * провели пальцем вправо — вернулись на шаг, так же, как по стрелке в шапке. Жест от левого края (utils/edgeBack.ts) остается.
 * Жест не мешает прокрутке вниз (нужно явно горизонтальное движение), полям ввода, окнам и блокам, которые сами
 * прокручиваются вбок.
 */

/* Пороги общие для всех свайпов (utils/swipe.ts): перевес над вертикальным 1,2, засчитывается 30% ширины экрана с учётом скорости */

// Кнопки-переключатели (радио, флажки) жест не блокируют: они занимают целые строки бланка
const NOT_FROM = 'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]), textarea, select, [contenteditable]:not([contenteditable="false"]), [data-no-swipe], [data-swipe-lock~="right"], [data-hscroll], .sheet, [role="dialog"]';

/** Пока `enabled`, свайп вправо внутри `scope` (селектор экрана) вызывает `onBack` */
export function useSwipeBack(scope: string, enabled: boolean, onBack: () => void) {
  const { top } = useLayer();
  const live = useRef({ enabled, onBack });
  useLayoutEffect(() => {
    live.current = { enabled: enabled && top, onBack };
  });

  useEffect(() => {
    let start: { x: number; y: number; t: number } | null = null;
    // Скорость по последним касаниям, как у остальных жестов: быстрый короткий взмах тоже засчитывается
    let speed = new VelocityTracker();

    const onStart = (e: TouchEvent) => {
      start = null;
      if (!live.current.enabled || e.touches.length !== 1 || edgeTouch.active) return;
      const target = e.target instanceof Element ? e.target : null;
      const root = target?.closest(scope);
      if (!target || !root || target.closest(NOT_FROM)) return;
      // Блок, который ещё можно прокрутить вправо (палец идет вправо — содержимое уезжает влево к началу), сам заберет движение
      for (let n: HTMLElement | null = target as HTMLElement; n && n !== root; n = n.parentElement) {
        if (canScrollSideways(n, 1)) return;
      }
      const t = e.touches[0];
      start = { x: t.clientX, y: t.clientY, t: performance.now() };
      speed = new VelocityTracker();
      speed.push(start.t, t.clientX);
    };

    const onMove = (e: TouchEvent) => {
      if (start) speed.push(performance.now(), e.touches[0].clientX);
    };

    const onEnd = (e: TouchEvent) => {
      const s = start;
      start = null;
      if (!s || !live.current.enabled) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      const selecting = window.getSelection()?.isCollapsed === false;
      if (dx > 0 && Math.abs(dx) > Math.abs(dy) * SWIPE_DOMINANCE && swipeCommits(dx, speed.velocity(performance.now())) && !selecting) {
        live.current.onBack();
      }
    };

    const cancel = () => {
      start = null;
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', cancel, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', cancel);
    };
  }, [scope]);
}
