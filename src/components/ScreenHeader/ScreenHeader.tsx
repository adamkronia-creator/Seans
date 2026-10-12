import type { ReactNode } from 'react';
import { SearchField } from '../SearchField/SearchField';
import './ScreenHeader.css';

interface ScreenHeaderProps {
  /** Название раздела: на экране его нет (раздел узнают по значку на нижней панели), но программа экрана его читает */
  title: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  /** Кнопка у правого края поля поиска */
  searchTrailing?: ReactNode;
  /** Кнопка рядом с полем поиска, справа от него (например, уведомления); класс — `screen-header__action` */
  searchAside?: ReactNode;
  /** Чипсы под поиском */
  chips: ReactNode;
  chipsLabel: string;
}

/**
 * Общая шапка разделов «Диалоги», «Диагностика» и «Задания»: поле поиска (рядом с ним при необходимости кнопка) и чипсы под ним.
 * Крупного названия раздела нет, чтобы список начинался выше. Белая панель с тонким разделителем снизу.
 */
export function ScreenHeader({
  title,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchTrailing,
  searchAside,
  chips,
  chipsLabel,
}: ScreenHeaderProps) {
  return (
    <header className="screen-header">
      <h1 className="visually-hidden">{title}</h1>

      <div className="screen-header__search">
        <SearchField
          value={searchValue}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          trailing={searchTrailing}
        />
        {searchAside}
      </div>

      <div className="screen-header__chips" role="group" aria-label={chipsLabel}>
        {chips}
      </div>
    </header>
  );
}
