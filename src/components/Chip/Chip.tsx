import type { ReactNode } from 'react';
import { Badge } from '../Badge/Badge';
import './Chip.css';

interface ChipProps {
  children?: ReactNode;
  count?: number;
  active?: boolean;
  /** Квадратный вариант только с иконкой (чипс «+») */
  iconOnly?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  /** Дополнительный класс (размер иконки и т.п.) */
  className?: string;
  /** Переключатель с иконкой: сообщает состояние, как обычный чипс */
  toggle?: boolean;
}

export function Chip({
  children,
  count,
  active = false,
  iconOnly = false,
  onClick,
  ariaLabel,
  className,
  toggle = false,
}: ChipProps) {
  // Кружок со счётчиком показывается только если есть непрочитанные
  const hasCount = count !== undefined && count > 0;
  const cls = [
    'chip',
    active && 'chip--active',
    iconOnly && 'chip--icon',
    hasCount && 'chip--counted',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      aria-pressed={iconOnly && !toggle ? undefined : active}
      aria-label={ariaLabel}
    >
      {children}
      {hasCount && <Badge count={count} variant={active ? 'inverse' : 'neutral'} />}
    </button>
  );
}
