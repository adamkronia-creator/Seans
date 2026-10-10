import { useEffect, useRef } from 'react';
import { reducedMotion } from '../../utils/swipe';
import './Badge.css';

type BadgeVariant = 'accent' | 'neutral' | 'inverse' | 'yellow' | 'green' | 'muted';

interface BadgeProps {
  count: number;
  /** accent: синий (непрочитанные); neutral: серый (чипс); inverse: белый (активный чипс); yellow/green: вкладка «Тесты» */
  variant?: BadgeVariant;
  /** Показывать кружок с нулём (для чипсов) */
  showZero?: boolean;
  ariaLabel?: string;
}

/** Кружок со счётчиком. Один компонент и для чатов, и для чипсов, чтобы размеры были одинаковыми */
export function Badge({ count, variant = 'accent', showZero = false, ariaLabel }: BadgeProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(count);
  // Число изменилось на глазах: кружок коротко «подпрыгивает»
  useEffect(() => {
    if (prev.current !== count && ref.current && !reducedMotion()) {
      ref.current.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], {
        duration: 280,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      });
    }
    prev.current = count;
  }, [count]);
  if (count <= 0 && !showZero) return null;
  return (
    <span
      ref={ref}
      className={`badge badge--${variant}`}
      aria-label={ariaLabel}
    >
      <span className="badge__text">{count > 99 ? '99+' : count}</span>
    </span>
  );
}
