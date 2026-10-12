import { IconClose } from '../ChatParts/ChatIcons';
import { IconFilterFavorites, IconFilterRecent } from '../icons';
import type { Marks } from '../../data/libraryQuery';
import { IconSort } from './FilterIcons';
import './LibraryFilters.css';

export interface FilterToken {
  key: string;
  label: string;
  /** Для экранной читалки: какой фильтр */
  group: string;
  onRemove: () => void;
}

interface ResultsBarProps {
  /** «12 тестов» или «Найдено 4 из 12» */
  summary: string;
  /** Читают вслух, когда число меняется: только у видимой страницы */
  live: boolean;
  /** Название порядка: значок без подписи, поэтому название слышно в подписи кнопки */
  sortLabel: string;
  /** Выбран не порядок по умолчанию: значок подсвечен, чтобы было видно, почему список идёт так */
  sortChanged: boolean;
  /** Упорядочивать нечего (в выдаче одно или ни одного): кнопка на месте, но недоступна, чтобы соседние не сдвигались */
  sortDisabled: boolean;
  onSort: () => void;
  /** «Избранное» и «Недавние»: включаются независимо и действуют вместе */
  marks: Marks;
  onToggleMark: (mark: keyof Marks) => void;
  tokens: FilterToken[];
  onResetFilters: () => void;
  /** Пояснения к выдаче: что поправили в запросе, что совпало не полностью */
  notes: string[];
}

/**
 * Над карточками: сколько нашлось, справа три кнопки-значка — порядок, только избранное, только недавнее —
 * затем выбранные фильтры (каждый снимается одним касанием) и пояснения к выдаче.
 */
export function ResultsBar({ summary, live, sortLabel, sortChanged, sortDisabled, onSort, marks, onToggleMark, tokens, onResetFilters, notes }: ResultsBarProps) {
  return (
    <div className="results-bar">
      <div className="results-bar__row">
        <p className="results-bar__summary" aria-live={live ? 'polite' : 'off'}>
          {summary}
        </p>
        <div className="results-bar__tools">
          <button
            type="button"
            className={`results-bar__pill results-bar__pill--icon${sortChanged ? ' results-bar__pill--tint' : ''}`}
            aria-haspopup="dialog"
            aria-label={`Сортировка: ${sortLabel}`}
            disabled={sortDisabled}
            onClick={onSort}
          >
            <IconSort className="results-bar__icon" />
          </button>
          <button
            type="button"
            className={`results-bar__pill results-bar__pill--icon${marks.favorites ? ' results-bar__pill--on' : ''}`}
            aria-pressed={marks.favorites}
            aria-label="Только избранное"
            onClick={() => onToggleMark('favorites')}
          >
            <IconFilterFavorites className="results-bar__icon" />
          </button>
          <button
            type="button"
            className={`results-bar__pill results-bar__pill--icon${marks.recent ? ' results-bar__pill--on' : ''}`}
            aria-pressed={marks.recent}
            aria-label="Только недавние"
            onClick={() => onToggleMark('recent')}
          >
            <IconFilterRecent className="results-bar__icon" />
          </button>
        </div>
      </div>
      {tokens.length > 0 && (
        <div className="results-bar__tokens" role="group" aria-label="Выбранные фильтры">
          {tokens.map((t) => (
            <button key={t.key} type="button" className="filter-token" aria-label={`Убрать фильтр: ${t.group} — ${t.label}`} onClick={t.onRemove}>
              {t.label}
              <IconClose className="filter-token__close" />
            </button>
          ))}
          {tokens.length > 1 && (
            <button type="button" className="filter-token filter-token--reset" onClick={onResetFilters}>
              Сбросить
            </button>
          )}
        </div>
      )}
      {notes.map((n) => (
        <p key={n} className="results-bar__note">
          {n}
        </p>
      ))}
    </div>
  );
}
