import { useRef, type CSSProperties, type ReactNode } from 'react';
import './Collapse.css';

/**
 * Блок, который раскрывается и сворачивается по высоте, а не появляется и пропадает рывком (плашка закрепа, рекомендованные папки).
 * Пока блок сворачивается, в нём остаётся то, что было показано последним: данные могут уже исчезнуть (открепили последнее сообщение).
 * Свёрнутый блок скрыт от чтения и фокуса. Высоту ведёт сетка (0fr → 1fr), поэтому знать её заранее не нужно.
 * gap: блок стоит в колонке с промежутками между детьми (flex/grid gap); свёрнутый, он забирает и свой промежуток, а не оставляет пустую полосу.
 */
export function Collapse({ open, children, className, gap }: { open: boolean; children: ReactNode; className?: string; gap?: string }) {
  const kept = useRef<ReactNode>(null);
  if (children !== null && children !== undefined && children !== false) kept.current = children;
  return (
    <div className={`collapse${open ? ' collapse--open' : ''}${gap ? ' collapse--gap' : ''}${className ? ` ${className}` : ''}`} style={gap ? ({ '--collapse-gap': gap } as CSSProperties) : undefined}>
      <div className="collapse__inner">{kept.current}</div>
    </div>
  );
}
