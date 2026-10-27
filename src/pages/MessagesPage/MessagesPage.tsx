import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { markRead, useChats } from '../../data/chatStore';
import { countText, isMember, useAllGroups } from '../../data/groups';
import { ArchiveRow, ChatItem } from '../../components/ChatItem/ChatItem';
import { useListMotion } from '../../utils/listMotion';
import { Toast } from '../../components/Toast/Toast';
import { useToast } from '../../components/Toast/useToast';
import { Chip } from '../../components/Chip/Chip';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { useFolderMenu } from '../../components/FolderMenu/useFolderMenu';
import { IconSearch } from '../../components/icons';
import { IconComposeMk } from '../../components/ChatItem/ChatIcons';
import { ChatsHeader } from './ChatsHeader';
import { useChatSelection } from './ChatSelection';
import { SwipePager } from '../../components/SwipePager/SwipePager';
import { switchTab, useChipsDrag, useTabSwipe } from '../../utils/tabNav';
import type { Chat } from '../../data/chats';
import { useFolderEditing, useFrozenWhile } from '../../data/folderEdit';
import { useFolders } from '../../data/folders';
import { guardBack, navigate } from '../../router';
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
  selected,
  view,
  found,
  onOpenFound,
}: {
  chats: Chat[];
  /** Публичные общие чаты и каналы, в которых вас нет, под строкой поиска: нажатие открывает страницу вступления */
  found: Chat[];
  onOpenFound: (chat: Chat) => void;
  /** Чаты в архиве: если они есть, на странице «Все» без поиска стоит строка «Архивы» */
  archived: Chat[];
  onOpen: (chat: Chat) => void;
  onMenu: (chat: Chat, row: HTMLElement) => void;
  /** Выбранные чаты (режим выбора) */
  selected: readonly string[];
  /** Что показано сейчас (поисковый запрос): пока он тот же, перестановка строк — движение, а не замена списка */
  view: string;
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
      // Процент от внутренней высоты окна списка (без отступов): когда отступ сверху меняется (выбор чатов), прокрутка не теряется
      list.style.minHeight = `calc(100% + ${hiddenHeight()}px)`;
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
      // Строки «Архивы» больше нет (начали искать): список снова начинается с первой строки, а не со сдвига под шапку
      list.style.minHeight = '';
      box.scrollTop = 0;
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

  // Чат закрепили, вернули, убрали в архив или в другую папку: строки переезжают на новые места, ушедшая схлопывается на своём (utils/listMotion.ts).
  // Смена поиска заменяет набор строк целиком, поэтому двигать ничего не нужно
  useListMotion(rows, { attr: 'data-chat', view, leave: true });

  return chats.length > 0 || hasArchive || found.length > 0 ? (
    <div ref={scroller} className="messages__list">
      <ul ref={rows} className="messages__rows">
        {hasArchive && <ArchiveRow chats={archived} onClick={() => navigate('/archive')} />}
        {favorites && <ChatItem chat={favorites} onClick={onOpen} />}
        {favorites && others.length > 0 && <li className="messages__divider" role="separator" />}
        {others.map((chat) => (
          <ChatItem key={chat.id} chat={chat} onClick={onOpen} onLongPress={onMenu} selected={selected.includes(chat.id)} />
        ))}
        {found.length > 0 && (
          <li className="messages__found" role="presentation">
            Публичные общие чаты и каналы
          </li>
        )}
        {found.map((chat) => (
          <ChatItem key={`found-${chat.id}`} chat={chat} onClick={onOpenFound} />
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
  // Системная «назад» закрывает поиск, а не уводит с вкладки
  useEffect(() => {
    if (!searching) return;
    return guardBack(() => {
      setQuery('');
      setSearching(false);
    });
  }, [searching]);
  const [filter, setFilter] = useState<Filter>('all');
  // Пока страницы ведёт палец, чипс подсвечивает ту, что ближе к положению; отпустили — выбранный фильтр
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const chats = useChats();
  const folders = useFolders('chats');
  // Пока чипсы переставляют, страницы пейджера стоят в прежнем порядке (см. useFrozenWhile); чипсы показывают живой порядок
  const folderEditing = useFolderEditing('chats');
  const pagerFolders = useFrozenWhile(folderEditing, folders);
  const liveOrder = ['all', ...folders.map((f) => f.id)].join('|');
  const folderMenu = useFolderMenu('chats');
  const [toast, say] = useToast();
  const sel = useChatSelection(say);
  const root = useRef<HTMLElement | null>(null);
  // Экран нужен историям (открываются поверх него): после монтирования он попадает в состояние
  const [screen, setScreen] = useState<HTMLElement | null>(null);
  const setRoot = useCallback((el: HTMLElement | null) => {
    root.current = el;
    setScreen(el);
  }, []);

  /** Фильтры по порядку чипсов: по ним же идут страницы пейджера */
  const filters = useMemo<Filter[]>(() => ['all', ...pagerFolders.map((f) => f.id)], [pagerFolders]);
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

  // Поиск находит и публичные группы и каналы, в которых вас нет: по названию или адресу @имя
  const publicGroups = useAllGroups();
  const found = useMemo<Chat[]>(() => {
    const q = query.trim().toLowerCase().replace(/^@/, '');
    if (!q) return [];
    return publicGroups
      .filter((g) => g.isPublic && !isMember(g) && (g.name.toLowerCase().includes(q) || g.username.toLowerCase().includes(q)))
      .map((g) => ({ id: g.chatId, name: g.name, avatar: g.avatar, kind: g.kind, lastMessage: `@${g.username}, ${countText(g)}`, time: '', unread: 0 }));
  }, [publicGroups, query]);
  const openFound = useCallback((chat: Chat) => {
    const username = publicGroups.find((g) => g.chatId === chat.id)?.username;
    if (username) navigate(`/join/@${username}`);
  }, [publicGroups]);

  // Долгое нажатие на строку включает выбор, дальше нажатие выбирает и снимает; вне выбора строка открывает чат
  const { toggle, selecting } = sel;
  /** Когда выбрали строку долгим нажатием: список тут же сдвигается, и отпускание пальца может попасть в соседнюю строку */
  const heldAt = useRef(0);
  const tapChat = useCallback(
    (chat: Chat) => {
      if (Date.now() - heldAt.current < 400) return;
      if (selecting) toggle(chat);
      else openChat(chat);
    },
    [selecting, toggle, openChat],
  );
  const holdChat = useCallback(
    (chat: Chat) => {
      /** палец ещё на экране: клик, которым закончится нажатие, не считаем; отсчёт от отпускания */
      heldAt.current = Infinity;
      const release = () => {
        heldAt.current = Date.now();
        window.removeEventListener('pointerup', release, true);
        window.removeEventListener('pointercancel', release, true);
      };
      window.addEventListener('pointerup', release, true);
      window.addEventListener('pointercancel', release, true);
      toggle(chat);
    },
    [toggle],
  );

  const pages = useMemo(
    () => filters.map((id, i) => ({ key: id, node: <ChatList chats={lists[i]} archived={id === 'all' ? archived : []} onOpen={tapChat} onMenu={holdChat} selected={sel.ids} view={query.trim()} found={id === 'all' ? found : []} onOpenFound={openFound} /> })),
    [filters, lists, archived, tapChat, holdChat, sel.ids, query, found, openFound],
  );

  const index = Math.max(0, filters.indexOf(filter));
  // Свайп по самим чипсам: с «Все» вправо — в тесты, с последнего чипса влево — в профиль (по списку это делает пейджер)
  const onChips = (origin: Element) => Boolean(origin.closest('.screen-header__chips'));
  const atStart = useRef(true);
  const atEnd = useRef(false);
  atStart.current = index === 0;
  atEnd.current = index === filters.length - 1;
  useChipsDrag(root);
  useTabSwipe(root, 'right', 'tests', (o) => onChips(o) && atStart.current);
  useTabSwipe(root, 'left', 'profile', (o) => onChips(o) && atEnd.current);
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
      const at = liveOrder.split('|').indexOf(filters[index]);
      placePill(chips, kept && kept.length === chips.length && liveOrder === keptOrder.current ? kept : chips.map((_, i) => (i === at ? 1 : 0)));
      keptOrder.current = liveOrder;
    };
    place();
    const watch = new ResizeObserver(place);
    watch.observe(row);
    row.querySelectorAll('.chip').forEach((c) => watch.observe(c));
    void document.fonts?.ready.then(place);
    return () => watch.disconnect();
  }, [index, order, liveOrder, countsKey, searching]);

  return (
    <section ref={setRoot} className="messages" data-selecting={selecting ? '' : undefined}>
      <ChatsHeader
        searching={searching}
        onSearching={setSearching}
        query={query}
        onQuery={setQuery}
        storiesRoot={screen}
        selection={sel.header(chats)}
        chips={
          <>
            <Chip follow tone="chat" active={shown === 0} count={countOf('all')} onClick={() => setFilter('all')} onLongPress={(chip) => folderMenu.open('all', chip)}>
              Все
            </Chip>
            {folders.map(({ id, name, muted, color, ink, badge }) => (
              <Chip
                key={id}
                follow
                tone="chat"
                active={filters[shown] === id}
                count={countOf(id)}
                muted={muted}
                folder={{ scope: 'chats', id }}
                paint={{ color, ink, badge }}
                onClick={() => setFilter(id)}
                onLongPress={(chip) => folderMenu.open(id, chip)}
              >
                {name}
              </Chip>
            ))}
          </>
        }
      />

      {!selecting && !searching && !folderEditing && (
        <button type="button" className="messages__fab" aria-label="Новый чат" onClick={() => navigate('/new')}>
          <IconComposeMk />
        </button>
      )}
      <SwipePager key={order} index={index} pages={pages} onIndexChange={(i) => setFilter(filters[i])} onPosition={onPosition} onDrag={onDrag} onEdgeSwipe={(d) => switchTab(d > 0 ? 'profile' : 'tests', d > 0 ? 'slide-next' : 'slide-prev')} />

      {folderMenu.node}
      {toast && <Toast text={toast} />}
    </section>
  );
}
