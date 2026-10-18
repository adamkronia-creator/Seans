import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { markRead, setArchived, useChats } from '../../data/chatStore';
import { ArchiveRow, ChatItem } from '../../components/ChatItem/ChatItem';
import { ChipMenu, type ChipMenuItem } from '../../components/FolderMenu/ChipMenu';
import { IconArchive } from '../../components/FolderMenu/FolderIcons';
import { Toast } from '../../components/Toast/Toast';
import { useToast } from '../../components/Toast/useToast';
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
const ChatList = memo(function ChatList({
  chats,
  archived,
  onOpen,
  onMenu,
}: {
  chats: Chat[];
  /** Чаты в архиве: если они есть, первой строкой стоит «Архив чатов» (только на странице «Все», без поиска) */
  archived: Chat[];
  onOpen: (chat: Chat) => void;
  onMenu: (chat: Chat, row: HTMLElement) => void;
}) {
  return chats.length > 0 || archived.length > 0 ? (
    <ul className="messages__list">
      {archived.length > 0 && <ArchiveRow chats={archived} onClick={() => navigate('/archive')} />}
      {chats.map((chat) => (
        <ChatItem key={chat.id} chat={chat} onClick={onOpen} onLongPress={chat.favorites ? undefined : onMenu} />
      ))}
    </ul>
  ) : (
    <div className="messages__empty">
      <EmptyState icon={<IconSearch />} title="Ничего не найдено" text="В этом разделе нет подходящих чатов." />
    </div>
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
  const [toast, say] = useToast();
  const [rowMenu, setRowMenu] = useState<{ chat: Chat; rect: DOMRect; row: HTMLElement } | null>(null);
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
    return chats.filter((c) => !c.archived && c.unread > 0 && (members === null || (!c.favorites && members.has(c.id)))).length;
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
      // Чаты из архива видны только в поиске по всем чатам
      return chats.filter((chat) => (!chat.archived || (!!q && id === 'all')) && (members === null || (!chat.favorites && members.has(chat.id))) && matches(chat));
    });
  }, [chats, folders, filters, query]);

  const archived = useMemo(() => (query.trim() ? [] : chats.filter((c) => c.archived)), [chats, query]);

  const openMenu = useCallback((chat: Chat, row: HTMLElement) => setRowMenu({ chat, rect: row.getBoundingClientRect(), row }), []);
  const menuItems: ChipMenuItem[] = rowMenu
    ? [
        {
          key: 'archive',
          label: rowMenu.chat.archived ? 'Вернуть из архива' : 'В архив',
          Icon: IconArchive,
          run: () => {
            setArchived(rowMenu.chat.id, !rowMenu.chat.archived);
            say(rowMenu.chat.archived ? `«${rowMenu.chat.name}» возвращён из архива` : `«${rowMenu.chat.name}» перенесён в архив`);
          },
        },
      ]
    : [];

  const pages = useMemo(
    () => filters.map((id, i) => ({ key: id, node: <ChatList chats={lists[i]} archived={id === 'all' ? archived : []} onOpen={openChat} onMenu={openMenu} /> })),
    [filters, lists, archived, openChat, openMenu],
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
        showTitle
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Поиск"
        titleAside={
          <button type="button" className="screen-header__action" aria-label="События" onClick={() => navigate('/events')}>
            <IconBell />
          </button>
        }
        chipsLabel="Фильтр диалогов"
        chips={
          <>
            <Chip follow tone="chat" active={shown === 0} count={countOf('all')} onClick={() => setFilter('all')} onLongPress={(chip) => folderMenu.open('all', chip)}>
              Все
            </Chip>
            {folders.map(({ id, name, muted }, i) => (
              <Chip
                key={id}
                follow
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
      {rowMenu && <ChipMenu anchor={rowMenu.rect} opener={rowMenu.row} items={menuItems} onClose={() => setRowMenu(null)} />}
      {toast && <Toast text={toast} />}
    </section>
  );
}
