import { reducedMotion } from './swipe';

/**
 * Ряд чипсов прокручивается вбок и часть чипсов уходит за край. Когда выбранным становится другой чипс (нажали
 * или пролистали страницы пальцем), ряд подъезжает так, чтобы он был виден целиком, с тем же отступом от края, что у самого ряда.
 * Двигается только сам ряд: страница и прокрутка выше остаются на месте (в отличие от scrollIntoView).
 */
export function revealChip(row: HTMLElement, chip: HTMLElement, margin = 16) {
  const room = row.scrollWidth - row.clientWidth;
  if (room <= 1) return;
  const rowBox = row.getBoundingClientRect();
  const chipBox = chip.getBoundingClientRect();
  // Положение чипса в самом ряду, а не на экране: страница с рядом может быть сдвинута
  const left = chipBox.left - rowBox.left + row.scrollLeft;
  const right = left + chipBox.width;
  let to: number;
  if (left - margin < row.scrollLeft) to = left - margin;
  else if (right + margin > row.scrollLeft + row.clientWidth) to = right + margin - row.clientWidth;
  else return;
  row.scrollTo({ left: Math.min(room, Math.max(0, to)), behavior: reducedMotion() ? 'auto' : 'smooth' });
}
