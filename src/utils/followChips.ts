/**
 * Чипсы фильтров идут за страницами: каждому задаётся --w, насколько он «выбран» (от 0 до 1), по положению страниц.
 * Цвет перетекает от одного чипса к другому вместе с пальцем, а не переключается на середине (так же идут значки вкладок
 * в чате). Само перетекание описано в Chip.css (чипс с follow).
 * `position` — положение в страницах (дробное), порядок чипсов — порядок страниц.
 */
export function followChips(chips: Iterable<HTMLElement>, position: number) {
  const items = Array.from(chips);
  const p = Math.min(items.length - 1, Math.max(0, position));
  items.forEach((chip, i) => {
    const w = Math.max(0, 1 - Math.abs(p - i));
    chip.style.setProperty('--w', String(w));
    // Метка на самом элементе, а не класс: className держит React и сбросил бы его при смене выбранного чипса
    chip.toggleAttribute('data-moving', w > 0.001 && w < 0.999);
  });
}
