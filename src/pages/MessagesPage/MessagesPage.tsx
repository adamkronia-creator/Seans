import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { markRead, useChats } from '../../data/chatStore';
import { ChatItem } from '../../components/ChatItem/ChatItem';
import { Chip } from '../../components/Chip/Chip';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { useFolderMenu } from '../../components/FolderMenu/useFolderMenu';
import { IconBell, IconPlus, IconSearch } from '../../components/icons';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { SwipePager } from '../../components/SwipePager/SwipePager';
import type { Chat } from '../../data/chats';
import { useFolders } from '../../data/folders';
import { navigate } from '../../router';
import { followChips, type PositionVia } from '../../utils/followChips';
import { centerChips } from '../../utils/centerChips';
import './MessagesPage.css';

/** 'all' или номер папки */
type Filter = string;

/** Чаты одного фильтра: страница пейджера, у каждой своя прокрутка */
const ChatList = memo(function ChatList({ chats, onOpen }: { chats: Chat[]; onOpen: (chat: Chat) => void }) {
  return chats.length > 0 ? (
    <ul className="messages__list">
      {chats.map((chat) => (
        <ChatItem key={chat.id} chat={chat} onClick={onOpen} />
      ))}
    </ul>
  ) : (
    <EmptyState icon={<IconSearch />} title="Ничего не найдено" text="В этом разделе нет подходящих чатов." />
  );
});

export function MessagesPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  // Пока страницы ведёт палец, чипс подсвечивает ту, что ближе к положению; отпустили — выбранный фильтр
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const chats = useChats();
  const folders = useFolders('chats');
  const folderMenu = useFolderMenu('chats');
  const root = useRef<HTMLElement>(null);

  /** Фильтры по порядку чипсов: по ним же идут страницы пейджера */
  const filters = useMemo<Filter[]>(() => ['all', ...folders.map((f) => f.id)], [folders]);
  /** Страницы пейджера привязаны к номерам, поэтому когда папки добавили, убрали или переставили, пейджер строится заново */
  const order = filters.join('|');

  // Открытую папку удалили: остаёмся на «Все»
  useEffect(() => {
    if (!filters.includes(filter)) setFilter('all');
  }, [filters, filter]);

  // Счётчик чипса = число непрочитанных ЧАТОВ в нём (не сообщений).
  // «Все» считает и «Избранное»; папки — только свои чаты. При нуле кружок скрыт.
  const countOf = (id: Filter) => {
    const members = id === 'all' ? null : new Set(folders.find((f) => f.id === id)?.ids);
    return chats.filter((c) => c.unread > 0 && (members === null || (!c.favorites && members.has(c.id)))).length;
  };

  // Открытие чата помечает его прочитанным и ведёт в переписку
  const openChat = useCallback((chat: Chat) => {
    markRead(chat.id);
    navigate(`/chat/${chat.id}`);
  }, []);

  // По странице на фильтр: пролистать список вбок можно так же, как разделы в чате
  const lists = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (chat: Chat) => !q || chat.name.toLowerCase().includes(q) || chat.lastMessage.toLowerCase().includes(q);
    return filters.map((id) => {
      const members = id === 'all' ? null : new Set(folders.find((f) => f.id === id)?.ids);
      return chats.filter((chat) => (members === null || (!chat.favorites && members.has(chat.id))) && matches(chat));
    });
  }, [chats, folders, filters, query]);

  const pages = useMemo(
    () => filters.map((id, i) => ({ key: id, node: <ChatList chats={lists[i]} onOpen={openChat} /> })),
    [filters, lists, openChat],
  );

  const index = Math.max(0, filters.indexOf(filter));
  const shown = dragIndex ?? index;

  const onDrag = useCallback(
    (position: number | null) => {
      setDragIndex(position === null ? null : Math.round(Math.min(filters.length - 1, Math.max(0, position))));
    },
    [filters.length],
  );

  // Цвет чипсов идёт за положением страниц, а не прыгает на середине
  const onPosition = useCallback((position: number, via?: PositionVia) => {
    const chips = root.current?.querySelectorAll<HTMLElement>('.screen-header__chips .chip');
    if (chips) followChips(chips, position, via);
    const row = root.current?.querySelector<HTMLElement>('.screen-header__chips');
    if (row) centerChips(row, position, '.chip', via);
  }, []);

  return (
    <section ref={root} className="messages">
      <ScreenHeader
        title="Диалоги"
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Поиск по чатам"
        searchAside={
          <button type="button" className="screen-header__action" aria-label="События" onClick={() => navigate('/events')}>
            <IconBell />
          </button>
        }
        chipsLabel="Фильтр диалогов"
        chips={
          <>
            <Chip follow split tone="chat" active={shown === 0} count={countOf('all')} onClick={() => setFilter('all')} onLongPress={(chip) => folderMenu.open('all', chip)}>
              Все
            </Chip>
            {folders.map(({ id, name, muted }, i) => (
              <Chip
                key={id}
                follow
                split
                tone="chat"
                active={shown === i + 1}
                count={countOf(id)}
                muted={muted}
                onClick={() => setFilter(id)}
                onLongPress={(chip) => folderMenu.open(id, chip)}
              >
                {name}
              </Chip>
            ))}
          </>
        }
      />

      <SwipePager key={order} index={index} pages={pages} onIndexChange={(i) => setFilter(filters[i])} onPosition={onPosition} onDrag={onDrag} />

      <button type="button" className="messages__fab" aria-label="Новый диалог">
        <IconPlus />
      </button>

      {folderMenu.node}
    </section>
  );
}
