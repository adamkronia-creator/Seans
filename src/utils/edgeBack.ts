import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { currentBackHandler } from './backHandler';
import { edgeTouch, guardClick, reducedMotion, runSpring, SWIPE_SLOP, takeOver, VelocityTracker } from './swipe';

/*
 * Жест «назад» как в приложениях на телефоне: потянули экран от левого края — он едет за пальцем, а под ним уже виден
 * тот, куда вернёмся (чуть сдвинутый и затемнённый, как при переходе кнопкой). Отпустили за серединой или взмахнули —
 * экран уезжает и мы возвращаемся; иначе он пружинит на место.
 *
 * Экраны лежат слоями (.screen в App.tsx): верхний data-layer="top", под ним "under". Двигаем их напрямую, без React.
 * Если у верхнего экрана есть своё вложенное «назад» (useBackHandler: поиск в чате, бланк теста), то жест не двигает слои,
 * а вызывает его, когда палец прошёл LOCAL_STEP: вернуться там не на отдельный экран, а в прежнее состояние того же.
 */

/** Полоса у левого края приложения, с которой начинается жест; шире — мешало бы листать разделы и пузырям сообщений */
const EDGE_ZONE = 20;
/** Горизонтальное движение должно заметно перевешивать вертикальное, иначе это прокрутка вниз с дрожанием пальца */
const DOMINANCE = 1.2;
/** Какую долю ширины нужно протянуть (с учётом взмаха), чтобы вернуться, а не вернуть экран на место */
const COMMIT = 0.4;
/** На сколько миллисекунд вперёд «заглядываем» по скорости пальца: быстрый короткий взмах тоже возвращает */
const PROJECT_MS = 140;
/** Насколько экран под верхним сдвинут влево в начале (доля его ширины) и насколько затемнён; те же значения у перехода кнопкой */
const PARALLAX = 0.26;
/** Сколько пройти пальцем, чтобы сработало вложенное «назад» */
const LOCAL_STEP = 48;
/** Если адрес так и не сменился после возврата (идти некуда), через сколько экран возвращается на место */
const COMMIT_WAIT = 700;

const NOT_FROM = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [data-no-swipe]';

type Phase = 'armed' | 'drag' | 'local' | 'ignore';

interface Gesture {
  id: number;
  kind: string;
  startX: number;
  startY: number;
  phase: Phase;
  /** Элемент, на котором начали: ему сообщим, что жест забрали */
  origin: Element;
  width: number;
  /** Палец в момент, когда жест взял экран, и сдвиг верхнего экрана сейчас */
  anchor: number;
  x: number;
  top?: HTMLElement;
  under?: HTMLElement;
  dim?: HTMLElement | null;
  tracker: VelocityTracker;
  releaseGuard?: () => void;
}

interface EdgeBackOptions {
  /** Под текущим экраном есть другой, куда вернуться */
  enabled: boolean;
  /** Экран отыграл и уходит: вызвать возврат по истории */
  onCommit: () => void;
  /** Меняется, когда сменился верхний экран: след жеста (сдвиги слоёв) убирается */
  screenKey: string;
}

