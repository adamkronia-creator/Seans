import type { ReactNode } from 'react';
import './EmptyState.css';

interface EmptyStateProps {
  /** Значок в круге: подсказывает, о чём экран (тесты, поиск, избранное) */
  icon: ReactNode;
  /** Что именно пусто или не найдено */
  title: string;
  /** Что с этим делать или почему так */
  text?: string;
  /** Кнопки под текстом (например, ослабить условие поиска) */
  children?: ReactNode;
}

/**
 * Пустое место в приложении: значок в мягком круге, короткий заголовок и пояснение, что делать дальше.
 * Один вид на все случаи — пустая папка, пустая вкладка чата, ничего не нашлось, результат не найден.
 */
export function EmptyState({ icon, title, text, children }: EmptyStateProps) {
  return (
    <div className="empty-state" role="status">
      <span className="empty-state__icon" aria-hidden="true">
        {icon}
      </span>
      <h2 className="empty-state__title">{title}</h2>
      {text && <p className="empty-state__text">{text}</p>}
      {children}
    </div>
  );
}
