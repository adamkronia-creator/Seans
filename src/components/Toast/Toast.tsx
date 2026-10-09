import { useRef } from 'react';
import { useExitAnimation } from '../../utils/exitAnimation';
import './Toast.css';

/**
 * Короткая подсказка внизу экрана: выплывает снизу и так же уходит.
 * Вид задают класс .test-settings__toast (Toast.css, движение в styles/motion.css) и дополнительный className от экрана.
 */
export function Toast({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useExitAnimation(ref, 'parent');
  return (
    <p ref={ref} className={`test-settings__toast${className ? ` ${className}` : ''}`} role="status">
      {text}
    </p>
  );
}
