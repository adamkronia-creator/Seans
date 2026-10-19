import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { markRead, setArchived, useChats } from '../../data/chatStore';
import { ArchiveRow, ChatItem } from '../../components/ChatItem/ChatItem';
import { ChipMenu, type ChipMenuItem } from '../../components/FolderMenu/ChipMenu';
import { IconArchive } from '../../components/FolderMenu/FolderIcons';
import { Toast } from '../../components/Toast/Toast';
import { useToast } from '../../components/Toast/useToast';
import { Chip } from '../../components/Chip/Chip';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { useFolderMenu } from '../../components/FolderMenu/useFolderMenu';
import { IconSearch } from '../../components/icons';
import { ChatsHeader } from './ChatsHeader';
import { SwipePager } from '../../components/SwipePager/SwipePager';
import { switchTab } from '../../utils/tabNav';
import type { Chat } from '../../data/chats';
import { useFolders } from '../../data/folders';
import { navigate } from '../../router';
import { followChips, placePill, type PositionVia } from '../../utils/followChips';
import { centerChips } from '../../utils/centerChips';
import './MessagesPage.css';

/** 'all' или номер папки */
type Filter = string;

/**
 * Чаты одного фильтра: страница пейджера со своей прокруткой. На странице «Все» над «Избранным» стоит строка «Архивы», но при открытии
 * список сдвинут на её высоту, и строка спрятана под шапкой; протяжка вниз выдвигает её, а недотянутую или недоведённую до конца
 * прокрутку список сам доводит до ближайшего края.
 */
