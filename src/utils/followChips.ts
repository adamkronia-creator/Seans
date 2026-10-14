/** Переход со страницы `from` сразу на `to` (не соседнюю): `t` — доля пути от 0 до 1 */
export interface PositionVia {
  from: number;
  to: number;
  t: number;
}

/**
 * Чипсы фильтров идут за страницами: каждому задаётся --w, насколько он «выбран» (от 0 до 1), по положению страниц.
 * Цвет перетекает от одного чипса к другому вместе с пальцем, а не переключается на середине (так же идут значки вкладок
 * в чате). Само перетекание описано в Chip.css (чипс с follow).
 * `position` — положение в страницах (дробное), порядок чипсов — порядок страниц.
 */
export function followChips(chips: Iterable<HTMLElement>, position: number, via?: PositionVia) {
  const items = Array.from(chips);
  const p = Math.min(items.length - 1, Math.max(0, position));
  const t = via ? Math.min(1, Math.max(0, via.t)) : 0;
  items.forEach((chip, i) => {
    // Переход через несколько страниц: цвет перетекает прямо от чипса к чипсу, не задевая те, что между ними
    const w = via ? (i === via.from ? 1 - t : i === via.to ? t : 0) : Math.max(0, 1 - Math.abs(p - i));
    chip.style.setProperty('--w', String(w));
    // Метка на самом элементе, а не класс: className держит React и сбросил бы его при смене выбранного чипса
    chip.toggleAttribute('data-moving', w > 0.001 && w < 0.999);
  });
}
