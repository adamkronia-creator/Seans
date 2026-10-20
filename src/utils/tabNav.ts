import { useEffect, useRef, type RefObject } from 'react';
import type { TabId } from '../components/TabBar/TabBar';
import type { TransitionKind } from './transition';
import { edgeTouch, SWIPE_DOMINANCE, SWIPE_SLOP, swipeCommits, VelocityTracker } from './swipe';

/** Переключатель разделов нижней панели: его регистрирует App, а жесты экранов вызывают switchTab */
let handler: ((id: TabId, kind?: TransitionKind) => void) | null = null;
export const registerTabSwitch = (fn: (id: TabId, kind?: TransitionKind) => void) => {
  handler = fn;
};
/** Перейти в раздел; `kind` — как показать переход (по свайпу экраны едут вместе: slide-next влево, slide-prev вправо) */
export const switchTab = (id: TabId, kind?: TransitionKind) => handler?.(id, kind);

const NOT_FROM = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [data-no-swipe], [data-hscroll]';

/**
 * Свайп по экрану раздела переключает раздел: вправо ведёт к предыдущему (dir = 'right'), влево к следующему ('left').
 * Касание у левого края принадлежит жесту «назад» и сюда не попадает; в полях ввода и в блоках с боковой прокруткой жест их собственный.
 */
export function useTabSwipe(ref: RefObject<HTMLElement>, dir: 'left' | 'right', target: TabId) {
  useSwipeAction(ref, dir, () => switchTab(target, dir === 'right' ? 'slide-prev' : 'slide-next'), 24);
}

/**
 * Запасной свайп «назад» для экрана с полями ввода: вправо с любого места, кроме самих полей. Жест у края с перетаскиванием экрана
 * (utils/edgeBack.ts) остаётся главным; сюда попадает всё, что он не взял (палец начал не у края, касание пришлось рядом с полем).
 */
export function useSwipeBack(ref: RefObject<HTMLElement>, back: () => void) {
  useSwipeAction(ref, 'right', back, 0);
}

function useSwipeAction(ref: RefObject<HTMLElement>, dir: 'left' | 'right', action: () => void, minX: number) {
  // Действие читается в момент жеста: новая функция на каждой отрисовке не должна пересоздавать подписку посреди касания
  const act = useRef(action);
  act.current = action;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sign = dir === 'right' ? 1 : -1;
    let g: { id: number; x: number; y: number; live: boolean; tracker: VelocityTracker } | null = null;

    const down = (e: PointerEvent) => {
      if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const origin = e.target instanceof Element ? e.target : null;
      if (!origin || origin.closest(NOT_FROM) || e.clientX < minX || edgeTouch.active) return;
      g = { id: e.pointerId, x: e.clientX, y: e.clientY, live: true, tracker: new VelocityTracker() };
      g.tracker.push(e.timeStamp, e.clientX);
    };
    const move = (e: PointerEvent) => {
      if (!g || e.pointerId !== g.id || !g.live) return;
      g.tracker.push(e.timeStamp, e.clientX);
      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      if (Math.abs(dy) > SWIPE_SLOP && Math.abs(dy) * SWIPE_DOMINANCE > Math.abs(dx)) g.live = false; // это прокрутка
    };
    const up = (e: PointerEvent) => {
      const s = g;
      g = null;
      if (!s || e.pointerId !== s.id || !s.live) return;
      const dx = (e.clientX - s.x) * sign;
      if (dx > SWIPE_SLOP * 2 && Math.abs(e.clientY - s.y) * SWIPE_DOMINANCE < Math.abs(e.clientX - s.x)) {
        if (swipeCommits(dx, s.tracker.velocity(e.timeStamp) * sign, el.clientWidth)) act.current();
      }
    };
    const cancel = () => {
      g = null;
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', cancel);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', cancel);
    };
  }, [ref, dir, minX]);
}
