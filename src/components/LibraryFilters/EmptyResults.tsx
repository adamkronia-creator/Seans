import { IconSearch } from '../icons';
import './LibraryFilters.css';

export interface EmptyAction {
  key: string;
  label: string;
  /** Сколько появится материалов */
  count: number;
  onClick: () => void;
}

interface EmptyResultsProps {
  title: string;
  text: string;
  actions: EmptyAction[];
  /** «тест», «теста», «тестов» уже склонены под число в подписях кнопок */
  describe: (count: number) => string;
}

/** Пустая выдача: говорит, что именно не нашлось, и предлагает ослабить условие с понятным итогом («Без фильтра — 3 теста») */
export function EmptyResults({ title, text, actions, describe }: EmptyResultsProps) {
  return (
    <div className="empty-results" role="status">
      <span className="empty-results__icon" aria-hidden="true">
        <IconSearch />
      </span>
      <h3 className="empty-results__title">{title}</h3>
      <p className="empty-results__text">{text}</p>
      {actions.length > 0 && (
        <ul className="empty-results__actions">
          {actions.map((a) => (
            <li key={a.key}>
              <button type="button" className="empty-results__action" onClick={a.onClick}>
                <span className="empty-results__action-label">{a.label}</span>
                <span className="empty-results__action-count">{describe(a.count)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
