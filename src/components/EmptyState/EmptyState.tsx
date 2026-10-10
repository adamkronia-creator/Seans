import { Inkblot, type InkblotKind } from './Inkblot';
import './EmptyState.css';

interface EmptyStateProps {
  /** Какая клякса рисуется над текстом */
  art?: InkblotKind;
  /** Что пусто, коротко: «Заданий пока нет» */
  title: string;
  /** Что с этим делать: одним-двумя предложениями */
  text?: string;
  /** Кнопка действия под текстом (если у экрана есть, куда пойти) */
  action?: { label: string; onClick: () => void };
  /** Для узких мест (внутри карточки, строки списка): рисунок и отступы меньше */
  compact?: boolean;
  /** Без собственного фона: пустота внутри уже белой карточки */
  className?: string;
}

/** Пустой экран или блок: знак «Сеанса», название, пояснение и, если есть куда идти, кнопка. Пустота — это приглашение к действию */
export function EmptyState({ art = 'blot', title, text, action, compact = false, className = '' }: EmptyStateProps) {
  return (
    <div className={`empty${compact ? ' empty--compact' : ''} ${className}`}>
      <Inkblot kind={art} size={compact ? 72 : 104} />
      <h2 className="empty__title">{title}</h2>
      {text && <p className="empty__text">{text}</p>}
      {action && (
        <button type="button" className="empty__action" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
