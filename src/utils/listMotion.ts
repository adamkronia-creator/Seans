import { useLayoutEffect, useRef, type RefObject } from 'react';
import { flip } from './flip';

/*
 * Строки живых списков не прыгают, когда данные меняются (закрепили чат, вернули из архива, поставили поле выше, добавили папку):
 *   — перестановка: оставшиеся строки плавно едут на новое место (FLIP: прежнее место запомнено при прошлом показе, переезд играет в этом);
 *   — новая строка проявляется, а те, что ниже, уступают ей место;
 *   — ушедшая строка оставляет на своём месте копию, которая схлопывается по высоте и тает (leave); стили копии — .row-ghost в styles/micro.css.
 * Строками считаются прямые потомки списка с атрибутом attr (по умолчанию data-row), в нём лежит id строки.
 * Потомок с атрибутом data-flip (кнопка «Создать» под строками) не строка, но тоже уступает место и переезжает вместе с ними.
 * Двигаются строки только пока вид списка тот же: сменился запрос, фильтр или страница — набор заменился целиком, и двигать нечего.
 * Список с атрибутом data-motion-off (строку в этот момент тащат пальцем) не трогаем. При «уменьшении движения» всё меняется сразу.
 */

interface Snap {
  el: HTMLElement;
  h: number;
  /** Номер среди потомков списка без копий: туда ставится копия ушедшей строки */
  at: number;
}

interface ListMotionOptions {
  /** Атрибут с id строки */
  attr?: string;
  /** Что сейчас показано (запрос, фильтр): пока значение то же, перестановки считаются движением; когда сменилось — строки просто заменились */
  view?: string;
  /** Новые строки проявляются (по умолчанию да) */
  enter?: boolean;
  /** Ушедшие строки схлопываются на месте; не нужно, если строка уходит своей анимацией до удаления из данных */
  leave?: boolean;
}

const ENTER_MS = 260;
const EASE = 'cubic-bezier(0.25, 0.8, 0.25, 1)';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useListMotion(ref: RefObject<HTMLElement>, { attr = 'data-row', view = '', enter = true, leave = false }: ListMotionOptions = {}) {
  const last = useRef<{ view: string; sig: string; rows: Map<string, Snap>; tops: Map<HTMLElement, number> } | null>(null);

  // Без списка зависимостей: считаем после каждого показа, а двигаем только когда изменился набор или порядок строк
  useLayoutEffect(() => {
    const list = ref.current;
    if (!list) {
      last.current = null;
      return;
    }
    // Место строки считается от верха самого списка: когда отступ над списком меняется сам (выбор чатов сворачивает истории, и список едет
    // по CSS-переходу без нового показа), все строки сдвигаются вместе и ложного «переезда» не будет
    const topOf = (el: HTMLElement) => (el.offsetParent === list ? el.offsetTop : el.offsetTop - list.offsetTop);
    const kids = (): HTMLElement[] => Array.from(list.children).filter((c): c is HTMLElement => c instanceof HTMLElement && !c.classList.contains('row-ghost'));
    const rows = kids().filter((el) => el.hasAttribute(attr));
    const movers = kids().filter((el) => el.hasAttribute(attr) || el.hasAttribute('data-flip'));
    const ids = rows.map((el) => el.getAttribute(attr) as string);
    const sig = ids.join('\n');
    const prev = last.current;
    // Страница не показана (display: none) или идёт перетаскивание: только запоминаем
    const quiet = list.offsetHeight === 0 || list.hasAttribute('data-motion-off') || reducedMotion();

    if (prev && !quiet && prev.view === view && prev.sig !== sig) {
      if (leave) {
        const now = new Set(ids);
        const gone = [...prev.rows].filter(([id]) => !now.has(id)).sort((a, b) => a[1].at - b[1].at);
        const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
        for (const [, snap] of gone) {
          if (!snap.h) continue;
          // Узел уже вынут из списка, но разметка внутри цела: копия берётся с него
          const ghost = snap.el.cloneNode(true) as HTMLElement;
          ghost.removeAttribute(attr);
          ghost.removeAttribute('id');
          ghost.classList.add('row-ghost');
          ghost.setAttribute('aria-hidden', 'true');
          ghost.inert = true;
          ghost.style.setProperty('--ghost-h', `${snap.h}px`);
          ghost.style.setProperty('--ghost-gap', `${gap}px`);
          list.insertBefore(ghost, kids()[snap.at] ?? null);
          const remove = () => ghost.remove();
          ghost.addEventListener('animationend', remove);
          window.setTimeout(remove, 700);
        }
      }

      // Прежнее место строк, что остались (узел тот же): от него они и переезжают
      flip(movers, prev.tops, 'y', topOf);

      if (enter && prev.rows.size > 0) {
        for (const el of rows) {
          if (prev.tops.has(el)) continue;
          el.animate([{ opacity: 0, transform: 'translateY(-8px) scale(0.98)' }, { opacity: 1, transform: 'none' }], { duration: ENTER_MS, easing: EASE });
        }
      }
    }

    const live = kids();
    last.current = {
      view,
      sig,
      rows: new Map(rows.map((el, i) => [ids[i], { el, h: el.offsetHeight, at: live.indexOf(el) }])),
      tops: new Map(movers.map((el) => [el, topOf(el)])),
    };
  });
}
