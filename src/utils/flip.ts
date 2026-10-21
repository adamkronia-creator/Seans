/**
 * Соседи, уступившие место, не прыгают, а плавно переезжают (приём FLIP): старое место считается до перестановки, переезд играет после неё.
 * Смещение добавляется к уже стоящему transform (composite: add): строка, которую в это время тянут пальцем, не сбивается.
 * @param before прежнее положение каждой строки (offsetTop или offsetLeft; если задан read, то то, что он вернул)
 * @param read как читать положение сейчас; нужен, когда прежнее положение считали иначе (например, от верха самого списка)
 */
export function flip(els: HTMLElement[], before: Map<HTMLElement, number>, axis: 'x' | 'y', read?: (el: HTMLElement) => number) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const el of els) {
    const from = before.get(el);
    const to = read ? read(el) : axis === 'x' ? el.offsetLeft : el.offsetTop;
    if (from === undefined || from === to) continue;
    const d = from - to;
    el.animate([{ transform: axis === 'x' ? `translateX(${d}px)` : `translateY(${d}px)` }, { transform: 'translate(0)' }], { duration: 220, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', composite: 'add' });
  }
}
