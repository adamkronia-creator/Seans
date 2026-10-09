import { startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import {
  canScrollSideways,
  edgeTouch,
  elastic,
  fingerOwner,
  flingScroll,
  guardClick,
  reducedMotion,
  runSpring,
  setPaging,
  setSwiping,
  SWIPE_SLOP,
  takeOver,
  VelocityTracker,
  wheelTaken,
} from '../../utils/swipe';
import './SwipePager.css';

export interface PagerPage {
  key: string;
  node: ReactNode;
}

interface SwipePagerProps {
  /** Номер показанной страницы. Меняется и снаружи (нажали на вкладку), и жестом: о жесте сообщает onIndexChange */
  index: number;
  pages: PagerPage[];
  onIndexChange: (index: number) => void;
  /** Положение в страницах, дробное (1,4 — между второй и третьей): вызывается на каждом кадре движения, чтобы шапка шла за пальцем */
  onPosition?: (position: number) => void;
  /** Пока страницы ведёт палец: положение в страницах (дробное), а когда палец отпустили, null. По нему чипсы подсвечивают страницу под пальцем, не дожидаясь отпускания */
  onDrag?: (position: number | null) => void;
  /** Пейджер лежит внутри страницы другого пейджера: когда листать некуда, жест отдаётся внешнему, а не упирается в резинку */
  nested?: boolean;
  /** Высота по странице, а не по окну (пейджер внутри прокручиваемого блока); пока страницы идут, по самой высокой из видимых */
  autoHeight?: boolean;
  /** Над страницами, но в окне жеста: за пальцем не едет (только с autoHeight) */
  header?: ReactNode;
  className?: string;
}

/** Какую долю страницы нужно протянуть (с учётом взмаха), чтобы она перевернулась, а не вернулась обратно */
const COMMIT = 0.3;
/** На сколько секунд вперёд «заглядываем» по скорости пальца: короткий быстрый взмах тоже переворачивает страницу */
const PROJECT = 0.16;
/** Горизонтальное движение должно заметно перевешивать вертикальное, иначе это прокрутка вниз с дрожанием пальца */
const DOMINANCE = 1.2;
/** Двумя пальцами по тачпаду: сколько проехать, чтобы страница перевернулась */
const WHEEL_STEP = 60;

type Mode = 'idle' | 'drag' | 'inner' | 'ignore';

interface Gesture {
  id: number;
  kind: string;
  startX: number;
  startY: number;
  mode: Mode;
  /** Элемент, на котором начали: ему сообщим, что жест забрали */
  origin: Element;
  /** Блок с боковой прокруткой под пальцем (чипсы фильтров) */
  scroller: HTMLElement | null;
  /** Начали на пузыре: вправо там тянет ответ, а не страницу */
  locked: boolean;
  width: number;
  /** Положение страницы и палец в момент, когда пейджер взял жест на себя */
  base: number;
  anchorX: number;
  scrollBase: number;
  tracker: VelocityTracker;
  releaseGuard?: () => void;
}

/**
 * Высота окна: у страницы на месте — её собственная, а пока страницы идут, самой высокой из них. Плавно её не меняем:
 * на каждом кадре это заставляло бы браузер заново раскладывать и рисовать прокручиваемый блок (на слабом телефоне кадры рвались),
 * а увидеть можно было бы разве что размах прокрутки, потому что страницы прижаты кверху и под короткой пусто.
 * Страницы, которые ещё не нарисованы (высота 0), не считаются: для страницы на месте берётся ближайшая известная.
 */
function heightAt(heights: number[], position: number): number {
  const last = heights.length - 1;
  if (last < 0) return 0;
  const nearest = Math.max(0, Math.min(last, Math.round(position)));
  if (Math.abs(position - nearest) > 0.001) {
    let tallest = 0;
    for (const height of heights) if (height > tallest) tallest = height;
    return tallest;
  }
  if (heights[nearest] > 0) return heights[nearest];
  for (let step = 1; step <= last; step += 1) {
    const known = Math.max(heights[nearest - step] || 0, heights[nearest + step] || 0);
    if (known > 0) return known;
  }
  return 0;
}

/** Ближайший предок с вертикальной прокруткой */
function scrollParentOf(el: Element | null): HTMLElement | null {
  for (let node = el?.parentElement ?? null; node; node = node.parentElement) {
    const overflow = getComputedStyle(node).overflowY;
    if (overflow === 'auto' || overflow === 'scroll') return node;
  }
  return null;
}

/** Размеры, от которых зависит, с какой вертикальной прокруткой страница встанет на место */
interface ScrollMetrics {
  /** Где в прокручиваемом блоке начинаются страницы (над ними шапка) */
  pagesTop: number;
  /** Сколько в прокручиваемом блоке всего, кроме самих страниц */
  others: number;
  /** Высота видимой части блока */
  client: number;
}

/**
 * Страницы в ряд, которые листаются пальцем и идут за ним: чат переключает так разделы
 * (сообщения, тесты, задания, кейс, история), список чатов и история взаимодействия — фильтры по чипсам.
 * Однажды показанная страница остаётся в разметке, поэтому у неё сохраняются прокрутка и введённое; неактивные
 * недоступны для нажатий и клавиатуры (inert). Рисуются страницы не все сразу (открытие чата стало бы заметно
 * дольше): сначала текущая, остальные дорисовываются в простое, начиная с ближайших, а если жест тянет к ещё
 * не нарисованной, она рисуется в тот же миг.
 *
 * Как договариваются жесты:
 *  - вертикальная прокрутка остаётся за браузером (touch-action: pan-y), пейджер берёт только горизонтальное движение;
 *  - блок с data-hscroll (чипсы) сам прокручивается вбок, пока есть куда, а на краю движение переходит к пейджеру;
 *  - data-swipe-lock="right" (пузырь сообщения): вправо жест остаётся у пузыря — это ответ, влево листает страницу;
 *  - поля ввода и data-no-swipe пейджер не трогает;
 *  - пейджеры вложены друг в друга (фильтры истории внутри раздела чата): палец ведёт внутренний, пока ему есть
 *    куда листать, а на его краю тот же жест листает внешний.
 * Мышью тоже можно тянуть (там, где не выделяется текст), а двухпальцевый жест по тачпаду листает страницы шагами.
 */
export function SwipePager({ index, pages, onIndexChange, onPosition, onDrag, nested = false, autoHeight = false, header, className }: SwipePagerProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  /** Обрезка по высоте страницы (только autoHeight): меняется её высота, а ряд страниц остаётся своего размера */
  const body = useRef<HTMLDivElement>(null);
  /** Где страницы сейчас, в номерах страниц: 0 — первая, 1,5 — на полпути ко второй */
  const position = useRef(index);
  /** К какой странице идём */
  const target = useRef(index);
  const stopSpring = useRef<(() => void) | null>(null);
  const live = useRef({ index, count: pages.length, onIndexChange, onPosition, onDrag, nested, autoHeight });
  /** Собственная метка пейджера: по ней полоса прокрутки приложения знает, что страницы между местами */
  const self = useRef({}).current;
  /** Высоты страниц по номерам (для autoHeight); у ненарисованной 0 */
  const heights = useRef<number[]>([]);
  /** Какая высота стоит у окна сейчас: на каждом кадре без нужды стиль не трогаем */
  const appliedHeight = useRef(0);
  /**
   * Вертикальная прокрутка (только autoHeight): прокручивается блок снаружи, и она одна на все страницы. Пока страницы
   * между местами, `moving`; `page` — та, под которую прокрутка сейчас выставлена.
   */
  const rest = useRef<{ page: number; moving: boolean; scroller: HTMLElement | null }>({ page: index, moving: false, scroller: null });

  /** Какие страницы уже нарисованы (текущая рисуется всегда) */
  const [loaded, setLoaded] = useState<ReadonlySet<number>>(() => new Set([index]));
  const loadedNow = useRef(loaded);

  useLayoutEffect(() => {
    live.current = { index, count: pages.length, onIndexChange, onPosition, onDrag, nested, autoHeight };
    loadedNow.current = loaded;
  });

  // Страница, на которую пришли, остаётся нарисованной и после ухода: прокрутка и введённое не теряются
  useEffect(() => {
    setLoaded((prev) => (prev.has(index) ? prev : new Set(prev).add(index)));
  }, [index]);

  // Остальные дорисовываются по одной в простое, сначала ближайшие. Пока страницы движутся или их тянут, ждём
  useEffect(() => {
    let next = -1;
    for (let i = 0; i < pages.length; i += 1) {
      if (!loaded.has(i) && i !== index && (next < 0 || Math.abs(i - index) < Math.abs(next - index))) next = i;
    }
    if (next < 0) return;
    let timer = 0;
    let idle = 0;
    const load = () => {
      if (document.body.classList.contains('is-paging') || document.documentElement.classList.contains('is-swiping')) {
        timer = window.setTimeout(load, 300);
        return;
      }
      startTransition(() => setLoaded((prev) => (prev.has(next) ? prev : new Set(prev).add(next))));
    };
    const whenIdle = () => {
      // У Safari requestIdleCallback нет: там просто чуть позже
      if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(load, { timeout: 1500 });
      else timer = window.setTimeout(load, 50);
    };
    // Первая — когда уже закончилась анимация открытия и палец мог начать листать; дальше с небольшими паузами
    timer = window.setTimeout(whenIdle, loaded.size <= 1 ? 600 : 200);
    return () => {
      window.clearTimeout(timer);
      if (idle) window.cancelIdleCallback?.(idle);
    };
  }, [loaded, index, pages.length]);

  /** Нарисовать страницу немедленно: к ней уже тянут палец, а она ещё не готова */
  const ensureLoaded = useCallback((i: number) => {
    if (i < 0 || i >= live.current.count || i === live.current.index || loadedNow.current.has(i)) return;
    flushSync(() => setLoaded((prev) => (prev.has(i) ? prev : new Set(prev).add(i))));
  }, []);

  const scrollerEl = useCallback(() => {
    const r = rest.current;
    if (!r.scroller?.isConnected) r.scroller = scrollParentOf(viewport.current);
    return r.scroller;
  }, []);

  const metricsOf = useCallback((scroller: HTMLElement): ScrollMetrics | null => {
    const bodyEl = body.current;
    if (!bodyEl) return null;
    return {
      pagesTop: bodyEl.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop,
      others: scroller.scrollHeight - bodyEl.offsetHeight,
      client: scroller.clientHeight,
    };
  }, []);

  /**
   * С какой прокруткой страница `i` встанет на место, если сейчас она `top`. Пока шапка над страницами видна, прокрутка
   * остаётся прежней (но не ниже, чем лента позволяет). Ушла шапка вверх — новая лента открывается с начала, а не с того
   * места, где остановилась прежняя: у другого фильтра там могло бы быть пусто или хвост.
   */
  const topFor = useCallback((m: ScrollMetrics, i: number, top: number) => Math.round(Math.min(top, m.pagesTop, Math.max(0, m.others + (heights.current[i] || 0) - m.client))), []);

  /**
   * Страницы пошли: у каждой, кроме той, с которой начали, свой сдвиг по вертикали, так что она нарисована там, где встанет.
   * Иначе страница, к которой идут, была бы показана с чужой прокруткой (пустой) и в конце прыгнула бы на место.
   */
  const shiftPages = useCallback(() => {
    const r = rest.current;
    r.moving = true;
    const scroller = scrollerEl();
    const pages = track.current?.children;
    const m = scroller && pages ? metricsOf(scroller) : null;
    if (!scroller || !pages || !m) return;
    const top = scroller.scrollTop;
    Array.from(pages).forEach((page, i) => {
      const shift = i !== r.page && heights.current[i] > 0 ? Math.round(top - topFor(m, i, top)) : 0;
      (page as HTMLElement).style.transform = shift > 0 ? `translateY(${shift}px)` : '';
    });
  }, [metricsOf, scrollerEl, topFor]);

  /** Страницы встали на место: прокрутка — под страницу, сдвиги сняты (картинка при этом не меняется) */
  const land = useCallback(
    (page: number) => {
      const r = rest.current;
      if (page === r.page && !r.moving) return;
      if (page !== r.page && heights.current[page] > 0) {
        const scroller = scrollerEl();
        const m = scroller ? metricsOf(scroller) : null;
        if (scroller && m) scroller.scrollTop = topFor(m, page, scroller.scrollTop);
      }
      r.page = page;
      r.moving = false;
      Array.from(track.current?.children ?? []).forEach((el) => {
        (el as HTMLElement).style.transform = '';
      });
    },
    [metricsOf, scrollerEl, topFor],
  );

  /** Узнать высоты нарисованных страниц */
  const measure = useCallback(() => {
    if (!live.current.autoHeight || !track.current) return;
    Array.from(track.current.children).forEach((page, i) => {
      heights.current[i] = (page as HTMLElement).offsetHeight;
    });
    if (rest.current.moving) shiftPages();
  }, [shiftPages]);

  const applyHeight = useCallback((value: number) => {
    if (!live.current.autoHeight || !body.current) return;
    const height = heightAt(heights.current, value);
    if (height > 0 && height !== appliedHeight.current) {
      appliedHeight.current = height;
      body.current.style.height = `${height}px`;
    }
  }, []);

  const apply = useCallback(
    (value: number) => {
      position.current = value;
      if (track.current) track.current.style.transform = `translate3d(${-value * 100}%, 0, 0)`;
      const between = Math.abs(value - Math.round(value)) > 0.001;
      if (live.current.autoHeight) {
        if (!between) land(Math.min(live.current.count - 1, Math.max(0, Math.round(value))));
        else if (!rest.current.moving) shiftPages();
      }
      applyHeight(value);
      // Пока страницы между местами, полоса прокрутки приложения прячется: она бы показывала прокрутку уезжающей страницы
      setPaging(self, between);
      live.current.onPosition?.(value);
    },
    [applyHeight, land, shiftPages, self],
  );

  /** Довести страницы до цели пружиной; velocity — страниц в секунду, чтобы продолжить взмах */
  const settle = useCallback(
    (to: number, velocity = 0) => {
      stopSpring.current?.();
      stopSpring.current = null;
      if (reducedMotion() || (Math.abs(position.current - to) < 0.0005 && Math.abs(velocity) < 0.01)) {
        apply(to);
        return;
      }
      stopSpring.current = runSpring({
        from: position.current,
        to,
        velocity,
        onFrame: apply,
        onDone: () => {
          stopSpring.current = null;
        },
      });
    },
    [apply],
  );

  // Страница нарисовалась или сменилась: высота окна по ней. Раньше эффекта, который ставит страницы на место
  useLayoutEffect(() => {
    measure();
    applyHeight(position.current);
  }, [loaded, index, measure, applyHeight]);

  // Содержимое страницы выросло или сжалось (правка текста, окно стало уже): высота окна идёт следом
  useLayoutEffect(() => {
    const trackEl = track.current;
    if (!autoHeight || !trackEl || typeof ResizeObserver === 'undefined') return;
    const watcher = new ResizeObserver(() => {
      measure();
      applyHeight(position.current);
    });
    Array.from(trackEl.children).forEach((page) => watcher.observe(page));
    return () => watcher.disconnect();
  }, [autoHeight, pages.length, measure, applyHeight]);

  // Пока страницы идут, прокрутку блока могут сдвинуть колесом: сдвиги страниц пересчитываются
  useEffect(() => {
    if (!autoHeight) return;
    const scroller = scrollerEl();
    if (!scroller) return;
    const onScroll = () => {
      if (rest.current.moving) shiftPages();
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, [autoHeight, scrollerEl, shiftPages]);

  // Страницы встают на место сразу, без движения: при открытии чата и после возврата из теста
  useLayoutEffect(() => {
    target.current = live.current.index;
    apply(live.current.index);
    return () => {
      stopSpring.current?.();
      setPaging(self, false);
    };
  }, [apply, self]);

  // Сменили страницу снаружи (нажали на вкладку в шапке): едем к ней
  useEffect(() => {
    if (target.current === index) return;
    target.current = index;
    settle(index);
  }, [index, settle]);

  // Неактивные страницы не получают нажатий и фокуса; сняв фокус с поля ввода, это же прячет клавиатуру телефона
  useLayoutEffect(() => {
    Array.from(track.current?.children ?? []).forEach((page, i) => {
      (page as HTMLElement).inert = i !== index;
    });
  }, [index, pages.length]);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;

    let gesture: Gesture | null = null;
    let stopFling: (() => void) | null = null;

    /** Тянут за край: страницы идут за пальцем с нарастающим сопротивлением */
    const withResistance = (raw: number) => {
      const last = live.current.count - 1;
      if (raw < 0) return -elastic(-raw);
      if (raw > last) return last + elastic(raw - last);
      return raw;
    };

    /** Есть ли куда листать, когда палец едет на dx (влево — к следующей странице) */
    const canPage = (dx: number) => (dx < 0 ? position.current < live.current.count - 1 - 0.001 : position.current > 0.001);

    const selectingText = () => {
      const selection = window.getSelection();
      return Boolean(selection && !selection.isCollapsed && selection.anchorNode && el.contains(selection.anchorNode));
    };

    /** Пейджер или прокрутка внутри берут жест себе: остальным (пузырь ждёт долгого нажатия, кнопка подсвечена) сообщаем об отмене */
    const claim = (g: Gesture, e: PointerEvent) => {
      fingerOwner.take(g.id, el);
      takeOver(el, g.origin, e);
      g.releaseGuard = guardClick();
      setSwiping(true, g.kind);
      if (g.kind === 'mouse') window.getSelection()?.removeAllRanges();
    };

    const go = (to: number, velocity = 0) => {
      const clamped = Math.min(live.current.count - 1, Math.max(0, to));
      target.current = clamped;
      if (clamped !== live.current.index) live.current.onIndexChange(clamped);
      settle(clamped, velocity);
    };

    const finish = (now: number, cancelled: boolean) => {
      const g = gesture;
      if (!g) return;
      gesture = null;
      fingerOwner.drop(g.id, el);
      try {
        el.releasePointerCapture(g.id);
      } catch {
        // уже отпущен
      }
      setSwiping(false);
      g.releaseGuard?.();

      if (g.mode === 'drag') {
        // Страниц в секунду; палец вправо двигает к предыдущей странице, то есть уменьшает номер
        const speed = cancelled ? 0 : (-g.tracker.velocity(now) * 1000) / g.width;
        const from = Math.round(g.base);
        const moved = position.current + speed * PROJECT - from;
        const step = moved > COMMIT ? 1 : moved < -COMMIT ? -1 : 0;
        go(from + step, speed);
        live.current.onDrag?.(null);
      } else if (g.mode === 'inner' && g.scroller && !cancelled) {
        stopFling = flingScroll(g.scroller, -g.tracker.velocity(now));
      }
    };

    const onDown = (e: PointerEvent) => {
      if (!e.isPrimary || edgeTouch.active) return; // у левого края касание принадлежит жесту «назад»
      if (gesture) finish(e.timeStamp, true); // прежний жест оборвался без отпускания (палец ушёл за окно)
      const origin = e.target instanceof Element ? e.target : null;
      if (!origin) return;
      const scroller = origin.closest<HTMLElement>('[data-hscroll]');
      // Мышью тянем только левой кнопкой; в поле ввода жест принадлежит полю (поставить курсор, выделить)
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (origin.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [data-no-swipe]')) return;
      stopFling?.();
      stopFling = null;
      gesture = {
        id: e.pointerId,
        kind: e.pointerType,
        startX: e.clientX,
        startY: e.clientY,
        mode: 'idle',
        origin,
        scroller,
        locked: Boolean(origin.closest('[data-swipe-lock~="right"]')) && !origin.closest('button, a'),
        width: el.clientWidth || 1,
        base: 0,
        anchorX: 0,
        scrollBase: 0,
        tracker: new VelocityTracker(),
      };
    };

    const onMove = (e: PointerEvent) => {
      const g = gesture;
      if (!g || e.pointerId !== g.id || g.mode === 'ignore') return;

      if (g.mode === 'idle') {
        const dx = e.clientX - g.startX;
        const dy = e.clientY - g.startY;
        const ax = Math.abs(dx);
        const ay = Math.abs(dy);
        if (ax <= SWIPE_SLOP && ay <= SWIPE_SLOP) return;
        if (ax <= SWIPE_SLOP || ax < ay * DOMINANCE) {
          // Больше вниз или вверх: прокрутка остаётся за браузером
          if (ay > SWIPE_SLOP) g.mode = 'ignore';
          return;
        }
        // Палец уже ведёт вложенный пейджер: событие всплыло к внешнему тем же движением, он его не берёт
        const owner = fingerOwner.of(g.id);
        if (owner && owner !== el) {
          g.mode = 'ignore';
          return;
        }
        // Чипсы и подобные блоки сами едут за пальцем, пока есть куда
        if (g.scroller && canScrollSideways(g.scroller, dx)) {
          g.mode = 'inner';
          g.scrollBase = g.scroller.scrollLeft;
        } else if (g.locked && dx > 0) {
          g.mode = 'ignore'; // на пузыре вправо — ответ
          return;
        } else if (g.kind === 'mouse' && selectingText()) {
          g.mode = 'ignore'; // мышью выделяют текст
          return;
        } else if (live.current.nested && !canPage(dx)) {
          g.mode = 'ignore'; // этому пейджеру листать некуда: то же движение достанется внешнему
          return;
        } else {
          g.mode = 'drag';
          stopSpring.current?.(); // схватили страницы на ходу: дальше ведёт палец
          stopSpring.current = null;
          g.base = position.current;
          // Страница, к которой тянут, должна быть готова, а не появляться пустой
          ensureLoaded(dx < 0 ? Math.floor(g.base) + 1 : Math.ceil(g.base) - 1);
          measure();
        }
        g.anchorX = e.clientX;
        claim(g, e);
        g.tracker.push(e.timeStamp, e.clientX);
        if (g.mode === 'drag') live.current.onDrag?.(position.current);
        return;
      }

      g.tracker.push(e.timeStamp, e.clientX);
      if (g.mode === 'drag') {
        const next = withResistance(g.base - (e.clientX - g.anchorX) / g.width);
        // Палец мог развернуться: страницы с обеих сторон должны быть готовы, а не появляться пустыми
        ensureLoaded(Math.floor(next));
        ensureLoaded(Math.ceil(next));
        apply(next);
        live.current.onDrag?.(position.current);
      } else if (g.scroller) {
        const room = g.scroller.scrollWidth - g.scroller.clientWidth;
        g.scroller.scrollLeft = Math.min(room, Math.max(0, g.scrollBase - (e.clientX - g.anchorX)));
      }
    };

    const onUp = (e: PointerEvent) => {
      if (gesture && e.pointerId === gesture.id) finish(e.timeStamp, false);
    };

    // Событие отмены, которое мы сами разослали в claim, пейджера не касается
    const onCancel = (e: PointerEvent) => {
      if (e.isTrusted && gesture && e.pointerId === gesture.id) finish(e.timeStamp, true);
    };

    // Пейджер потерял жест (система забрала палец). Событие всплывает от тех, у кого забрали указатель мы сами, их пропускаем
    const onLostCapture = (e: PointerEvent) => {
      if (e.target === el && gesture && gesture.mode !== 'idle' && e.pointerId === gesture.id) finish(e.timeStamp, true);
    };

    // Мышью картинки и ссылки не перетаскиваются: иначе браузер начнёт своё перетаскивание и жест оборвётся
    const onDragStart = (e: Event) => e.preventDefault();

    // Колесо и тачпад: чипсы едут вбок, а двухпальцевый жест листает страницы шагами
    let wheelSum = 0;
    let wheelLast = 0;
    let wheelDone = false;
    /** Жест колеса ведёт этот пейджер (вложенный берёт его, только если ему есть куда листать) */
    let wheelMine = true;
    const onWheel = (e: WheelEvent) => {
      if (wheelTaken.has(e) || e.ctrlKey || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      const scroller = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-hscroll]') : null;
      if (scroller && canScrollSideways(scroller, -e.deltaX)) {
        scroller.scrollLeft += e.deltaX;
        e.preventDefault();
        wheelTaken.add(e);
        return;
      }
      if (e.target instanceof Element && e.target.closest('input, textarea, [contenteditable]:not([contenteditable="false"]), [data-no-swipe]')) return;
      // Пауза в событиях — новый жест; хвост инерции тачпада после шага игнорируем
      if (e.timeStamp - wheelLast > 200) {
        wheelSum = 0;
        wheelDone = false;
        wheelMine = !live.current.nested || (e.deltaX > 0 ? target.current < live.current.count - 1 : target.current > 0);
      }
      wheelLast = e.timeStamp;
      if (!wheelMine) return;
      e.preventDefault(); // браузер не должен листать историю вместо нас
      wheelTaken.add(e);
      if (wheelDone) return;
      wheelSum += e.deltaX;
      if (Math.abs(wheelSum) < WHEEL_STEP) return;
      wheelDone = true;
      go(target.current + Math.sign(wheelSum));
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);
    el.addEventListener('lostpointercapture', onLostCapture);
    el.addEventListener('dragstart', onDragStart);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
      el.removeEventListener('lostpointercapture', onLostCapture);
      el.removeEventListener('dragstart', onDragStart);
      el.removeEventListener('wheel', onWheel);
      // Чат закрылся посреди жеста: просто сбрасываем, доводить уже нечего
      if (gesture) {
        fingerOwner.drop(gesture.id, el);
        setSwiping(false);
        gesture.releaseGuard?.();
        gesture = null;
      }
      stopFling?.();
    };
  }, [apply, settle, ensureLoaded, measure]);

  const row = (
    <div ref={track} className="swipe-pager__track">
      {pages.map((page, i) => (
        <div key={page.key} className="swipe-pager__page">
          {i === index || loaded.has(i) ? page.node : null}
        </div>
      ))}
    </div>
  );

  return (
    <div
      ref={viewport}
      className={`swipe-pager${autoHeight ? ' swipe-pager--auto' : ''}${className ? ` ${className}` : ''}`}
      data-page={index}
    >
      {header && <div className="swipe-pager__head">{header}</div>}
      {autoHeight ? (
        <div ref={body} className="swipe-pager__body">
          {row}
        </div>
      ) : (
        row
      )}
    </div>
  );
}
