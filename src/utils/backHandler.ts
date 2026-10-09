import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLayer } from './layer';

/*
 * Часть «экранов» живёт внутри одного адреса: поиск по чату, бланк теста, результат внутри настройки. У каждого есть
 * своя кнопка «назад», и жест от левого края должен делать то же, что она, а не уводить с адреса целиком.
 * Такой экран сообщает об этом через useBackHandler; жест берёт последний из заявленных (самый вложенный).
 */

const handlers: Array<() => void> = [];

/** Пока `active`, жест «назад» вызывает `handler` вместо возврата на предыдущий адрес */
export function useBackHandler(active: boolean, handler: () => void) {
  const { top: onTop } = useLayer();
  const latest = useRef(handler);
  useLayoutEffect(() => {
    latest.current = handler;
  });
  useEffect(() => {
    if (!active || !onTop) return;
    const entry = () => latest.current();
    handlers.push(entry);
    return () => {
      const at = handlers.lastIndexOf(entry);
      if (at >= 0) handlers.splice(at, 1);
    };
  }, [active, onTop]);
}

/** Обработчик самого вложенного состояния, если оно есть */
export const currentBackHandler = (): (() => void) | undefined => handlers[handlers.length - 1];
