import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react';

/*
 * Блок, содержимое которого заменяется целиком (вкладки «Истории», «Медиа», «Файлы», «Ссылки»), меняет высоту плавно, а не скачком:
 * всё, что ниже, едет вместе с ним, а новое содержимое проявляется за краем блока. Высота «до» снимается в обработчике нажатия
 * (функция, которую возвращает хук), «после» — сразу после показа нового содержимого, до отрисовки кадра.
 * Если высота не изменилась или человек просит поменьше движения, ничего не играет.
 */
const DURATION = 300;
const EASE = 'cubic-bezier(0.25, 0.8, 0.25, 1)';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * @param ref блок, высота которого меняется (с рамкой и полями: box-sizing у приложения border-box)
 * @param key что определяет содержимое: когда сменилось, играем движение
 * @returns функция «запомнить высоту до смены»; её зовут в том же обработчике, что и смену содержимого
 */
export function useHeightMorph(ref: RefObject<HTMLElement>, key: unknown): () => void {
  const from = useRef<number | null>(null);
  const playing = useRef<Animation | null>(null);

  useLayoutEffect(() => {
    const before = from.current;
    from.current = null;
    const el = ref.current;
    if (before === null || !el || reducedMotion()) return;
    const after = el.offsetHeight;
    if (Math.abs(after - before) < 2) return;
    // Прежнее движение (нажали ещё раз, не дождавшись конца) заменяется новым, начатым с текущей высоты
    playing.current?.cancel();
    el.style.overflow = 'hidden';
    const move = el.animate([{ height: `${before}px` }, { height: `${after}px` }], { duration: DURATION, easing: EASE });
    playing.current = move;
    const done = () => {
      if (playing.current !== move) return;
      playing.current = null;
      el.style.removeProperty('overflow');
    };
    move.addEventListener('finish', done);
    move.addEventListener('cancel', done);
  }, [key, ref]);

  return useCallback(() => {
    from.current = ref.current?.offsetHeight ?? null;
  }, [ref]);
}
