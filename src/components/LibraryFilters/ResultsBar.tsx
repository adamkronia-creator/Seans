import { IconClose } from '../ChatParts/ChatIcons';
import { IconChevronDown } from '../ChatParts/ChatIcons';
import { IconCompare, IconSort } from './FilterIcons';
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
  sortLabel: string;
  /** Порядок: кнопка есть, если в выдаче есть что упорядочивать */
  onSort?: () => void;
  /** Режим выбора для сравнения: кнопка есть, если есть что сравнивать */
  onCompare?: () => void;
  comparing: boolean;
  tokens: FilterToken[];
  onResetFilters: () => void;
  /** Пояснения к выдаче: что поправили в запросе, что совпало не полностью */
  notes: string[];
}

/** Над карточками: сколько нашлось, как отсортировано, выбранные фильтры (каждый снимается одним касанием) и пояснения к выдаче */
export function ResultsBar({ summary, live, sortLabel, onSort, onCompare, comparing, tokens, onResetFilters, notes }: ResultsBarProps) {
  return (
    <div className="results-bar">
      <div className="results-bar__row">
        <p className="results-bar__summary" aria-live={live ? 'polite' : 'off'}>
          {summary}
        </p>
        {onSort && (
          <button type="button" className="results-bar__pill" aria-haspopup="dialog" onClick={onSort} aria-label={`Сортировка: ${sortLabel}`}>
            <IconSort className="results-bar__icon" />
            <span className="results-bar__label">{sortLabel}</span>
            <IconChevronDown className="results-bar__chevron" />
          </button>
        )}
        {onCompare && (
          <button
            type="button"
            className={`results-bar__pill results-bar__pill--icon${comparing ? ' results-bar__pill--on' : ''}`}
            aria-pressed={comparing}
            aria-label="Сравнить материалы"
            onClick={onCompare}
          >
            <IconCompare className="results-bar__icon" />
          </button>
        )}
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
