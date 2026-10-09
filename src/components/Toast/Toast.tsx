import { useRef } from 'react';
import { useExitAnimation } from '../../utils/exitAnimation';

/**
 * Короткая подсказка внизу экрана: выплывает снизу и так же уходит.
 * Вид задают классы .test-settings__toast (TestSettings.css) и дополнительный className родителя.
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
