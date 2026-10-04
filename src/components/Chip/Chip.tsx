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
}

export function Chip({
  children,
  count,
  active = false,
  iconOnly = false,
  onClick,
  ariaLabel,
}: ChipProps) {
  // Кружок со счётчиком показывается только если есть непрочитанные
  const hasCount = count !== undefined && count > 0;
  const cls = [
    'chip',
    active && 'chip--active',
    iconOnly && 'chip--icon',
    hasCount && 'chip--counted',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      aria-pressed={iconOnly ? undefined : active}
      aria-label={ariaLabel}
    >
      {children}
      {hasCount && <Badge count={count} variant={active ? 'inverse' : 'neutral'} />}
    </button>
  );
}
