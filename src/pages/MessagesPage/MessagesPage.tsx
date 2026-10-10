import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { markRead, useChats } from '../../data/chatStore';
import { Avatar } from '../../components/Avatar/Avatar';
import { ChatItem } from '../../components/ChatItem/ChatItem';
import { Chip } from '../../components/Chip/Chip';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { IconBell, IconPlus, IconPlusChip } from '../../components/icons';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { SwipePager } from '../../components/SwipePager/SwipePager';
import {
  CATEGORIES,
  CURRENT_USER,
  type Chat,
  type ChatCategory,
} from '../../data/chats';
import { navigate } from '../../router';
import { followChips } from '../../utils/followChips';
import { centerChips } from '../../utils/centerChips';
import './MessagesPage.css';

type Filter = 'all' | ChatCategory;

/** Фильтры по порядку чипсов: по ним же идут страницы пейджера */
const FILTERS: Filter[] = ['all', ...CATEGORIES.map(({ id }) => id)];

/** Чаты одного фильтра: страница пейджера, у каждой своя прокрутка */
const ChatList = memo(function ChatList({ chats, searching, onOpen }: { chats: Chat[]; searching: boolean; onOpen: (chat: Chat) => void }) {
  return chats.length > 0 ? (
    <ul className="messages__list">
      {chats.map((chat) => (
        <ChatItem key={chat.id} chat={chat} onClick={onOpen} />
      ))}
    </ul>
  ) : (
    <EmptyState
      art={searching ? 'formula' : 'schemaL'}
      title={searching ? 'Ничего не найдено' : 'Здесь пока нет диалогов'}
      text={searching ? 'Проверьте написание. Поиск идет по именам и по тексту последних сообщений.' : 'Нажмите «+» внизу, чтобы начать новый диалог.'}
    />
  );
});

export function MessagesPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  // Пока страницы ведёт палец, чипс подсвечивает ту, что ближе к положению; отпустили — выбранный фильтр
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const chats = useChats();
  const root = useRef<HTMLElement>(null);

  // Счётчик чипса = число непрочитанных ЧАТОВ в нём (не сообщений).
  // «Все» считает и «Избранное»; категории — только свои чаты. При нуле кружок скрыт.
  const countOf = (id: Filter) =>
    chats.filter((c) => c.unread > 0 && (id === 'all' || (!c.favorites && c.category === id)))
      .length;

  // Открытие чата помечает его прочитанным и ведёт в переписку
  const openChat = useCallback((chat: Chat) => {
    markRead(chat.id);
    navigate(`/chat/${chat.id}`);
  }, []);

  // По странице на фильтр: пролистать список вбок можно так же, как разделы в чате
  const lists = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (chat: Chat) => !q || chat.name.toLowerCase().includes(q) || chat.lastMessage.toLowerCase().includes(q);
    return FILTERS.map((id) => chats.filter((chat) => (id === 'all' || (!chat.favorites && chat.category === id)) && matches(chat)));
  }, [chats, query]);

  const pages = useMemo(
    () => FILTERS.map((id, i) => ({ key: id, node: <ChatList chats={lists[i]} searching={query.trim() !== ''} onOpen={openChat} /> })),
    [lists, query, openChat],
  );

  const index = FILTERS.indexOf(filter);
  const shown = dragIndex ?? index;

  const onDrag = useCallback((position: number | null) => {
    setDragIndex(position === null ? null : Math.round(Math.min(FILTERS.length - 1, Math.max(0, position))));
  }, []);

  // Цвет чипсов идёт за положением страниц, а не прыгает на середине (чипс «+» не фильтр: он вне страниц)
  const onPosition = useCallback((position: number) => {
    const chips = root.current?.querySelectorAll<HTMLElement>('.screen-header__chips .chip:not(.chip--icon)');
    if (chips) followChips(chips, position);
    const row = root.current?.querySelector<HTMLElement>('.screen-header__chips');
    if (row) centerChips(row, position, '.chip:not(.chip--icon)');
  }, []);

  return (
    <section ref={root} className="messages">
      <ScreenHeader
        title="Диалоги"
        trailing={
          <>
            <button
              type="button"
              className="messages__bell"
              aria-label="События"
              onClick={() => navigate('/events')}
            >
              <IconBell />
            </button>
            <button type="button" className="messages__profile" aria-label="Профиль">
              <Avatar src={CURRENT_USER.avatar} size={32} />
            </button>
          </>
        }
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Поиск по чатам"
        chipsLabel="Фильтр диалогов"
        chips={
          <>
            <Chip iconOnly className="chip--plus" ariaLabel="Добавить категорию">
              <IconPlusChip />
            </Chip>
            <Chip follow active={shown === 0} count={countOf('all')} onClick={() => setFilter('all')}>
              Все
            </Chip>
            {CATEGORIES.map(({ id, label }, i) => (
              <Chip
                key={id}
                follow
                active={shown === i + 1}
                count={countOf(id)}
                onClick={() => setFilter(id)}
              >
                {label}
              </Chip>
            ))}
          </>
        }
      />

      <SwipePager index={index} pages={pages} onIndexChange={(i) => setFilter(FILTERS[i])} onPosition={onPosition} onDrag={onDrag} />

      <button type="button" className="messages__fab" aria-label="Новый диалог">
        <IconPlus />
      </button>
    </section>
  );
}
