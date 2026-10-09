/*
 * Прокрутка колесом мыши с инерцией, как у пальца на телефоне: «щелчок» колеса не перепрыгивает на 100 px,
 * а плавно разгоняется и затухает; быстрое кручение накапливается и несёт дальше.
 * Сенсорный экран и тачпад не трогаем: у них инерция уже есть в самой системе (на телефоне её даёт браузер).
 */

/** Постоянная затухания, мс: чем больше, тем дольше прокрутка «плывёт» после щелчка колеса */
const TAU = 120;
/** Высота строки для колёс, которые сообщают прокрутку в строках (Firefox) */
const LINE = 40;

interface Glide {
  /** Куда докатиться; положение хранится дробным: scrollTop у браузера округляется и мелкие шаги терялись бы */
  target: number;
  pos: number;
  /** Что браузер показал после нашей записи: если оно изменилось, кто-то прокрутил сам (скроллбар, клавиши, scrollIntoView) */
  written: number;
  frame: number;
  time: number;
}

const glides = new Map<HTMLElement, Glide>();
let streak = 0;
let lastWheel = 0;
let lastOther = 0;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Колесо мыши, а не тачпад: у колеса прокрутка приходит крупными ровными шагами */
function isMouseWheel(event: WheelEvent): boolean {
  if (event.deltaMode !== 0) return true; // строки и страницы: колесо в Firefox
  if (event.deltaX !== 0) return false; // тачпад почти всегда добавляет боковую составляющую
  const notch = (event as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY;
  if (typeof notch === 'number') return notch !== 0 && notch % 120 === 0;
  return Number.isInteger(event.deltaY) && Math.abs(event.deltaY) >= 100;
}

/** Первый вверх по дереву блок, который можно прокрутить в нужную сторону; null — пусть решает браузер */
function findScroller(start: EventTarget | null, direction: number): HTMLElement | null {
  for (let node = start instanceof Element ? start : null; node && node !== document.documentElement; node = node.parentElement) {
    if (!(node instanceof HTMLElement)) continue;
    const { overflowY } = getComputedStyle(node);
    if (overflowY !== 'auto' && overflowY !== 'scroll') continue;
    const room = node.scrollHeight - node.clientHeight;
    if (room <= 1) continue;
    // В полях ввода колесо работает как обычно
    if (node.matches('textarea, select')) return null;
    // Дошёл до края в эту сторону: прокручивать будет тот, кто снаружи
    if (direction > 0 ? node.scrollTop < room - 1 : node.scrollTop > 1) return node;
  }
  return null;
}

function stop(el: HTMLElement) {
  const glide = glides.get(el);
  if (!glide) return;
  cancelAnimationFrame(glide.frame);
  glides.delete(el);
}

function stopAll() {
  [...glides.keys()].forEach(stop);
}

function tick(el: HTMLElement, glide: Glide, now: number) {
  if (!el.isConnected) return stop(el);
  // Кто-то другой сдвинул прокрутку (перетащили полосу, нажали клавишу): не спорим с ним
  if (Math.abs(el.scrollTop - glide.written) > 1.5) return stop(el);

  const dt = Math.min(48, now - glide.time);
  glide.time = now;
  glide.target = Math.min(glide.target, Math.max(0, el.scrollHeight - el.clientHeight));
  glide.pos += (glide.target - glide.pos) * (1 - Math.exp(-dt / TAU));

  const arrived = Math.abs(glide.target - glide.pos) < 0.4;
  if (arrived) glide.pos = glide.target;
  el.scrollTop = glide.pos;
  glide.written = el.scrollTop;

  if (arrived) return stop(el);
  glide.frame = requestAnimationFrame((t) => tick(el, glide, t));
}

function push(el: HTMLElement, delta: number) {
  let glide = glides.get(el);
  if (glide && Math.abs(el.scrollTop - glide.written) > 1.5) {
    stop(el);
    glide = undefined;
  }
  if (!glide) {
    glide = { target: el.scrollTop, pos: el.scrollTop, written: el.scrollTop, frame: 0, time: performance.now() };
    glides.set(el, glide);
  }
  const room = el.scrollHeight - el.clientHeight;
  glide.target = Math.min(room, Math.max(0, glide.target + delta));
  // Если кадр уже запланирован, он подхватит новую цель сам
  if (!glide.frame) {
    const current = glide;
    current.frame = requestAnimationFrame((t) => tick(el, current, t));
  }
}

function onWheel(event: WheelEvent) {
  if (event.defaultPrevented || event.ctrlKey || event.shiftKey || event.deltaY === 0) return;
  if (!isMouseWheel(event)) {
    lastOther = event.timeStamp;
    return;
  }
  // Если только что крутили тачпадом, не вмешиваемся: две прокрутки подряд сложились бы рывками
  if (event.timeStamp - lastOther < 500) return;
  const direction = Math.sign(event.deltaY);
  const el = findScroller(event.target, direction);
  if (!el) return;
  event.preventDefault();

  // Быстрое кручение разгоняет прокрутку, как ускорение колеса в системе
  streak = event.timeStamp - lastWheel < 130 ? Math.min(streak + 1, 6) : 0;
  lastWheel = event.timeStamp;
  const pixels = event.deltaMode === 0 ? event.deltaY : event.deltaMode === 1 ? event.deltaY * LINE : event.deltaY * el.clientHeight;
  push(el, pixels * (1 + streak * 0.25));
}

/** Подключить плавную прокрутку колесом; вызывается один раз при запуске */
export function installInertiaScroll() {
  if (reducedMotion()) return;
  window.addEventListener('wheel', onWheel, { passive: false });
  // Нажали на полосу прокрутки, на экран или клавишу: инерция колеса отпускает
  window.addEventListener('pointerdown', stopAll, { capture: true, passive: true });
  window.addEventListener('keydown', stopAll, { capture: true, passive: true });
}
