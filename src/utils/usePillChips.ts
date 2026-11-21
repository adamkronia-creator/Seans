import { useCallback, useLayoutEffect, useRef } from 'react';
import { centerChips } from './centerChips';
import { followChips, placePill, type PositionVia } from './followChips';

/** Общая плашка и прокрутка ряда чипсов следуют за страницами пейджера. */
export function usePillChips(enabled = true) {
  const row = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const list = row.current;
    if (!enabled || !list) return;
    const chips = Array.from(list.querySelectorAll<HTMLElement>(':scope > .chip'));
    const pill = list.querySelector<HTMLElement>(':scope > .chips-pill');
    const measure = () => {
      const weights = pill?.dataset.weights?.split(',').map(Number);
      placePill(chips, weights ?? chips.map((chip) => Number(chip.getAttribute('aria-pressed') === 'true')));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    chips.forEach((chip) => observer.observe(chip));
    return () => observer.disconnect();
  }, [enabled]);

  const onPosition = useCallback((position: number, via?: PositionVia) => {
    const list = row.current;
    if (!list) return;
    followChips(list.querySelectorAll<HTMLElement>(':scope > .chip'), position, via);
    centerChips(list, position, '.chip', via);
  }, []);

  return { row, onPosition };
}
