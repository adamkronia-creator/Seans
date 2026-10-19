import { useEffect, useRef, type ReactNode } from 'react';
import { IconBellMk, IconImageMk, IconSearchMk } from '../../components/ChatItem/ChatIcons';
import { SearchField } from '../../components/SearchField/SearchField';
import { useAvatarSrc } from '../../data/profile';
import { StoriesRow } from '../../components/Stories/Stories';
import { navigate } from '../../router';
import { setBackgroundFromFile } from '../../utils/customBackground';

interface ChatsHeaderProps {
  searching: boolean;
  onSearching: (on: boolean) => void;
  query: string;
  onQuery: (q: string) => void;
  chips: ReactNode;
  /** Экран, поверх которого открываются истории */
  storiesRoot: HTMLElement | null;
}

/**
 * Шапка «Диалогов» по макету: фото специалиста, заголовок «Чаты» с подписью «Ваши диалоги», справа значки поиска и уведомлений,
 * ниже чипсы папок. Значок поиска заменяет верхнюю строку полем с кнопкой «Отмена». Размеры — токены сетки 4 (messages.css).
 */
export function ChatsHeader({ searching, onSearching, query, onQuery, chips, storiesRoot }: ChatsHeaderProps) {
  const avatar = useAvatarSrc();
  const input = useRef<HTMLInputElement>(null);
  const bgInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (searching) input.current?.focus({ preventScroll: true });
  }, [searching]);
  const close = () => {
    onQuery('');
    onSearching(false);
  };
  return (
    <header className="chats-header">
      <h1 className="visually-hidden">Диалоги</h1>
      {searching ? (
        <div className="chats-header__top">
          <SearchField
            value={query}
            onChange={onQuery}
            placeholder="Поиск по чатам"
            onClear={() => onQuery('')}
            inputRef={input}
            onKeyDown={(e) => e.key === 'Escape' && close()}
          />
          <button type="button" className="chats-header__cancel" onClick={close}>
            Отмена
          </button>
        </div>
      ) : (
        <div className="chats-header__top">
          {avatar ? <img className="chats-header__avatar" src={avatar} alt="" /> : <span className="chats-header__avatar" />}
          <span className="chats-header__who">
            <span className="chats-header__name">Чаты</span>
            <span className="chats-header__status">Ваши диалоги</span>
          </span>
          {/* Временная кнопка: загрузить файл и сделать его фоном приложения (долгое нажатие не нужно: сброс — ?bg=0…3) */}
          <button type="button" className="chats-header__action" aria-label="Загрузить фон" title="Загрузить фон" onClick={() => bgInput.current?.click()}>
            <IconImageMk />
          </button>
          <input
            ref={bgInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void setBackgroundFromFile(file);
            }}
          />
          <button type="button" className="chats-header__action" aria-label="Поиск" onClick={() => onSearching(true)}>
            <IconSearchMk />
          </button>
          <button type="button" className="chats-header__action" aria-label="События" onClick={() => navigate('/events')}>
            <IconBellMk />
          </button>
        </div>
      )}
      <StoriesRow root={storiesRoot} />
      <div className="screen-header__chips" role="group" aria-label="Фильтр диалогов">
        <span className="chips-pill" aria-hidden="true" />
        {chips}
      </div>
    </header>
  );
}
