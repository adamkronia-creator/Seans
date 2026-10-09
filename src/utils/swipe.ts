/*
 * Общие части жестов: порог начала движения, упругий край, скорость пальца, пружина доводки
 * и защита от случайного нажатия сразу после жеста. Ими пользуются листание разделов чата,
 * жест «назад» от левого края и закрытие окон снизу.
 */

/** Касание началось у левого края и принадлежит жесту «назад»: листанию разделов на нём делать нечего */
export const edgeTouch = { active: false };

/**
 * Какой пейджер сейчас ведёт палец. Пейджеры бывают вложенными (фильтры истории внутри разделов чата), и жест
 * принадлежит ближайшему из них, который может двигаться в эту сторону; остальные его не берут.
 */
const fingerOwners = new Map<number, Element>();
export const fingerOwner = {
  of: (pointerId: number) => fingerOwners.get(pointerId),
  take: (pointerId: number, host: Element) => void fingerOwners.set(pointerId, host),
  drop: (pointerId: number, host: Element) => {
    if (fingerOwners.get(pointerId) === host) fingerOwners.delete(pointerId);
  },
};

/** Колесо или тачпад: событие уже разобрал вложенный пейджер, внешнему оно не нужно */
export const wheelTaken = new WeakSet<Event>();

const pagingNow = new Set<object>();

/** Страницы пейджера между местами: полоса прокрутки приложения прячется, пока так хотя бы у одного пейджера */
export function setPaging(who: object, between: boolean) {
  if (between) pagingNow.add(who);
  else pagingNow.delete(who);
  document.body.classList.toggle('is-paging', pagingNow.size > 0);
}

/**
 * Жест идёт: на корне стоит is-swiping (по нему дорисовка страниц ждёт конца жеста; стилей у этого класса нет). Мышью тянут ещё
 * и с курсором-«хваткой» без выделения текста (is-grabbing): эти правила стоят на всех элементах сразу, а смена такого класса
 * пересчитывает стили всего документа (на слабом телефоне это десятки миллисекунд посреди жеста), поэтому у касаний их нет.
 */
export function setSwiping(on: boolean, pointerType = 'touch') {
  const root = document.documentElement;
  root.classList.toggle('is-swiping', on);
  root.classList.toggle('is-grabbing', on && pointerType === 'mouse');
}

/** Сдвиг пальца, после которого это уже движение, а не нажатие; так же считает пузырь сообщения и эффект нажатия */
export const SWIPE_SLOP = 10;

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Сопротивление за краем, как у резинки в списках на iPhone: чем дальше тянешь, тем туже,
 * и дальше `size` не уходит никогда. Знак сохраняется.
 */
export function elastic(distance: number, size = 1): number {
  return (1 - 1 / ((Math.abs(distance) * 0.55) / size + 1)) * size * Math.sign(distance);
}

/** Скорость пальца по последним точкам: так отличают медленное перетаскивание от быстрого взмаха */
export class VelocityTracker {
  private points: { t: number; value: number }[] = [];

  push(time: number, value: number) {
    this.points.push({ t: time, value });
    // Нужны только последние 100 мс: что было раньше, на взмах не влияет
    while (this.points.length > 2 && this.points[0].t < time - 100) this.points.shift();
  }

  /** Единиц значения в миллисекунду; 0, если палец перед отпусканием уже остановился */
  velocity(now: number): number {
    const { points } = this;
    if (points.length < 2) return 0;
    const first = points[0];
    const last = points[points.length - 1];
    if (now - last.t > 90) return 0;
    const span = last.t - first.t;
    return span < 8 ? 0 : (last.value - first.value) / span;
  }
}

interface SpringOptions {
  from: number;
  to: number;
  /** Начальная скорость, единиц в секунду: чтобы движение продолжало взмах, а не начиналось с нуля */
  velocity?: number;
  /** Жёсткость: чем больше, тем быстрее доходит; затухание подобрано так, что пружина не «звенит» */
  stiffness?: number;
  /** Точность остановки в единицах значения */
  rest?: number;
  onFrame: (value: number) => void;
  onDone?: () => void;
}

