import { useEffect, useRef } from 'react';
import { guardBack } from '../../router';

/**
 * Общее для нижних окон: Escape закрывает, пока окно открыто, страница под ним не прокручивается.
 * Системная «назад» закрывает окно и оставляет человека на том же экране.
 */
export function useSheet(onClose: () => void) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const release = guardBack(() => close.current());
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      release();
    };
  }, []);
}
