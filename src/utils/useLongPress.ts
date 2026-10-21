import { useRef, type MouseEvent, type PointerEvent } from 'react';

/** Сколько держать палец, чтобы это было долгое нажатие: как у чипсов и сообщений */
const LONG_PRESS_MS = 450;
/** Сдвиг пальца, после которого это уже прокрутка, а не долгое нажатие */
const SLOP = 10;
/** Столько после долгого нажатия системное меню браузера считается эхом того же касания */
const ECHO_MS = 1000;

/** Долгое нажатие, правая кнопка мыши и клавиша «меню» на кнопке: меню действий в стиле Telegram */
export function useLongPress(onLong: ((el: HTMLElement) => void) | undefined) {
  const press = useRef<{ x: number; y: number; timer: number } | null>(null);
  const opened = useRef(false);
  const echoUntil = useRef(0);
  const stop = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };
  if (!onLong) return { handlers: {}, swallow: () => false };
  const handlers = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      opened.current = false;
      if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
      stop();
      const el = e.currentTarget;
      const start = { x: e.clientX, y: e.clientY, timer: 0 };
      start.timer = window.setTimeout(() => {
        if (press.current !== start) return;
        press.current = null;
        opened.current = true;
        echoUntil.current = Date.now() + ECHO_MS;
        onLong(el);
      }, LONG_PRESS_MS);
      press.current = start;
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const s = press.current;
      if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > SLOP) stop();
    },
    onPointerUp: stop,
    onPointerCancel: stop,
    onPointerLeave: stop,
    onContextMenu: (e: MouseEvent<HTMLElement>) => {
      e.preventDefault();
      if (Date.now() < echoUntil.current) return;
      stop();
      opened.current = true;
      onLong(e.currentTarget);
    },
  };
  /** Клик, которым закончилось долгое нажатие, строку не открывает */
  const swallow = (e: MouseEvent) => {
    if (opened.current && e.detail > 0) {
      opened.current = false;
      return true;
    }
    opened.current = false;
    return false;
  };
  return { handlers, swallow };
}
