import { useEffect, useRef, type RefObject } from 'react';
import { elastic, guardClick, reducedMotion, runSpring, SWIPE_DOMINANCE, SWIPE_SLOP, swipeCommits, VelocityTracker } from '../../utils/swipe';

/*
 * Жесты просмотра историй (общие пороги и пружина из utils/swipe.ts, как у нижних окон и боковой панели):
 *  - вниз закрывает: карточка идёт за пальцем, уменьшается и скругляется, чёрная сцена за ней светлеет и открывает список;
 *    отпустили ниже порога или взмахнули — уезжает, иначе пружинит на место;
 *  - влево — следующий человек, вправо — предыдущий: карточка идёт за пальцем, засчитанная уезжает за край, новая въезжает
 *    (въезд — стиль .story-view[data-enter], его включает сам просмотр); где дальше некуда, край упругий и карточка возвращается.
 * Тап справа и слева, удержание (пауза) и «Закрыть» остаются как были: жест берёт касание, только когда палец ушёл дальше порога
 * и движение явно в одну сторону. Движение вверх не жест.
 *
 * Читают события касания, а не указателя: движение можно перехватить (touchmove с preventDefault), не дав браузеру начать прокрутку.
 * Мышью не листают: есть «Закрыть», Escape и тапы по краям.
 */

interface Handlers {
  /** Есть ли человек в эту сторону: 1 — следующий, −1 — предыдущий */
  canStep: (dir: 1 | -1) => boolean;
  /** Перейти к соседу; карточка к этому моменту уже за краем, возвращать её на место нужно после показа нового (reset) */
  step: (dir: 1 | -1) => void;
  /** Закрыть: карточка уже за нижним краем */
  close: () => void;
  /** Палец взял карточку: анимации входа остановлены */
  grab: () => void;
}

interface Drag {
  startX: number;
  startY: number;
  phase: 'armed' | 'x' | 'y' | 'ignore';
  /** Палец в момент, когда жест взял карточку, и её сдвиг сейчас */
  anchorX: number;
  anchorY: number;
  x: number;
  y: number;
  tracker: VelocityTracker;
  release?: () => void;
}

/** Скругление карточки, пока её ведут (px): у полноэкранной истории углов нет, у сдвинутой есть */
const DRAG_RADIUS = 28;

/**
 * Жесты на сцене `stage` (на весь экран, чёрная подложка), двигается карточка `card` внутри. Возвращает `reset`: убрать следы жеста
 * (сдвиг, скругление, подложку); просмотр зовёт его, когда новая карточка уже нарисована.
 */
