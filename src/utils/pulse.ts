import { useEffect, useRef, type RefObject } from 'react';

/*
 * Короткое движение значка, когда значение сменилось на глазах: колокольчик покачивается, когда звук включили, и сжимается пружинкой, когда выключили.
 * При первом показе экрана ничего не играет: двигается только то, что человек изменил. При «уменьшении движения» значок просто меняется.
 */
const PULSES = {
  /** Колокольчик звенит: качается из стороны в сторону, затухая */
  ring: {
    frames: [
      { rotate: '0deg', transformOrigin: '50% 12%' },
      { rotate: '-18deg', transformOrigin: '50% 12%' },
      { rotate: '14deg', transformOrigin: '50% 12%' },
      { rotate: '-9deg', transformOrigin: '50% 12%' },
      { rotate: '4deg', transformOrigin: '50% 12%' },
      { rotate: '0deg', transformOrigin: '50% 12%' },
    ],
    options: { duration: 560, easing: 'ease-in-out' },
  },
  /** Значок «выскакивает» с пружинкой */
  pop: {
    frames: [{ scale: 0.6 }, { scale: 1.15 }, { scale: 1 }],
    options: { duration: 340, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  },
} satisfies Record<string, { frames: Keyframe[]; options: KeyframeAnimationOptions }>;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Проиграть движение значку внутри ref, когда сменилось value (но не при первом показе).
 * @param kind какое движение играть: решает тот, кто знает новое значение (звук включён — ring, выключен — pop)
 * @param selector какой элемент внутри ref двигать; по умолчанию первый значок
 */
export function useChangePulse(ref: RefObject<HTMLElement>, value: unknown, kind: keyof typeof PULSES, selector = 'svg') {
  const last = useRef(value);
  useEffect(() => {
    if (Object.is(last.current, value)) return;
    last.current = value;
    if (reducedMotion()) return;
    const node = ref.current?.querySelector(selector);
    if (!node) return;
    const { frames, options } = PULSES[kind];
    node.animate(frames, options);
  }, [ref, value, kind, selector]);
}
