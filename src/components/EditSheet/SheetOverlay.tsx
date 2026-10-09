import { useRef, type ReactNode } from 'react';
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
  return createPortal(
    <div ref={ref} className="sheet-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      {children}
    </div>,
    document.body,
  );
}