/**
 * Довести значение до цели пружиной без раскачки (критическое затухание).
 * Возвращает функцию, которая останавливает движение на текущем месте.
 */
export function runSpring({ from, to, velocity = 0, stiffness = 560, rest = 0.0005, onFrame, onDone }: SpringOptions): () => void {
  const damping = 2 * Math.sqrt(stiffness);
  let x = from;
  let v = velocity;
  let last = performance.now();
  let frame = 0;
  let alive = true;

  const tick = (now: number) => {
    if (!alive) return;
    let left = Math.min((now - last) / 1000, 0.05);
    last = now;
    // Мелкими шагами, чтобы пружина оставалась устойчивой даже на редких кадрах
    while (left > 0) {
      const h = Math.min(left, 1 / 240);
      v += (-stiffness * (x - to) - damping * v) * h;
      x += v * h;
      left -= h;
    }
    if (Math.abs(x - to) < rest && Math.abs(v) < rest * 20) {
      alive = false;
      onFrame(to);
      onDone?.();
      return;
    }
    onFrame(x);
    frame = requestAnimationFrame(tick);
  };

  frame = requestAnimationFrame(tick);
  return () => {
    alive = false;
    cancelAnimationFrame(frame);
  };
}

/**
 * Жест забирает указатель себе: дальнейшие события идут в `host`, а тем, кто ждал продолжения на месте касания
 * (пузырь с долгим нажатием, подсвеченная кнопка), рассылается отмена. Разосланное нами событие недоверенное
 * (isTrusted === false): свои обработчики жестов его пропускают.
 */
export function takeOver(host: Element, origin: Element, e: PointerEvent) {
  try {
    host.setPointerCapture(e.pointerId);
  } catch {
    // указатель уже снят: жест всё равно доведём по событиям
  }
  if (origin.isConnected) {
    origin.dispatchEvent(
      new PointerEvent('pointercancel', {
        bubbles: true,
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        isPrimary: true,
        clientX: e.clientX,
        clientY: e.clientY,
      }),
    );
  }
}

/**
 * Браузер иногда присылает щелчок по тому, что оказалось под пальцем, даже когда палец уже вёл страницу.
 * Пока жест идёт и ещё мгновение после него щелчки гасятся; возвращённая функция сообщает, что жест кончился.
 */
export function guardClick(): () => void {
  const stop = (event: Event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  window.addEventListener('click', stop, true);
  return () => {
    window.setTimeout(() => window.removeEventListener('click', stop, true), 120);
  };
}

/** Можно ли прокрутить блок вбок, если палец едет на `fingerDx` пикселей (отрицательное — влево, содержимое уходит вправо) */
export function canScrollSideways(el: HTMLElement, fingerDx: number): boolean {
  const room = el.scrollWidth - el.clientWidth;
  if (room <= 1) return false;
  return fingerDx < 0 ? el.scrollLeft < room - 1 : el.scrollLeft > 1;
}

/**
 * Дать блоку докатиться после отпускания пальца, постепенно замедляясь. `velocity` — пикселей прокрутки в миллисекунду.
 * Возвращает функцию, которая останавливает движение (новое касание «ловит» блок).
 */
export function flingScroll(el: HTMLElement, velocity: number): () => void {
  let v = velocity;
  let pos = el.scrollLeft; // дробное положение: scrollLeft у браузера округляется, и мелкие шаги терялись бы
  let last = performance.now();
  let frame = 0;

  const tick = (now: number) => {
    const dt = Math.min(now - last, 40);
    last = now;
    const room = el.scrollWidth - el.clientWidth;
    pos = Math.min(room, Math.max(0, pos + v * dt));
    el.scrollLeft = pos;
    v *= Math.exp(-dt / 325);
    if (Math.abs(v) < 0.02 || pos <= 0 || pos >= room) return;
    frame = requestAnimationFrame(tick);
  };

  if (Math.abs(v) > 0.05) frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}
