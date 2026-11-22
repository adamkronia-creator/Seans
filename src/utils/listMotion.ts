import { useLayoutEffect, useRef, type RefObject } from 'react';
import { flip } from './flip';

/*
 * Строки живых списков не прыгают, когда данные меняются (закрепили чат, вернули из архива, поставили поле выше, добавили папку):
 *   — перестановка: оставшиеся строки плавно едут на новое место (FLIP: прежнее место запомнено при прошлом показе, переезд играет в этом);
 *   — новая строка проявляется, а те, что ниже, уступают ей место;
 *   — ушедшая строка оставляет на своём месте копию, которая схлопывается и тает (leave); стили копии — .row-ghost в styles/micro.css.
 * Строками считаются прямые потомки списка с атрибутом attr (по умолчанию data-row), в нём лежит id строки.
 * Потомок с атрибутом data-flip (кнопка «Создать» под строками) не строка, но тоже уступает место и переезжает вместе с ними.
 * По умолчанию строки двигаются в пределах одного вида. animateViewChange включает переход и при смене вида.
 * Список с атрибутом data-motion-off (строку в этот момент тащат пальцем) не трогаем. При «уменьшении движения» всё меняется сразу.
 */

interface Snap {
  el: HTMLElement;
  size: number;
  /** Номер среди потомков списка без копий: туда ставится копия ушедшей строки */
  at: number;
}

interface ListMotionOptions {
  /** Атрибут с id строки */
  attr?: string;
  /** Что сейчас показано (запрос, фильтр): пока значение то же, перестановки считаются движением; когда сменилось — строки просто заменились */
  view?: string;
  /** Позволяет анимировать переход к новому виду, в том числе из пустой выдачи */
  animateViewChange?: boolean;
  /** Направление списка */
  axis?: 'x' | 'y';
  /** Новые строки проявляются (по умолчанию да) */
  enter?: boolean;
  /** Ушедшие строки схлопываются на месте; не нужно, если строка уходит своей анимацией до удаления из данных */
  leave?: boolean;
}

const ENTER_MS = 260;
const EASE = 'cubic-bezier(0.25, 0.8, 0.25, 1)';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useListMotion(ref: RefObject<HTMLElement>, { attr = 'data-row', view = '', animateViewChange = false, axis = 'y', enter = true, leave = false }: ListMotionOptions = {}) {
  const last = useRef<{ view: string; sig: string; rows: Map<string, Snap>; positions: Map<HTMLElement, number> } | null>(null);

  // Без списка зависимостей: считаем после каждого показа, а двигаем только когда изменился набор или порядок строк
  useLayoutEffect(() => {
    const list = ref.current;
    if (!list) {
      last.current = null;
      return;
    }
    // Место строки считается от края самого списка: когда отступ над списком меняется сам (выбор чатов сворачивает истории, и список едет
    // по CSS-переходу без нового показа), все строки сдвигаются вместе и ложного «переезда» не будет
    const horizontal = axis === 'x';
    const offset = horizontal ? 'offsetLeft' : 'offsetTop';
    const size = horizontal ? 'offsetWidth' : 'offsetHeight';
    const positionOf = (el: HTMLElement) => el[offset] - (el.offsetParent === list ? 0 : list[offset]);
    const kids = (): HTMLElement[] => Array.from(list.children).filter((c): c is HTMLElement => c instanceof HTMLElement && !c.classList.contains('row-ghost'));
    const rows = kids().filter((el) => el.hasAttribute(attr));
    const movers = kids().filter((el) => el.hasAttribute(attr) || el.hasAttribute('data-flip'));
    const ids = rows.map((el) => el.getAttribute(attr) as string);
    const sig = ids.join('\n');
    const prev = last.current;
    // Страница не показана (display: none) или идёт перетаскивание: только запоминаем
    const quiet = (!list.offsetHeight && !animateViewChange) || list.hasAttribute('data-motion-off') || Boolean(list.closest('[inert]')) || reducedMotion();

    if (prev && (prev.sig !== sig || prev.view !== view)) {
      const now = new Set(ids);
      list.querySelectorAll<HTMLElement>(':scope > [data-motion-ghost]').forEach((ghost) => {
        if (quiet || now.has(ghost.dataset.motionGhost ?? '') || (prev.view !== view && !animateViewChange)) ghost.remove();
      });
    }

    if (prev && !quiet && (prev.view === view || animateViewChange) && prev.sig !== sig) {
      if (leave) {
        const now = new Set(ids);
        const gone = [...prev.rows].filter(([id]) => !now.has(id)).sort((a, b) => a[1].at - b[1].at);
        const gap = parseFloat(getComputedStyle(list)[horizontal ? 'columnGap' : 'rowGap']) || 0;
        const order = kids();
        for (const [id, snap] of gone) {
          if (!snap.size) continue;
          // Узел уже вынут из списка, но разметка внутри цела: копия берётся с него
          const ghost = snap.el.cloneNode(true) as HTMLElement;
          ghost.removeAttribute(attr);
          ghost.removeAttribute('id');
          ghost.classList.add('row-ghost');
          if (horizontal) ghost.classList.add('row-ghost--horizontal');
          ghost.dataset.motionGhost = id;
          ghost.setAttribute('aria-hidden', 'true');
          ghost.inert = true;
          ghost.style.setProperty(horizontal ? '--ghost-w' : '--ghost-h', `${snap.size}px`);
          ghost.style.setProperty('--ghost-gap', `${gap}px`);
          list.insertBefore(ghost, order[snap.at] ?? null);
          order.splice(snap.at, 0, ghost);
          const remove = () => ghost.remove();
          ghost.addEventListener('animationend', remove);
          window.setTimeout(remove, 700);
        }
      }

      // Прежнее место строк, что остались (узел тот же): от него они и переезжают
      flip(movers, prev.positions, axis, positionOf);

      if (enter && (animateViewChange || prev.rows.size > 0)) {
        for (const el of rows) {
          if (prev.positions.has(el)) continue;
          el.animate([{ opacity: 0, transform: 'translateY(-8px) scale(0.98)' }, { opacity: 1, transform: 'none' }], { duration: ENTER_MS, easing: EASE });
        }
      }
    }

    const live = kids();
    last.current = {
      view,
      sig,
      rows: new Map(rows.map((el, i) => [ids[i], { el, size: el[size], at: live.indexOf(el) }])),
      positions: new Map(movers.map((el) => [el, positionOf(el)])),
    };
  });
}
