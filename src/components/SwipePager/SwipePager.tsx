import { startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { canScrollSideways, elastic, flingScroll, guardClick, reducedMotion, runSpring, SWIPE_SLOP, VelocityTracker } from '../../utils/swipe';
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
 * Страницы в ряд, которые листаются пальцем и идут за ним: чат переключает так разделы
 * (сообщения, тесты, задания, кейс, история). Однажды показанная страница остаётся в разметке, поэтому у неё
 * сохраняются прокрутка и введённое; неактивные недоступны для нажатий и клавиатуры (inert).
 * Рисуются страницы не все сразу (открытие чата стало бы заметно дольше): сначала текущая, остальные дорисовываются
 * в простое, начиная с ближайших, а если жест тянет к ещё не нарисованной, она рисуется в тот же миг.
 *
 * Как договариваются жесты:
 *  - вертикальная прокрутка остаётся за браузером (touch-action: pan-y), пейджер берёт только горизонтальное движение;
 *  - блок с data-hscroll (чипсы) сам прокручивается вбок, пока есть куда, а на краю движение переходит к пейджеру;
 *  - data-swipe-lock="right" (пузырь сообщения): вправо жест остаётся у пузыря — это ответ, влево листает страницу;
 *  - поля ввода и data-no-swipe пейджер не трогает.
 * Мышью тоже можно тянуть (там, где не выделяется текст), а двухпальцевый жест по тачпаду листает страницы шагами.
 */
export function SwipePager({ index, pages, onIndexChange, onPosition, className }: SwipePagerProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  /** Где страницы сейчас, в номерах страниц: 0 — первая, 1,5 — на полпути ко второй */
  const position = useRef(index);
  /** К какой странице идём */
  const target = useRef(index);
  const stopSpring = useRef<(() => void) | null>(null);
  const live = useRef({ index, count: pages.length, onIndexChange, onPosition });

  /** Какие страницы уже нарисованы (текущая рисуется всегда) */
  const [loaded, setLoaded] = useState<ReadonlySet<number>>(() => new Set([index]));
  const loadedNow = useRef(loaded);

  useLayoutEffect(() => {
    live.current = { index, count: pages.length, onIndexChange, onPosition };
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

  const apply = useCallback((value: number) => {
    position.current = value;
    if (track.current) track.current.style.transform = `translate3d(${-value * 100}%, 0, 0)`;
    // Пока страницы между местами, полоса прокрутки приложения прячется: она бы показывала прокрутку уезжающей страницы
    document.body.classList.toggle('is-paging', Math.abs(value - Math.round(value)) > 0.001);
    live.current.onPosition?.(value);
  }, []);

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

  // Страницы встают на место сразу, без движения: при открытии чата и после возврата из теста
  useLayoutEffect(() => {
    target.current = live.current.index;
    apply(live.current.index);
    return () => {
      stopSpring.current?.();
      document.body.classList.remove('is-paging');
    };
  }, [apply]);

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

    const selectingText = () => {
      const selection = window.getSelection();
      return Boolean(selection && !selection.isCollapsed && selection.anchorNode && el.contains(selection.anchorNode));
    };

    /** Пейджер или прокрутка внутри берут жест себе: остальным (пузырь ждёт долгого нажатия, кнопка подсвечена) сообщаем об отмене */
    const claim = (g: Gesture, e: PointerEvent) => {
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // указатель уже снят: жест всё равно доведём по событиям
      }
      if (g.origin.isConnected) {
        g.origin.dispatchEvent(
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
      g.releaseGuard = guardClick();
      document.documentElement.classList.add('is-swiping');
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
      try {
        el.releasePointerCapture(g.id);
      } catch {
        // уже отпущен
      }
      document.documentElement.classList.remove('is-swiping');
      g.releaseGuard?.();

      if (g.mode === 'drag') {
        // Страниц в секунду; палец вправо двигает к предыдущей странице, то есть уменьшает номер
        const speed = cancelled ? 0 : (-g.tracker.velocity(now) * 1000) / g.width;
        const from = Math.round(g.base);
        const moved = position.current + speed * PROJECT - from;
        const step = moved > COMMIT ? 1 : moved < -COMMIT ? -1 : 0;
        go(from + step, speed);
      } else if (g.mode === 'inner' && g.scroller && !cancelled) {
        stopFling = flingScroll(g.scroller, -g.tracker.velocity(now));
      }
    };

    const onDown = (e: PointerEvent) => {
      if (!e.isPrimary) return;
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
        } else {
          g.mode = 'drag';
          stopSpring.current?.(); // схватили страницы на ходу: дальше ведёт палец
          stopSpring.current = null;
          g.base = position.current;
          // Страница, к которой тянут, должна быть готова, а не появляться пустой
          ensureLoaded(dx < 0 ? Math.floor(g.base) + 1 : Math.ceil(g.base) - 1);
        }
        g.anchorX = e.clientX;
        claim(g, e);
        g.tracker.push(e.timeStamp, e.clientX);
        return;
      }

      g.tracker.push(e.timeStamp, e.clientX);
      if (g.mode === 'drag') {
        apply(withResistance(g.base - (e.clientX - g.anchorX) / g.width));
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
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      const scroller = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-hscroll]') : null;
      if (scroller && canScrollSideways(scroller, -e.deltaX)) {
        scroller.scrollLeft += e.deltaX;
        e.preventDefault();
        return;
      }
      if (e.target instanceof Element && e.target.closest('input, textarea, [contenteditable]:not([contenteditable="false"]), [data-no-swipe]')) return;
      e.preventDefault(); // браузер не должен листать историю вместо нас
      // Пауза в событиях — новый жест; хвост инерции тачпада после шага игнорируем
      if (e.timeStamp - wheelLast > 200) {
        wheelSum = 0;
        wheelDone = false;
      }
      wheelLast = e.timeStamp;
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
        document.documentElement.classList.remove('is-swiping');
        gesture.releaseGuard?.();
        gesture = null;
      }
      stopFling?.();
    };
  }, [apply, settle, ensureLoaded]);

  return (
    <div ref={viewport} className={`swipe-pager${className ? ` ${className}` : ''}`} data-page={index}>
      <div ref={track} className="swipe-pager__track">
        {pages.map((page, i) => (
          <div key={page.key} className="swipe-pager__page">
            {i === index || loaded.has(i) ? page.node : null}
          </div>
        ))}
      </div>
    </div>
  );
}