export function useStoryGestures(stage: RefObject<HTMLElement>, card: RefObject<HTMLElement>, handlers: Handlers) {
  const live = useRef(handlers);
  useEffect(() => {
    live.current = handlers;
  });
  const clean = useRef<() => void>(() => {});

  useEffect(() => {
    const root = stage.current;
    const el = card.current;
    if (!root || !el) return;

    let drag: Drag | null = null;
    /** Карточка доезжает (на место или за край): пока едет, новый жест не начинаем */
    let stopSpring: (() => void) | null = null;

    const paint = (x: number, y: number) => {
      const closing = Math.min(1, y / (window.innerHeight * 0.5));
      const sideways = Math.min(1, Math.abs(x) / window.innerWidth);
      el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${1 - 0.1 * closing - 0.04 * sideways})`;
      el.style.borderRadius = `${Math.round(DRAG_RADIUS * Math.min(1, (Math.abs(x) + y) / 48))}px`;
      // Чёрная сцена светлеет, только пока карточку тянут вниз: при движении вбок за ней чёрный фон
      root.style.setProperty('--stage-a', String(1 - closing));
    };

    clean.current = () => {
      el.style.removeProperty('transform');
      el.style.removeProperty('border-radius');
      el.style.removeProperty('will-change');
      root.style.removeProperty('--stage-a');
    };

    const finish = (d: Drag, now: number, cancelled: boolean) => {
      d.release?.();
      const along = d.phase === 'y' ? d.y : d.x;
      // Скорость пальца вдоль оси жеста, пикселей в миллисекунду; у «вправо» и «вниз» она положительная
      const v = cancelled ? 0 : d.tracker.velocity(now);
      const dir: 1 | -1 = d.x < 0 ? 1 : -1;
      const commits =
        !cancelled &&
        (d.phase === 'y' ? swipeCommits(d.y, v) : live.current.canStep(dir) && swipeCommits(Math.abs(d.x), dir === 1 ? -v : v));

      const done = () => {
        stopSpring = null;
        if (!commits) clean.current();
        else if (d.phase === 'y') live.current.close();
        else live.current.step(dir);
      };

      if (reducedMotion()) {
        done();
        return;
      }
      const target = !commits ? 0 : d.phase === 'y' ? window.innerHeight : -dir * window.innerWidth;
      stopSpring = runSpring({
        from: along,
        to: target,
        velocity: v * 1000,
        rest: 0.4,
        onFrame: (value) => (d.phase === 'y' ? paint(0, Math.max(0, value)) : paint(value, 0)),
        onDone: done,
      });
    };

    const onStart = (e: TouchEvent) => {
      drag = null;
      if (stopSpring || e.touches.length !== 1) return;
      const touch = e.touches[0];
      drag = { startX: touch.clientX, startY: touch.clientY, phase: 'armed', anchorX: 0, anchorY: 0, x: 0, y: 0, tracker: new VelocityTracker() };
    };

    const onMove = (e: TouchEvent) => {
      const d = drag;
      if (!d || d.phase === 'ignore') return;
      if (e.touches.length !== 1) {
        // Второй палец: карточку возвращаем, если уже вели, и жест больше не принимаем
        if (d.phase === 'x' || d.phase === 'y') finish(d, e.timeStamp, true);
        d.phase = 'ignore';
        return;
      }
      const touch = e.touches[0];

      if (d.phase === 'armed') {
        const dx = touch.clientX - d.startX;
        const dy = touch.clientY - d.startY;
        const ax = Math.abs(dx);
        const ay = Math.abs(dy);
        if (ax <= SWIPE_SLOP && ay <= SWIPE_SLOP) return;
        if (dy > 0 && ay >= ax * SWIPE_DOMINANCE) d.phase = 'y';
        else if (ax >= ay * SWIPE_DOMINANCE) d.phase = 'x';
        else {
          // Вверх или наискосок: не жест
          d.phase = 'ignore';
          return;
        }
        d.anchorX = touch.clientX;
        d.anchorY = touch.clientY;
        // Карточка ещё въезжает или исчезает: анимация не должна спорить с пальцем
        el.getAnimations().forEach((animation) => animation.cancel());
        root.getAnimations().forEach((animation) => animation.cancel());
        live.current.grab();
        el.style.willChange = 'transform';
        d.release = guardClick();
        d.tracker.push(e.timeStamp, d.phase === 'y' ? touch.clientY : touch.clientX);
        if (e.cancelable) e.preventDefault();
        paint(0, 0);
        return;
      }

      if (e.cancelable) e.preventDefault();
      if (d.phase === 'y') {
        d.tracker.push(e.timeStamp, touch.clientY);
        d.y = Math.max(0, touch.clientY - d.anchorY);
        paint(0, d.y);
      } else {
        d.tracker.push(e.timeStamp, touch.clientX);
        const dx = touch.clientX - d.anchorX;
        const dir: 1 | -1 = dx < 0 ? 1 : -1;
        // Дальше некуда: край упругий, как у списков на телефоне
        d.x = live.current.canStep(dir) ? dx : elastic(dx, window.innerWidth * 0.25);
        paint(d.x, 0);
      }
    };

    const onEnd = (e: TouchEvent) => {
      const d = drag;
      drag = null;
      if (d && (d.phase === 'x' || d.phase === 'y')) finish(d, e.timeStamp, e.type === 'touchcancel');
    };

    root.addEventListener('touchstart', onStart, { passive: true });
    root.addEventListener('touchmove', onMove, { passive: false });
    root.addEventListener('touchend', onEnd);
    root.addEventListener('touchcancel', onEnd);
    return () => {
      root.removeEventListener('touchstart', onStart);
      root.removeEventListener('touchmove', onMove);
      root.removeEventListener('touchend', onEnd);
      root.removeEventListener('touchcancel', onEnd);
      stopSpring?.();
    };
  }, [stage, card]);

  return { reset: () => clean.current() };
}
