import { useLayoutEffect, type RefObject } from 'react';

/*
 * Окна, меню и подсказки при закрытии не исчезают рывком, а уходят с анимацией, хотя React убирает их из дерева сразу.
 * В момент размонтирования на их месте остаётся копия узла: она играет анимацию выхода (класс is-leaving,
 * стили в styles/motion.css) и удаляется. Копия не нажимается и живёт доли секунды; сам компонент размонтируется как обычно.
 */

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Копия не знает, что в полях ввода: значения лежат в свойствах, а не в разметке */
function copyFieldValues(from: HTMLElement, to: HTMLElement) {
  const source = from.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
  const copy = to.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
  source.forEach((field, i) => {
    const twin = copy[i];
    if (!twin) return;
    twin.value = field.value;
    if (field instanceof HTMLInputElement && twin instanceof HTMLInputElement) twin.checked = field.checked;
  });
}

/**
 * Оставить после размонтирования копию узла, пока играет его анимация выхода.
 * @param where куда поставить копию: в body (окна поверх экрана) или туда же, где был узел (подсказки внутри экрана)
 */
export function useExitAnimation(ref: RefObject<HTMLElement>, where: 'body' | 'parent' = 'body') {
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const parent = node.parentNode;
    return () => {
      // Узел убирают из документа сразу после этой очистки; в режиме разработки React размонтирует «понарошку»,
      // и тогда узел остаётся на месте, копия не нужна
      queueMicrotask(() => {
        if (node.isConnected || reducedMotion()) return;
        const host = where === 'body' ? document.body : parent;
        if (!host?.isConnected) return;
        const ghost = node.cloneNode(true) as HTMLElement;
        copyFieldValues(node, ghost);
        ghost.classList.add('is-leaving');
        ghost.setAttribute('aria-hidden', 'true');
        ghost.inert = true;
        const remove = () => ghost.remove();
        host.appendChild(ghost);
        // Копия уходит, когда доиграла каждая анимация внутри неё (у окна двигаются и затемнение, и сама панель)
        const playing = ghost.getAnimations({ subtree: true });
        if (playing.length === 0) return remove();
        void Promise.allSettled(playing.map((animation) => animation.finished)).then(remove);
        // Если анимацию не проиграли (вкладка в фоне), копия всё равно уйдёт
        window.setTimeout(remove, 1000);
      });
    };
  }, [ref, where]);
}
