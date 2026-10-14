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
 *
 * Чипсы с признаком split (см. Chip.css) этим же ходом получают --gl и --gr — насколько раскрыт стык слева и справа: 0 — стык закрыт
 * (соседи слиты в одну капсулу), 1 — открыт (зазор и скруглённые углы). Стык открыт настолько, насколько «выбран» кто-то из двух его чипсов,
 * поэтому выбранный выходит из капсулы, а оставленный им стык закрывается: всё идёт за пальцем так же, как цвет.
 */
export function followChips(chips: Iterable<HTMLElement>, position: number, via?: PositionVia) {
  const items = Array.from(chips);
  const p = Math.min(items.length - 1, Math.max(0, position));
  const t = via ? Math.min(1, Math.max(0, via.t)) : 0;
  // Переход через несколько страниц: цвет перетекает прямо от чипса к чипсу, не задевая те, что между ними
  const weights = items.map((_, i) => (via ? (i === via.from ? 1 - t : i === via.to ? t : 0) : Math.max(0, 1 - Math.abs(p - i))));
  /** Стык между чипсами a и b; по краям ряда стыков нет, углы там всегда скруглены */
  const joint = (a: number, b: number) => (a < 0 || b >= items.length ? 1 : Math.min(1, weights[a] + weights[b]));
  items.forEach((chip, i) => {
    const w = weights[i];
    chip.style.setProperty('--w', String(w));
    if (chip.classList.contains('chip--split')) {
      chip.style.setProperty('--gl', joint(i - 1, i).toFixed(4));
      chip.style.setProperty('--gr', joint(i, i + 1).toFixed(4));
    }
    // Вкладка-значок: подпись раскрывается на долю своей ширины (столбец сетки в fr), так что ширина идёт за пальцем без измерений
    if (chip.classList.contains('chip--tab')) chip.style.setProperty('--cols', `${w.toFixed(4)}fr`);
    // Метка на самом элементе, а не класс: className держит React и сбросил бы его при смене выбранного чипса
    chip.toggleAttribute('data-moving', w > 0.001 && w < 0.999);
  });
}
