import type { PositionVia } from './followChips';

/**
 * Ряд чипсов (разделы чата) прокручивается так, чтобы выбранный чипс стоял посередине, а остальные ушли в стороны:
 * при листании страниц ряд едет вместе с ними, и видно больше соседей. `position` — положение в страницах (дробное:
 * 1,4 — между вторым чипсом и третьим), порядок чипсов — порядок страниц; `selector` отбирает чипсы-страницы (без «+»). У краев ряд упирается в начало и конец.
 */
export function centerChips(row: HTMLElement, position: number, selector = '.chip', via?: PositionVia) {
  const chips = Array.from(row.querySelectorAll<HTMLElement>(selector));
  const room = row.scrollWidth - row.clientWidth;
  if (chips.length === 0 || room <= 1) return;
  const rowLeft = row.getBoundingClientRect().left;
  // Середина чипса в самом ряду (с учётом прокрутки), а не на экране
  const middle = (chip: HTMLElement) => {
    const box = chip.getBoundingClientRect();
    return box.left - rowLeft + row.scrollLeft + box.width / 2;
  };
  let target: number;
  if (via && chips[via.from] && chips[via.to]) {
    // Переход через несколько страниц: ряд едет от одного чипса к другому напрямую
    const here = middle(chips[via.from]);
    target = here + (middle(chips[via.to]) - here) * Math.min(1, Math.max(0, via.t));
  } else {
    const p = Math.min(chips.length - 1, Math.max(0, position));
    const i = Math.floor(p);
    const next = chips[Math.min(i + 1, chips.length - 1)];
    const here = middle(chips[i]);
    target = here + (middle(next) - here) * (p - i);
  }
  row.scrollLeft = Math.min(room, Math.max(0, target - row.clientWidth / 2));
}
