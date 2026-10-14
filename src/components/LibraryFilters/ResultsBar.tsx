import { IconClose } from '../ChatParts/ChatIcons';
import './LibraryFilters.css';

export interface FilterToken {
  key: string;
  label: string;
  /** Для экранной читалки: какой фильтр */
  group: string;
  onRemove: () => void;
}

interface ResultsBarProps {
  tokens: FilterToken[];
  onResetFilters: () => void;
  /** Пояснения к выдаче: что поправили в запросе, что совпало не полностью */
  notes: string[];
}

/**
 * Над карточками: выбранные фильтры (каждый снимается одним касанием) и пояснения к выдаче. Когда показывать нечего,
 * строки нет совсем: список начинается сразу под шапкой. Числа найденного здесь нет — его слышно в подписи чипсов.
 */
export function ResultsBar({ tokens, onResetFilters, notes }: ResultsBarProps) {
  if (tokens.length === 0 && notes.length === 0) return null;
  return (
    <div className="results-bar">
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
