import './Badge.css';

type BadgeVariant = 'accent' | 'neutral' | 'inverse';

interface BadgeProps {
  count: number;
  /** accent: синий (непрочитанные); neutral: серый (чипс); inverse: белый (активный чипс) */
  variant?: BadgeVariant;
  /** Показывать кружок с нулём (для чипсов) */
  showZero?: boolean;
  ariaLabel?: string;
}

/** Кружок со счётчиком. Один компонент и для чатов, и для чипсов, чтобы размеры были одинаковыми */
export function Badge({ count, variant = 'accent', showZero = false, ariaLabel }: BadgeProps) {
  if (count <= 0 && !showZero) return null;
  return (
    <span className={`badge badge--${variant}`} aria-label={ariaLabel}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