/** Подключить жест «назад» к каркасу приложения с экранами-слоями */
export function useEdgeBack(appRef: RefObject<HTMLElement>, { enabled, onCommit, screenKey }: EdgeBackOptions) {
  const live = useRef({ enabled, onCommit });
  const reset = useRef<() => void>(() => undefined);

  useLayoutEffect(() => {
    live.current = { enabled, onCommit };
  });

  // Сменился верхний экран (вернулись или ушли сами): прежние сдвиги слоёв не нужны, делаем это до отрисовки
  useLayoutEffect(() => {
    reset.current();
  }, [screenKey]);

  useEffect(() => {
    const app = appRef.current;
    if (!app) return;

    let gesture: Gesture | null = null;
    /** Экран доезжает (на место или за край); пока едет, новый жест не начинаем */
    let settling: (() => void) | null = null;
    let waitTimer = 0;

    const selectingText = () => {
      const selection = window.getSelection();
      return Boolean(selection && !selection.isCollapsed && selection.anchorNode && app.contains(selection.anchorNode));
    };

    /** Слои возвращаются в обычное состояние: без сдвигов, затемнения и тени */
    const clean = () => {
      window.clearTimeout(waitTimer);
      app.classList.remove('is-edge-dragging');
      document.body.classList.remove('is-edge-back');
      app.querySelectorAll<HTMLElement>(':scope > .screen').forEach((screen) => {
        screen.style.removeProperty('transform');
        screen.querySelector<HTMLElement>(':scope > .screen__dim')?.style.removeProperty('opacity');
      });
    };

    const stopAll = () => {
      settling?.();
      settling = null;
      if (gesture) {
        try {
          app.releasePointerCapture(gesture.id);
        } catch {
          // уже отпущен
        }
        document.documentElement.classList.remove('is-swiping');
        gesture.releaseGuard?.();
        gesture = null;
      }
      edgeTouch.active = false;
      clean();
    };
    reset.current = stopAll;

    const apply = (g: Gesture, x: number) => {
      g.x = x;
      const progress = Math.min(1, Math.max(0, x / g.width));
      if (g.top) g.top.style.transform = `translate3d(${x}px, 0, 0)`;
      if (g.under) g.under.style.transform = `translate3d(${-PARALLAX * (1 - progress) * 100}%, 0, 0)`;
      if (g.dim) g.dim.style.opacity = String(1 - progress);
    };

    /** Отпустили: довести экран до края или вернуть на место, продолжая движение пальца */
    const settle = (g: Gesture, now: number, cancelled: boolean) => {
      const velocity = cancelled ? 0 : g.tracker.velocity(now); // пикселей в миллисекунду
      const commit = !cancelled && g.x + velocity * PROJECT_MS > g.width * COMMIT;
      const to = commit ? g.width : 0;

      const done = () => {
        if (!commit) {
          settling = null;
          return clean();
        }
        // Экран за краем, ждём смены адреса (событие истории придёт чуть позже): до тех пор новый жест не начинаем.
        // Если адрес так и не сменился, экран не должен остаться за краем
        settling = () => undefined;
        live.current.onCommit();
        waitTimer = window.setTimeout(() => {
          settling = null;
          clean();
        }, COMMIT_WAIT);
      };

      if (reducedMotion()) {
        apply(g, to);
        return done();
      }
      settling = runSpring({ from: g.x, to, velocity: velocity * 1000, rest: 0.4, onFrame: (x) => apply(g, x), onDone: done });
    };

    const finish = (now: number, cancelled: boolean) => {
      const g = gesture;
      if (!g) return;
      gesture = null;
      edgeTouch.active = false;
      try {
        app.releasePointerCapture(g.id);
      } catch {
        // уже отпущен
      }
      document.documentElement.classList.remove('is-swiping');
      g.releaseGuard?.();
      if (g.phase === 'drag') settle(g, now, cancelled);
    };

    const onDown = (e: PointerEvent) => {
      edgeTouch.active = false; // каждое новое касание начинается с чистого листа
      if (!e.isPrimary || settling) return;
      if (gesture) finish(e.timeStamp, true); // прежний жест оборвался без отпускания (палец ушёл за окно)
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (!live.current.enabled && !currentBackHandler()) return;
      const box = app.getBoundingClientRect();
      const fromEdge = e.clientX - box.left;
      if (fromEdge < 0 || fromEdge > EDGE_ZONE) return;
      const origin = e.target instanceof Element ? e.target : null;
      // В поле ввода жест принадлежит полю; открытое меню и подобное закрывают экран собой (data-no-swipe)
      if (!origin || origin.closest(NOT_FROM)) return;
      edgeTouch.active = true;
      gesture = {
        id: e.pointerId,
        kind: e.pointerType,
        startX: e.clientX,
        startY: e.clientY,
        phase: 'armed',
        origin,
        width: app.clientWidth || 1,
        anchor: 0,
        x: 0,
        tracker: new VelocityTracker(),
      };
    };

    const onMove = (e: PointerEvent) => {
      const g = gesture;
      if (!g || e.pointerId !== g.id || g.phase === 'ignore') return;

      if (g.phase === 'armed') {
        const dx = e.clientX - g.startX;
        const dy = e.clientY - g.startY;
        const ax = Math.abs(dx);
        const ay = Math.abs(dy);
        if (ax <= SWIPE_SLOP && ay <= SWIPE_SLOP) return;
        // Вниз, вверх или от края наружу — не наше (прокрутка остаётся за браузером)
        if (dx <= 0 || ax < ay * DOMINANCE || (g.kind === 'mouse' && selectingText())) {
          g.phase = 'ignore';
          return;
        }
        const nested = currentBackHandler();
        const top = app.querySelector<HTMLElement>(':scope > .screen[data-layer="top"]');
        const under = app.querySelector<HTMLElement>(':scope > .screen[data-layer="under"]');
        if (!nested && (!top || !under)) {
          g.phase = 'ignore';
          return;
        }
        takeOver(app, g.origin, e);
        g.releaseGuard = guardClick();
        document.documentElement.classList.add('is-swiping');
        if (g.kind === 'mouse') window.getSelection()?.removeAllRanges();
        g.anchor = e.clientX;
        g.tracker.push(e.timeStamp, e.clientX);
        if (nested) {
          g.phase = 'local';
          return;
        }
        g.phase = 'drag';
        g.top = top!;
        g.under = under!;
        g.dim = under!.querySelector<HTMLElement>(':scope > .screen__dim');
        app.classList.add('is-edge-dragging');
        document.body.classList.add('is-edge-back');
        apply(g, 0);
        return;
      }

      g.tracker.push(e.timeStamp, e.clientX);
      if (g.phase === 'drag') {
        apply(g, Math.min(g.width, Math.max(0, e.clientX - g.anchor)));
      } else if (e.clientX - g.anchor >= LOCAL_STEP) {
        g.phase = 'ignore'; // сработало один раз; дальше палец ничего не делает
        currentBackHandler()?.();
      }
    };

    const onUp = (e: PointerEvent) => {
      if (gesture && e.pointerId === gesture.id) finish(e.timeStamp, false);
    };

    // Событие отмены, которое мы сами разослали при захвате, жеста не касается
    const onCancel = (e: PointerEvent) => {
      if (e.isTrusted && gesture && e.pointerId === gesture.id) finish(e.timeStamp, true);
    };

    // Указатель забрала система. Событие всплывает и от тех, у кого забрали указатель мы сами: нужен только наш собственный
    const onLostCapture = (e: PointerEvent) => {
      if (e.target === app && gesture && gesture.phase !== 'armed' && e.pointerId === gesture.id) finish(e.timeStamp, true);
    };

    // Мышью картинки и ссылки не перетаскиваются: иначе браузер начнёт своё перетаскивание и жест оборвётся
    const onDragStart = (e: Event) => {
      if (gesture) e.preventDefault();
    };

    app.addEventListener('pointerdown', onDown, true);
    app.addEventListener('pointermove', onMove);
    app.addEventListener('pointerup', onUp);
    app.addEventListener('pointercancel', onCancel);
    app.addEventListener('lostpointercapture', onLostCapture);
    app.addEventListener('dragstart', onDragStart);
    return () => {
      app.removeEventListener('pointerdown', onDown, true);
      app.removeEventListener('pointermove', onMove);
      app.removeEventListener('pointerup', onUp);
      app.removeEventListener('pointercancel', onCancel);
      app.removeEventListener('lostpointercapture', onLostCapture);
      app.removeEventListener('dragstart', onDragStart);
      stopAll();
      reset.current = () => undefined;
    };
  }, [appRef]);
}
