import type { ReactNode } from 'react';
import { SearchField } from '../SearchField/SearchField';
import './ScreenHeader.css';

interface ScreenHeaderProps {
  title: string;
  /** Слева в первой строке (аватарка профиля) */
  leading?: ReactNode;
  /** Справа в первой строке (колокольчик) */
  trailing?: ReactNode;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  /** Кнопка у правого края поля поиска */
  searchTrailing?: ReactNode;
  /** Чипсы под поиском */
  chips: ReactNode;
  chipsLabel: string;
}

/**
 * Общая шапка разделов «Сообщения» и «Психологические тесты»:
 * строка заголовка 40 → 8 → поиск 40 → 8 → чипсы 32 → 8, разделитель снизу.
 */
export function ScreenHeader({
  title,
  leading,
  trailing,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchTrailing,
  chips,
  chipsLabel,
}: ScreenHeaderProps) {
  return (
    <header className="screen-header">
      <div className="screen-header__top">
        <div className="screen-header__side screen-header__side--start">{leading}</div>
        <h1 className="screen-header__title">{title}</h1>
        <div className="screen-header__side screen-header__side--end">{trailing}</div>
      </div>

      <SearchField
        value={searchValue}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
        trailing={searchTrailing}
      />

      <div className="screen-header__chips" role="group" aria-label={chipsLabel}>
        {chips}
      </div>
    </header>
  );
}
