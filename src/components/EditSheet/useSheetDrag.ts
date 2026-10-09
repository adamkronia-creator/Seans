import { useEffect, useRef, type RefObject } from 'react';
import { reducedMotion, runSpring, SWIPE_SLOP, VelocityTracker } from '../../utils/swipe';

/*
 * Нижнее окно закрывается свайпом вниз, как на телефоне: окно идёт за пальцем, затемнение светлеет. Отпустили ниже порога
 * или взмахнули — окно уезжает и закрывается; иначе пружинит на место. Тянуть можно за любое место окна, но только
 * вниз и только если прокручиваемое внутри уже в самом верху (иначе палец листает его содержимое).
 *
 * Жест читают события касания, а не указателя: у прокручиваемого блока вертикальное движение браузер забирает себе
 * (и шлёт отмену указателя), а касание можно перехватить, не дав ему начать прокрутку (touchmove с preventDefault).
 * Мышью окно не тянется: у него есть затемнение, кнопка «Отмена» и Escape.
 */

/** Вертикальное движение должно заметно перевешивать горизонтальное */
const DOMINANCE = 1.2;
/** На сколько миллисекунд вперёд «заглядываем» по скорости пальца: короткий быстрый взмах тоже закрывает */
const PROJECT_MS = 160;
/** Сколько протянуть вниз, чтобы окно закрылось: доля высоты окна, но не больше этого числа пикселей */
const COMMIT_RATIO = 0.4;
const COMMIT_MAX = 160;

/** Начали в поле ввода (поставить курсор, выделить текст) или там, где жест запрещён: окно не двигаем */
const NOT_FROM = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [data-no-swipe]';

interface Drag {
  startX: number;
  startY: number;
  phase: 'armed' | 'drag' | 'ignore';
  target: Element;
  sheet: HTMLElement;
  height: number;
  /** Палец в момент, когда жест взял окно, и сдвиг окна вниз сейчас */
  anchor: number;
  offset: number;
  /** Непрозрачность затемнения до жеста */
  dim: number;
  tracker: VelocityTracker;
}

/** Все прокручиваемые блоки от места касания до окна уже прокручены к самому верху (тянуть вниз можно, листать вверх нечего) */
function scrolledToTop(from: Element, sheet: HTMLElement): boolean {
  for (let el: Element | null = from; el; el = el.parentElement) {
    if (el instanceof HTMLElement) {
      const overflow = getComputedStyle(el).overflowY;
      if ((overflow === 'auto' || overflow === 'scroll') && el.scrollHeight > el.clientHeight + 1 && el.scrollTop > 0) return false;
    }
    if (el === sheet) break;
  }
  return true;
}

/** Закрытие нижнего окна свайпом вниз; `overlay` — затемнение на весь экран, внутри него окно (.sheet) */
export function useSheetDrag(overlay: RefObject<HTMLElement>, onClose: () => void) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    const root = overlay.current;
    if (!root) return;

    let drag: Drag | null = null;
    /** Окно доезжает (на место или за край); пока едет, новый жест не начинаем */
    let stopSpring: (() => void) | null = null;

    const apply = (d: Drag, offset: number) => {
      d.offset = offset;
      d.sheet.style.transform = `translate3d(0, ${offset}px, 0)`;
      root.style.backgroundColor = `rgb(0 0 0 / ${d.dim * (1 - Math.min(1, offset / d.height))})`;
    };

    const clean = (d: Drag) => {
      d.sheet.style.removeProperty('transform');
      root.style.removeProperty('background-color');
    };

    const finish = (d: Drag, now: number, cancelled: boolean) => {
      const velocity = cancelled ? 0 : d.tracker.velocity(now); // пикселей в миллисекунду
      const closing = !cancelled && d.offset + velocity * PROJECT_MS > Math.min(d.height * COMMIT_RATIO, COMMIT_MAX);
      if (reducedMotion()) {
        if (closing) close.current();
        else clean(d);
        return;
      }
      stopSpring = runSpring({
        from: d.offset,
        to: closing ? d.height : 0,
        velocity: velocity * 1000,
        rest: 0.4,
        onFrame: (offset) => apply(d, offset),
        onDone: () => {
          stopSpring = null;
          // Окно закрывается уже за краем экрана; копия для анимации ухода (useExitAnimation) появится на том же месте
          if (closing) close.current();
          else clean(d);
        },
      });
    };

    const onStart = (e: TouchEvent) => {
      drag = null;
      if (stopSpring || e.touches.length !== 1) return;
      const sheet = root.querySelector<HTMLElement>('.sheet');
      const target = e.target instanceof Element ? e.target : null;
      if (!sheet || !target || !sheet.contains(target) || target.closest(NOT_FROM)) return;
      const touch = e.touches[0];
      drag = {
        startX: touch.clientX,
        startY: touch.clientY,
        phase: 'armed',
        target,
        sheet,
        height: sheet.offsetHeight || 1,
        anchor: 0,
        offset: 0,
        dim: 1,
        tracker: new VelocityTracker(),
      };
    };

    const onMove = (e: TouchEvent) => {
      const d = drag;
      if (!d || d.phase === 'ignore') return;
      if (e.touches.length !== 1) {
        // Второй палец (сведение): окно не трогаем и возвращаем, если уже тянули
        if (d.phase === 'drag') finish(d, e.timeStamp, true);
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
        // Вверх, вбок или внутри окна, которое ещё можно прокрутить вверх: это не закрытие
        if (dy <= 0 || ay < ax * DOMINANCE || !scrolledToTop(d.target, d.sheet)) {
          d.phase = 'ignore';
          return;
        }
        d.phase = 'drag';
        d.anchor = touch.clientY;
        // Окно ещё въезжает или затемнение проявляется: анимация не должна спорить с пальцем
        d.sheet.getAnimations().forEach((animation) => animation.cancel());
        root.getAnimations().forEach((animation) => animation.cancel());
        const alpha = getComputedStyle(root).backgroundColor.split(',')[3];
        d.dim = alpha ? parseFloat(alpha) : 1;
        d.tracker.push(e.timeStamp, touch.clientY);
        if (e.cancelable) e.preventDefault();
        apply(d, 0);
        return;
      }

      if (e.cancelable) e.preventDefault(); // содержимое под пальцем не листается
      d.tracker.push(e.timeStamp, touch.clientY);
      apply(d, Math.max(0, touch.clientY - d.anchor));
    };

    const onEnd = (e: TouchEvent) => {
      const d = drag;
      drag = null;
      if (d && d.phase === 'drag') finish(d, e.timeStamp, e.type === 'touchcancel');
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
  }, [overlay]);
}
