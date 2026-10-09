import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useExitAnimation } from '../../utils/exitAnimation';
import './EditSheet.css';

/**
 * Затемнение на весь экран с окном внутри (.sheet): окно выезжает снизу, при закрытии уезжает обратно.
 * Нажатие на затемнение закрывает окно.
 */
export function SheetOverlay({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useExitAnimation(ref);
  return createPortal(
    <div ref={ref} className="sheet-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      {children}
    </div>,
    document.body,
  );
}
