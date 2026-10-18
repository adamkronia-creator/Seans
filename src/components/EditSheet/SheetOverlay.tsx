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
    const fit = () => {
      const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      el.style.bottom = covered > 80 ? `${covered}px` : '';
      el.style.setProperty('--sheet-max', covered > 80 ? `${vv.height - 8}px` : '');
    };
    fit();
    vv.addEventListener('resize', fit);
    vv.addEventListener('scroll', fit);
    return () => {
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
