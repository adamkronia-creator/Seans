import { useRef, type ReactNode } from 'react';
import { SheetOverlay } from '../EditSheet/SheetOverlay';
import { useSheet } from '../EditSheet/useSheet';
import '../EditSheet/EditSheet.css';
import './Frame.css';

interface FrameProps {
  title: string;
  /** Пояснение под заголовком: что именно меняем */
  subtitle?: string;
  /** Заголовок мелкий, как подпись группы (окна выбора фото и фона) */
  quietTitle?: boolean;
  footer: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

/** Каркас нижнего окна: ручка, заголовок, прокручиваемое содержимое и нижние кнопки */
export function Frame({ title, subtitle, quietTitle, footer, onClose, children }: FrameProps) {
  useSheet(onClose);
  const body = useRef<HTMLDivElement>(null);
  return (
    <SheetOverlay onClose={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet__grab" aria-hidden="true" />
        {!quietTitle && (
          <div className="sheet__header">
            <h2 className="sheet__heading">{title}</h2>
            {subtitle && <p className="frame-subtitle">{subtitle}</p>}
          </div>
        )}
        <div className="sheet__body" ref={body}>
          {/* Мелкий заголовок-подпись группы живёт внутри прокручиваемой части и уходит вместе с ней, а не остаётся в затемнении сверху */}
          {quietTitle && (
            <h2 className="sheet__heading sheet__heading--quiet">
              {title}
            </h2>
          )}
          {children}
        </div>
        <div className="sheet__footer">{footer}</div>
      </div>
    </SheetOverlay>
  );
}
