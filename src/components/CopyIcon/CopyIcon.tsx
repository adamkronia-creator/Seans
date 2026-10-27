import { useEffect, useId, useState } from 'react';
import IconCopy from '../../assets/icons/solar/copy.svg?react';
import IconDone from '../../assets/icons/solar/check.svg?react';
import { COPIED_EVENT } from '../../utils/clipboard';
import './CopyIcon.css';

/** Сколько значок остаётся галочкой */
const SHOW_MS = 1400;

/**
 * Значок «копировать», который на секунду становится галочкой, когда копирование с этой кнопки удалось.
 * Своё ли копирование, понимает по событию из utils/clipboard.ts: в нём лежит элемент, на который нажали, и значок должен быть внутри той же кнопки.
 * Рядом всегда есть и подсказка внизу экрана: значок лишь показывает результат там, где человек смотрит.
 */
export function CopyIcon({ className }: { className?: string }) {
  const id = useId();
  const [phase, setPhase] = useState<'idle' | 'done' | 'back'>('idle');

  useEffect(() => {
    let timer = 0;
    const onCopied = (event: Event) => {
      const source = (event as CustomEvent<Node | null>).detail;
      const origin = source instanceof Element ? source : source?.parentElement;
      const host = origin?.closest('button, a[href], [role="button"]');
      if (!host?.querySelector(`[data-copy-icon="${CSS.escape(id)}"]`)) return;
      setPhase('done');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setPhase('back'), SHOW_MS);
    };
    window.addEventListener(COPIED_EVENT, onCopied);
    return () => {
      window.removeEventListener(COPIED_EVENT, onCopied);
      window.clearTimeout(timer);
    };
  }, [id]);

  const extra = className ? ` ${className}` : '';
  // «Готово» и «копировать» — разные элементы: при смене прежний уходит, новый появляется со своей анимацией (copy-icon--done, copy-icon--back)
  return phase === 'done' ? (
    <IconDone className={`copy-icon copy-icon--done${extra}`} data-copy-icon={id} aria-hidden="true" />
  ) : (
    <IconCopy className={`copy-icon${phase === 'back' ? ' copy-icon--back' : ''}${extra}`} data-copy-icon={id} aria-hidden="true" />
  );
}
