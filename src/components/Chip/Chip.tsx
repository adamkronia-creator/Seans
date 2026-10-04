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
  const cls = ['chip', active && 'chip--active', iconOnly && 'chip--icon']
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
      {count !== undefined && (
        <Badge count={count} variant={active ? 'inverse' : 'neutral'} showZero />
      )}
    </button>
  );
}
