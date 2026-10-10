import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { canScrollSideways, reducedMotion } from './swipe';

/*
 * Свайп между сегментами переключателя в окне («Точное время» / «Промежуток», «Дело» / «Сеанс»): провели пальцем влево —
 * следующий сегмент, вправо — предыдущий. Содержимое окна при этом коротко «подъезжает» с той стороны, откуда пришел новый сегмент.
 * Жест не мешает прокрутке окна вниз, полям ввода и блокам, которые сами прокручиваются вбок.
 */

const DISTANCE = 56;
const DOMINANCE = 1.8;
const MAX_MS = 900;
const NOT_FROM = 'select, [contenteditable]:not([contenteditable="false"]), [data-no-swipe], [data-hscroll]';

/** В поле ввода выделен текст: движение пальца тянет выделение, это не жест */
function selectingInField() {
  const el = document.activeElement;
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? (el.selectionStart ?? 0) !== (el.selectionEnd ?? 0) : false;
}

export interface SegmentSwipe {
  /** Номер выбранного сегмента */
  index: number;
  /** Сколько всего сегментов */
  count: number;
  onIndex: (index: number) => void;
}

/** Свайп по содержимому `ref` переключает сегмент; `swipe` не задан — жест выключен */
export function useSwipeSegments(ref: RefObject<HTMLElement>, swipe?: SegmentSwipe) {
  const live = useRef(swipe);
  useLayoutEffect(() => {
    live.current = swipe;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start: { x: number; y: number; t: number } | null = null;

    const onStart = (e: TouchEvent) => {
      start = null;
      const target = e.target instanceof Element ? e.target : null;
      if (!live.current || e.touches.length !== 1 || !target || target.closest(NOT_FROM)) return;
      for (let n: HTMLElement | null = target as HTMLElement; n && n !== el; n = n.parentElement) {
        if (canScrollSideways(n, -1) || canScrollSideways(n, 1)) return;
      }
      const t = e.touches[0];
      start = { x: t.clientX, y: t.clientY, t: performance.now() };
    };

    const onEnd = (e: TouchEvent) => {
      const s = start;
      start = null;
      const cfg = live.current;
      if (!s || !cfg) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (selectingInField() || Math.abs(dx) < DISTANCE || Math.abs(dx) < Math.abs(dy) * DOMINANCE || performance.now() - s.t > MAX_MS) return;
      const dir = dx < 0 ? 1 : -1;
      const next = cfg.index + dir;
      if (next < 0 || next >= cfg.count) return;
      cfg.onIndex(next);
      if (!reducedMotion()) {
        // Сам переключатель стоит на месте, а то, что под ним, подъезжает
        Array.from(el.children)
          .filter((child) => !child.classList.contains('bk-segments'))
          .forEach((child) =>
            child.animate(
              [{ transform: `translateX(${dir * 32}px)`, opacity: 0.35 }, { transform: 'translateX(0)', opacity: 1 }],
              { duration: 200, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
            ),
          );
      }
    };

    const cancel = () => {
      start = null;
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', cancel, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', cancel);
    };
  }, [ref]);
}
