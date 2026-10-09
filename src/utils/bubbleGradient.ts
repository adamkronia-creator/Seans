/*
 * Градиент исходящих пузырей, как в Telegram: он привязан к окну ленты, а не к пузырю. Выше по экрану пузырь
 * ближе к акценту, ниже глубже, а при прокрутке цвет плавно меняется.
 *
 * В CSS (MessageBubble.css) градиент растянут на высоту окна (--feed-h), а сдвиг (--gy) говорит, где пузырь
 * сейчас стоит в этом окне. Обе переменные считаются здесь: на прокрутку, на смену размера окна и на новые сообщения.
 */

/** Запас за краями окна: пузыри чуть дальше видимой части тоже получают сдвиг, чтобы к моменту появления цвет уже был верным */
const MARGIN = 120;

export function installBubbleGradient(feed: HTMLElement): () => void {
  let frame = 0;
  let height = '';

  const update = () => {
    frame = 0;
    const area = feed.getBoundingClientRect();
    if (area.height === 0) return;
    const nextHeight = `${Math.round(area.height)}px`;
    if (nextHeight !== height) {
      height = nextHeight;
      feed.style.setProperty('--feed-h', nextHeight);
    }
    // Сначала читаем положения, потом пишем: так раскладка пересчитывается один раз
    const moves: [HTMLElement, string][] = [];
    feed.querySelectorAll<HTMLElement>('.bubble--out').forEach((bubble) => {
      const box = bubble.getBoundingClientRect();
      if (box.bottom < area.top - MARGIN || box.top > area.bottom + MARGIN) return;
      const shift = `${Math.round(area.top - box.top)}px`;
      if (bubble.style.getPropertyValue('--gy') !== shift) moves.push([bubble, shift]);
    });
    moves.forEach(([bubble, shift]) => bubble.style.setProperty('--gy', shift));
  };

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  feed.addEventListener('scroll', schedule, { passive: true });
  const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
  resize?.observe(feed);
  // Новые и удалённые сообщения сдвигают остальные пузыри, не трогая прокрутку
  const mutations = new MutationObserver(schedule);
  mutations.observe(feed, { childList: true, subtree: true });
  update();

  return () => {
    cancelAnimationFrame(frame);
    feed.removeEventListener('scroll', schedule);
    resize?.disconnect();
    mutations.disconnect();
  };
}
