import { flushSync } from 'react-dom';

const pending = new WeakMap<HTMLElement, () => void>();

function scrollContainer(element: HTMLElement) {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === 'auto' || overflowY === 'scroll') return parent;
  }
  return null;
}

interface ToggleAnchor {
  /** Верх раскрываемого фрагмента, иногда с отступом до первой ранее скрытой строки. */
  reveal?: HTMLElement;
  inset?: number;
  /** Некоторые карточки заменяют кнопку «Скрыть» новой кнопкой при сворачивании. */
  control?: () => HTMLElement | null;
}

/** Пока меняется высота блока, держим видимым нажатый элемент или начало нового текста. */
export function anchorToggle(
  trigger: HTMLElement,
  animated: HTMLElement | null,
  update: () => void,
  { reveal, inset = 0, control = () => trigger }: ToggleAnchor = {},
) {
  const scroller = scrollContainer(trigger);
  if (!scroller || !animated) {
    update();
    return;
  }

  pending.get(scroller)?.();
  const box = scroller.getBoundingClientRect();
  const screen = scroller.closest('.screen');
  const header = screen?.querySelector('.test-settings__header, .chat__header, .ct__bar');
  const bar = screen?.querySelector('.tabbar-glass');
  const top = Math.max(box.top, header?.getBoundingClientRect().bottom ?? box.top);
  const bottom = Math.min(box.bottom, bar?.getBoundingClientRect().top || box.bottom);
  const height = Math.max(0, bottom - top);
  const pressed = trigger.getBoundingClientRect();
  const from = pressed.top + pressed.height / 2;
  const target = Math.max(top + height * 0.35, Math.min(from, bottom - height * 0.35));
  const hadFocus = document.activeElement === trigger;
  const previous = scroller.style.overflowAnchor;
  scroller.style.overflowAnchor = 'none';
  const interrupts = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
  let frame = 0;
  const cleanup = () => {
    cancelAnimationFrame(frame);
    interrupts.forEach((type) => scroller.removeEventListener(type, cleanup));
    scroller.style.overflowAnchor = previous;
    pending.delete(scroller);
  };

  flushSync(update);
  const anchor = reveal ?? control();
  if (!anchor) {
    cleanup();
    return;
  }
  if (!reveal && hadFocus && anchor !== trigger) anchor.focus({ preventScroll: true });

  const start = performance.now();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const follow = (now: number) => {
    if (!anchor.isConnected) {
      cleanup();
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const progress = reduced ? 1 : Math.min(1, (now - start) / 160);
    const position = from + (target - from) * (1 - (1 - progress) ** 3);
    const delta = rect.top + (reveal ? inset : rect.height / 2) - position;
    if (Math.abs(delta) > 0.5) scroller.scrollTo({ top: scroller.scrollTop + delta, behavior: 'instant' });
    if (progress < 1 || (!reduced && animated.getAnimations().some((animation) => animation.playState === 'running'))) {
      frame = requestAnimationFrame(follow);
    } else {
      cleanup();
    }
  };

  pending.set(scroller, cleanup);
  interrupts.forEach((type) => scroller.addEventListener(type, cleanup, { passive: true }));
  follow(start);
}
