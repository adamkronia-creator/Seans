/*
 * Нажатие как в приложениях на телефоне: кнопка в момент касания чуть уменьшается и пружинит обратно.
 * Браузеры телефонов включают :active с задержкой, а при быстром касании почти не показывают, поэтому
 * реагируем на само касание (pointerdown) и держим нажатое состояние не меньше MIN_HOLD.
 * Пока кнопка нажата, на ней стоит атрибут data-pressed: по нему CSS подсвечивает строки списков и карточки.
 *
 * Насколько уменьшать, считается по размеру: маленькая иконка заметно (до 0.9), кнопка во всю ширину еле-еле (0.985).
 * Свой коэффициент можно задать в CSS переменной --press-scale (1 — не уменьшать, только подсветка).
 * Исключения: выключенные кнопки, переключатели и всё с атрибутом data-no-press.
 * Мышь только подсвечивает (data-pressed) и не уменьшает: у уменьшенной кнопки сжимается и область нажатия,
 * и щелчок у самого края перестал бы срабатывать. Палец с этим не сталкивается: браузер телефона сам берёт ближайшую кнопку.
 */

const PRESSABLE =
  'button, summary, a[href], [role="button"], [role="link"], [role="tab"], [role="radio"], [role="checkbox"], [role="menuitem"]';
const SKIP = ':disabled, [aria-disabled="true"], [role="switch"], [data-no-press]';

/** Как долго держится нажатое состояние, даже если палец уже убран: иначе быстрое касание не успевает заметиться */
const MIN_HOLD = 110;
const DOWN_MS = 120;
const UP_MS = 420;
/** Лёгкий «отскок»: пружина чуть проскакивает исходный размер и возвращается */
const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
/** Сдвиг пальца, после которого это уже не нажатие, а прокрутка или перетаскивание */
const SLOP = 10;

interface Press {
  el: HTMLElement;
  /** Анимация уменьшения; нет, если включено «уменьшение движения» */
  down: Animation | undefined;
  since: number;
  x: number;
  y: number;
}

/** Последнее нажатие на каждом элементе: если оно уже сменилось новым, старое не должно трогать атрибут и размер */
const latest = new WeakMap<HTMLElement, Press>();
/** Текущая анимация размера элемента: новое нажатие продолжает с того места, где остановилось прежнее */
const running = new WeakMap<HTMLElement, Animation>();
let held: Press | null = null;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Размер элемента прямо сейчас (во время пружины он между нажатым и обычным) */
function currentScale(el: HTMLElement): number {
  const value = parseFloat(getComputedStyle(el).scale);
  return Number.isFinite(value) ? value : 1;
}

function pressedScale(el: HTMLElement): number {
  const custom = parseFloat(getComputedStyle(el).getPropertyValue('--press-scale'));
  if (Number.isFinite(custom)) return custom;
  const { width, height } = el.getBoundingClientRect();
  // Уменьшение примерно на 6 px по длинной стороне: иконка 40 px — до 0.9, кнопка во всю ширину — 0.985
  return 1 - Math.min(0.1, Math.max(0.015, 6 / Math.max(width, height, 1)));
}

function animateScale(el: HTMLElement, to: number, options: KeyframeAnimationOptions): Animation {
  const next = el.animate({ scale: [String(currentScale(el)), String(to)] }, options);
  running.get(el)?.cancel();
  running.set(el, next);
  return next;
}

function pressDown(el: HTMLElement, event: PointerEvent): Press {
  el.setAttribute('data-pressed', '');
  // Размер не меняется (--press-scale: 1, мышь, просьба о меньшем движении): остаётся только подсветка через data-pressed
  const to = reducedMotion() || event.pointerType === 'mouse' ? 1 : pressedScale(el);
  const down = to < 0.999 ? animateScale(el, to, { duration: DOWN_MS, easing: 'ease-out', fill: 'forwards' }) : undefined;
  const press: Press = { el, down, since: performance.now(), x: event.clientX, y: event.clientY };
  latest.set(el, press);
  return press;
}

function springBack(press: Press) {
  const { el, down } = press;
  if (latest.get(el) !== press) return; // на этот элемент уже нажали заново
  el.removeAttribute('data-pressed');
  if (!down) return;
  const back = animateScale(el, 1, { duration: UP_MS, easing: SPRING });
  const forget = () => running.get(el) === back && running.delete(el);
  back.addEventListener('finish', forget);
  back.addEventListener('cancel', forget);
}

function release() {
  const press = held;
  if (!press) return;
  held = null;
  const wait = MIN_HOLD - (performance.now() - press.since);
  if (wait > 0) window.setTimeout(() => springBack(press), wait);
  else springBack(press);
}

function onDown(event: PointerEvent) {
  if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
  release();
  const el = event.target instanceof Element ? event.target.closest<HTMLElement>(PRESSABLE) : null;
  if (!el || el.matches(SKIP)) return;
  held = pressDown(el, event);
}

function onMove(event: PointerEvent) {
  if (held && event.isPrimary && Math.hypot(event.clientX - held.x, event.clientY - held.y) > SLOP) release();
}

/** Подключить эффект нажатия ко всему документу; вызывается один раз при запуске */
export function installPressEffect() {
  const options = { capture: true, passive: true } as const;
  document.addEventListener('pointerdown', onDown, options);
  document.addEventListener('pointermove', onMove, options);
  document.addEventListener('pointerup', release, options);
  document.addEventListener('pointercancel', release, options);
  document.addEventListener('dragstart', release, options);
  document.addEventListener('contextmenu', release, options);
  window.addEventListener('blur', release);
}
