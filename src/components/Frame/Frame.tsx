import { useRef, type ReactNode } from 'react';
import { SheetOverlay } from '../EditSheet/SheetOverlay';
import { useSheet } from '../EditSheet/useSheet';
import '../EditSheet/EditSheet.css';
import './Frame.css';

interface FrameProps {
  title: string;
  /** Пояснение под заголовком: что именно меняем */
  subtitle?: string;
  /** Нижние кнопки; окна выбора из сетки обходятся без них */
  footer?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

/** Каркас нижнего окна: заголовок слева, прокручиваемое содержимое и нижние кнопки; вид — styles/sheet.css */
export function Frame({ title, subtitle, footer, onClose, children }: FrameProps) {
  useSheet(onClose);
  const body = useRef<HTMLDivElement>(null);
  return (
    <SheetOverlay onClose={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet__header">
          <h2 className="sheet__heading">{title}</h2>
          {subtitle && <p className="frame-subtitle">{subtitle}</p>}
        </div>
        <div className="sheet__body" ref={body}>
          {children}
        </div>
        {footer && <div className="sheet__footer">{footer}</div>}
      </div>
    </SheetOverlay>
  );
}
