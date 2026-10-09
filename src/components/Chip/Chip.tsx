import type { ReactNode } from 'react';
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
  /** За чипсом идут страницы пейджера: цвет перетекает вслед за пальцем (см. followChips) */
  follow?: boolean;
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
  follow = false,
}: ChipProps) {
  // Число рядом с названием показывается только если есть непрочитанные
  const hasCount = count !== undefined && count > 0;
  const cls = [
    'chip',
    active && 'chip--active',
    follow && 'chip--follow',
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
      {hasCount && <span className="chip__count">{count}</span>}
    </button>
  );
}
