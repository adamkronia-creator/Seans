import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useExitAnimation } from '../../utils/exitAnimation';
import { useSheetDrag } from './useSheetDrag';
import './EditSheet.css';

/**
 * Затемнение на весь экран с окном внутри (.sheet): окно выезжает снизу, при закрытии уезжает обратно.
 * Окно закрывается нажатием на затемнение и свайпом вниз (useSheetDrag).
 */
export function SheetOverlay({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useExitAnimation(ref);
  useSheetDrag(ref, onClose);
  // Экранная клавиатура: окно и панель форматирования поднимаются над ней и остаются на виду
  useEffect(() => {
    const vv = window.visualViewport;
    const el = ref.current;
    if (!vv || !el) return;
    /** Поле, которое сейчас набирают, остаётся на виду: клавиатура и сдвиг окна не должны уводить его за край прокрутки */
    const reveal = () => {
      const field = document.activeElement;
      if (!(field instanceof HTMLElement) || !field.matches('input, textarea, [contenteditable]') || !el.contains(field)) return;
      const body = field.closest<HTMLElement>('.sheet__body');
      if (!body) return;
      // Поле заголовка стоит в карточке-шапке: показываем её целиком
      const box = field.closest<HTMLElement>('.sheet__preview') ?? field;
      const margin = 16;
      const scroller = body.getBoundingClientRect();
      const rect = box.getBoundingClientRect();
      const bottomLimit = scroller.bottom - (field.matches('textarea, [contenteditable]') ? 65 : margin);
      if (rect.top < scroller.top + margin) body.scrollTop += rect.top - scroller.top - margin;
      else if (rect.bottom > bottomLimit) body.scrollTop += rect.bottom - bottomLimit;
    };
    const fit = () => {
      const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      el.style.bottom = covered > 80 ? `${covered}px` : '';
      el.style.setProperty('--sheet-max', covered > 80 ? `${vv.height - 8}px` : '');
      reveal();
    };
    // Клавиатура выезжает не сразу: сначала фокус, потом изменение окна; проверяем и там, и там
    const onFocus = () => {
      reveal();
      window.setTimeout(reveal, 120);
      window.setTimeout(reveal, 350);
    };
    el.addEventListener('focusin', onFocus);
    fit();
    vv.addEventListener('resize', fit);
    vv.addEventListener('scroll', fit);
    return () => {
      el.removeEventListener('focusin', onFocus);
      vv.removeEventListener('resize', fit);
      vv.removeEventListener('scroll', fit);
    };
  }, []);
  // Окно живёт в body, вне экрана; если открыто с экрана на новой системе, оно оформлено по ней же (data-pm)
  const pm = document.querySelector('.screen[data-layer="top"][data-pm]') !== null;
  return createPortal(
    <div ref={ref} className="sheet-overlay" data-pm={pm ? '' : undefined} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      {children}
    </div>,
    document.body,
  );
}
