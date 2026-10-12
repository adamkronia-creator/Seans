import { IconClose } from '../ChatParts/ChatIcons';
import { IconHistory } from './FilterIcons';
import './LibraryFilters.css';

export interface QuickPick {
  facet: string;
  option: string;
  label: string;
  count: number;
}

interface SuggestPanelProps {
  history: string[];
  picks: QuickPick[];
  onHistory: (query: string) => void;
  onForget: (query: string) => void;
  onClearHistory: () => void;
  onPick: (pick: QuickPick) => void;
}

/**
 * Под полем поиска, пока оно в фокусе и пусто: прошлые запросы и быстрый выбор самых частых областей и подходов.
 * Касание по кнопке панели не отнимает у поля фокус (клавиатура остаётся, пока человек выбирает), а касание пустого места
 * закрывает панель: поле теряет фокус, и под ней снова виден список.
 */
export function SuggestPanel({ history, picks, onHistory, onForget, onClearHistory, onPick }: SuggestPanelProps) {
  return (
    <div
      className="suggest"
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('button')) e.preventDefault();
      }}
    >
      {history.length > 0 && (
        <section className="suggest__section" aria-label="Прошлые запросы">
          <div className="suggest__head">
            <h3 className="suggest__title">Прошлые запросы</h3>
            <button type="button" className="suggest__clear" onClick={onClearHistory}>
              Очистить
            </button>
          </div>
          <ul className="suggest__list">
            {history.map((q) => (
              <li key={q} className="suggest__item">
                <button type="button" className="suggest__row" onClick={() => onHistory(q)}>
                  <IconHistory className="suggest__icon" />
                  <span className="suggest__text">{q}</span>
                </button>
                <button type="button" className="suggest__forget" aria-label={`Убрать запрос «${q}»`} onClick={() => onForget(q)}>
                  <IconClose />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {picks.length > 0 && (
        <section className="suggest__section" aria-label="Быстрый выбор">
          <div className="suggest__head">
            <h3 className="suggest__title">Быстрый выбор</h3>
          </div>
          <div className="suggest__chips">
            {picks.map((p) => (
              <button key={`${p.facet}:${p.option}`} type="button" className="filter-chip filter-chip--card" aria-label={`${p.label}: ${p.count}`} onClick={() => onPick(p)}>
                {p.label}
                <span className="filter-chip__count" aria-hidden="true">
                  {p.count}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
