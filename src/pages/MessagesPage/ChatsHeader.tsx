import { useEffect, useRef, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { IconBellMk, IconSearchMk } from '../../components/ChatItem/ChatIcons';
import { SearchField } from '../../components/SearchField/SearchField';
import { useAvatarSrc } from '../../data/profile';
import { StoriesRow } from '../../components/Stories/Stories';
import { navigate } from '../../router';

interface ChatsHeaderProps {
  searching: boolean;
  onSearching: (on: boolean) => void;
  query: string;
  onQuery: (q: string) => void;
  chips: ReactNode;
  /** Экран, поверх которого открываются истории */
  storiesRoot?: HTMLElement | null;
  /** Другой раздел той же шапки (тесты): заголовок, подпись, поле поиска, кнопка справа вместо уведомлений и ряд вместо историй */
  title?: string;
  status?: string;
  heading?: string;
  placeholder?: string;
  chipsLabel?: string;
  aside?: ReactNode;
  /** Кнопка «+» справа от уведомлений: новый чат, группа или канал */
  belt?: ReactNode;
  inputRef?: Ref<HTMLInputElement>;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  /** Идёт выбор чатов: верхняя строка заменена этой (крестик, число, кнопки действий), истории свёрнуты */
  selection?: ReactNode;
}

/**
 * Шапка «Диалогов» по макету: фото специалиста, заголовок «Чаты» с подписью «Ваши диалоги», справа значки поиска и уведомлений,
 * ниже чипсы папок. Значок поиска заменяет верхнюю строку полем с кнопкой «Отмена». Размеры — токены сетки 4 (messages.css).
 */
export function ChatsHeader({
  searching,
  onSearching,
  query,
  onQuery,
  chips,
  storiesRoot = null,
  title = 'Чаты',
  status = 'Ваши диалоги',
  heading = 'Диалоги',
  placeholder = 'Поиск по чатам',
  chipsLabel = 'Фильтр диалогов',
  aside,
  belt,
  inputRef,
  onFocus,
  onBlur,
  onKeyDown,
  selection,
}: ChatsHeaderProps) {
  const avatar = useAvatarSrc();
  const own = useRef<HTMLInputElement>(null);
  const input = inputRef ?? own;
  useEffect(() => {
    if (searching) (input as { current: HTMLInputElement | null }).current?.focus({ preventScroll: true });
  }, [searching]);
  const close = () => {
    onQuery('');
    onSearching(false);
  };
  // Выбор закончился: обычная верхняя строка проявляется, а не вставляется рывком на место строки выбора (CSS: --back)
  const wasSelecting = useRef(false);
  const back = wasSelecting.current && !selection;
  useEffect(() => {
    wasSelecting.current = Boolean(selection);
  });
  return (
    <header className="chats-header">
      <h1 className="visually-hidden">{heading}</h1>
      {selection ? (
        <div key="select" className="chats-header__top chats-header__top--select">
          {selection}
        </div>
      ) : searching ? (
        <div key="search" className="chats-header__top">
          <SearchField
            value={query}
            onChange={onQuery}
            placeholder={placeholder}
            onClear={() => onQuery('')}
            inputRef={input}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={(e) => {
              if (e.key === 'Escape') close();
              else onKeyDown?.(e);
            }}
          />
          <button type="button" className="chats-header__cancel" onClick={close}>
            Отмена
          </button>
        </div>
      ) : (
        <div key="main" className={`chats-header__top${back ? ' chats-header__top--back' : ''}`}>
          {avatar ? <img className="chats-header__avatar" src={avatar} alt="" /> : <span className="chats-header__avatar" />}
          <span className="chats-header__who">
            <span className="chats-header__name">{title}</span>
            <span className="chats-header__status">{status}</span>
          </span>
          <button type="button" className="chats-header__action" aria-label="Поиск" onClick={() => onSearching(true)}>
            <IconSearchMk />
          </button>
          {aside ?? (
            <button type="button" className="chats-header__action" aria-label="События" onClick={() => navigate('/events')}>
              <IconBellMk />
            </button>
          )}
        </div>
      )}
      <div className="chats-header__belt" data-collapsed={selection ? '' : undefined} aria-hidden={selection ? true : undefined} {...({ inert: selection ? '' : undefined } as object)}>
        <div className="chats-header__belt-inner">{belt === undefined ? <StoriesRow root={storiesRoot} /> : belt}</div>
      </div>
      <div className="screen-header__chips" role="group" aria-label={chipsLabel}>
        <span className="chips-pill" aria-hidden="true" />
        {chips}
      </div>
    </header>
  );
}