const ChatList = memo(function ChatList({
  chats,
  archived,
  onOpen,
  onMenu,
}: {
  chats: Chat[];
  /** Чаты в архиве: если они есть, на странице «Все» без поиска стоит строка «Архивы» */
  archived: Chat[];
  onOpen: (chat: Chat) => void;
  onMenu: (chat: Chat, row: HTMLElement) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const rows = useRef<HTMLUListElement>(null);
  const hasArchive = archived.length > 0;
  const favorites = chats.find((c) => c.favorites);
  const others = chats.filter((c) => !c.favorites);

  // Высота спрятанной части: строка «Архивы» вместе с промежутком до следующей
  const hiddenHeight = () => {
    const archive = rows.current?.querySelector<HTMLElement>('.chat-item--archive');
    return archive ? (archive.nextElementSibling as HTMLElement | null)?.offsetTop! - archive.offsetTop : 0;
  };

  // Список должен быть выше окна не меньше чем на спрятанную часть, иначе строку нечем спрятать. Пока человек список не трогал,
  // строка остаётся спрятанной при любом пересчёте размеров (шрифты, адресная строка, поворот): иначе она бы выглядывала по умолчанию
  useLayoutEffect(() => {
    const box = scroller.current;
    const list = rows.current;
    if (!box || !list || !hasArchive) return;
    let touched = false;
    const fit = () => {
      if (box.clientHeight === 0) return; // страница ещё не показана
      const cs = getComputedStyle(box);
      const inner = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      list.style.minHeight = `${inner + hiddenHeight()}px`;
      if (!touched) box.scrollTop = hiddenHeight();
    };
    const touch = () => {
      touched = true;
    };
    fit();
    const watch = new ResizeObserver(fit);
    watch.observe(box);
    for (const type of ['pointerdown', 'wheel', 'keydown'] as const) box.addEventListener(type, touch, { passive: true });
    return () => {
      watch.disconnect();
      for (const type of ['pointerdown', 'wheel', 'keydown'] as const) box.removeEventListener(type, touch);
    };
  }, [hasArchive]);

  // Доводка: отпустили на полпути — строка либо выезжает целиком, либо уходит обратно
  useEffect(() => {
    const box = scroller.current;
    if (!box || !hasArchive) return;
    let timer = 0;
    const settle = () => {
      const h = hiddenHeight();
      if (box.scrollTop > 0 && box.scrollTop < h) box.scrollTo({ top: box.scrollTop < h / 2 ? 0 : h, behavior: 'smooth' });
    };
    // Шапка — стекло, и спрятанная выше строка «Архивы» просвечивала бы сквозь неё: прозрачность строки идёт за тем, сколько её ниже шапки
    const archive = rows.current?.querySelector<HTMLElement>('.chat-item--archive');
    const fade = () => {
      if (archive) archive.style.opacity = String(Math.max(0, Math.min(1, (hiddenHeight() - box.scrollTop) / 24)));
    };
    fade();
    const onScroll = () => {
      fade();
      window.clearTimeout(timer);
      timer = window.setTimeout(settle, 140);
    };
    box.addEventListener('scroll', onScroll, { passive: true });
    const watch = new ResizeObserver(fade);
    watch.observe(box);
    return () => {
      watch.disconnect();
      box.removeEventListener('scroll', onScroll);
      window.clearTimeout(timer);
    };
  }, [hasArchive]);

  return chats.length > 0 || hasArchive ? (
    <div ref={scroller} className="messages__list">
      <ul ref={rows} className="messages__rows">
        {hasArchive && <ArchiveRow chats={archived} onClick={() => navigate('/archive')} />}
        {favorites && <ChatItem chat={favorites} onClick={onOpen} />}
        {favorites && others.length > 0 && <li className="messages__divider" role="separator" />}
        {others.map((chat) => (
          <ChatItem key={chat.id} chat={chat} onClick={onOpen} onLongPress={onMenu} />
        ))}
      </ul>
    </div>
  ) : (
    <div className="messages__empty">
      <EmptyState icon={<IconSearch />} title="Ничего не найдено" text="В этом разделе нет подходящих чатов." />
    </div>
  );
});

export function MessagesPage() {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  // Пока страницы ведёт палец, чипс подсвечивает ту, что ближе к положению; отпустили — выбранный фильтр
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const chats = useChats();
  const folders = useFolders('chats');
  const folderMenu = useFolderMenu('chats');
  const [toast, say] = useToast();
  const [rowMenu, setRowMenu] = useState<{ chat: Chat; rect: DOMRect; row: HTMLElement } | null>(null);
  const root = useRef<HTMLElement | null>(null);
  // Экран нужен историям (открываются поверх него): после монтирования он попадает в состояние
  const [screen, setScreen] = useState<HTMLElement | null>(null);
  const setRoot = useCallback((el: HTMLElement | null) => {
    root.current = el;
    setScreen(el);
  }, []);

  /** Фильтры по порядку чипсов: по ним же идут страницы пейджера */
  const filters = useMemo<Filter[]>(() => ['all', ...folders.map((f) => f.id)], [folders]);
  /** Страницы пейджера привязаны к номерам, поэтому когда папки добавили, убрали или переставили, пейджер строится заново */
  const order = filters.join('|');

  // Открытую папку удалили: остаёмся на «Все»
  useEffect(() => {
    if (!filters.includes(filter)) setFilter('all');
  }, [filters, filter]);

  // Счётчик чипса = число непрочитанных ЧАТОВ в нём (не сообщений).
  // «Избранное» не считается нигде (его строка без счётчика); папки — только свои чаты. При нуле кружок скрыт.
  const countOf = (id: Filter) => {
    const members = id === 'all' ? null : new Set(folders.find((f) => f.id === id)?.ids);
    return chats.filter((c) => !c.archived && c.unread > 0 && !c.favorites && (members === null || members.has(c.id))).length;
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

  // В покое подвижная заливка стоит под выбранным чипсом; пересчёт при смене выбора, счётчиков, папок, размера и после загрузки шрифтов
  const keptOrder = useRef('');
  const countsKey = chats.map((c) => (c.archived || c.favorites ? 0 : c.unread > 0 ? 1 : 0)).join('');
  useLayoutEffect(() => {
    const row = root.current?.querySelector<HTMLElement>('.screen-header__chips');
    if (!row) return;
    const place = () => {
      const chips = Array.from(row.querySelectorAll<HTMLElement>(':scope > .chip'));
      // Пока страницы идут (жест или пружина), заливка стоит там, где её поставил followChips: прыгать к выбранному нельзя
      const kept = row.querySelector<HTMLElement>(':scope > .chips-pill')?.dataset.weights?.split(',').map(Number);
      placePill(chips, kept && kept.length === chips.length && order === keptOrder.current ? kept : chips.map((_, i) => (i === index ? 1 : 0)));
      keptOrder.current = order;
    };
    place();
    const watch = new ResizeObserver(place);
    watch.observe(row);
    row.querySelectorAll('.chip').forEach((c) => watch.observe(c));
    void document.fonts?.ready.then(place);
    return () => watch.disconnect();
  }, [index, order, countsKey, searching]);

  return (
    <section ref={setRoot} className="messages">
      <ChatsHeader
        searching={searching}
        onSearching={setSearching}
        query={query}
        onQuery={setQuery}
        storiesRoot={screen}
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

      <SwipePager key={order} index={index} pages={pages} onIndexChange={(i) => setFilter(filters[i])} onPosition={onPosition} onDrag={onDrag} onEdgeSwipe={(d) => d > 0 && switchTab('profile', 'slide-next')} />

      {folderMenu.node}
      {rowMenu && <ChipMenu anchor={rowMenu.rect} opener={rowMenu.row} items={menuItems} onClose={() => setRowMenu(null)} />}
      {toast && <Toast text={toast} />}
    </section>
  );
}
