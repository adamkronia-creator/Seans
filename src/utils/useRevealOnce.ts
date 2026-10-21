import { useEffect, useRef, useState } from 'react';

/**
 * Показать один раз, когда элемент впервые оказался на экране (столбцы диаграммы вырастают, когда до них доехали, а не пока их не видно).
 * Возвращает ссылку для элемента и флаг «уже показан»; после первого показа флаг не сбрасывается, прокрутка туда и обратно ничего не повторяет.
 * Без IntersectionObserver элемент считается показанным сразу.
 */
export function useRevealOnce<T extends Element>(): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const node = ref.current;
    if (seen || !node) return;
    const watcher = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setSeen(true);
        watcher.disconnect();
      },
      { threshold: 0.25 },
    );
    watcher.observe(node);
    return () => watcher.disconnect();
  }, [seen]);
  return [ref, seen];
}
