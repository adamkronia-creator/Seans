import type { ReactNode } from 'react';
import { SearchField } from '../SearchField/SearchField';
import './ScreenHeader.css';

interface ScreenHeaderProps {
  title: string;
  /** Справа в строке заголовка (уведомления, профиль) */
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
 * Общая шапка разделов «Сообщения» и «Психологические тесты»: крупный заголовок слева, действия справа,
 * ниже поиск и чипсы. Белая панель с тонким разделителем снизу.
 */
export function ScreenHeader({
  title,
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
        <h1 className="screen-header__title">{title}</h1>
        {trailing && <div className="screen-header__side">{trailing}</div>}
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
