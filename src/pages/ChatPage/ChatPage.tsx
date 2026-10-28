import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Avatar } from '../../components/Avatar/Avatar';
import { Badge } from '../../components/Badge/Badge';
import { countIn, useCommentsStore } from '../../data/comments';
import { IconBackMk, IconBookmarkMk, IconMenuMk, IconSearchMk } from '../../components/ChatItem/ChatIcons';
import { IconBellLine, IconBellOffLine, IconHourglass, IconInfo, IconLeave, IconPenNew, IconUserPlus } from '../../components/GroupUi/GroupIcons';
import { LeaveSheet } from '../../components/GroupUi/GroupSheets';
import { Toast } from '../../components/Toast/Toast';
import { useToast } from '../../components/Toast/useToast';
import { IconSearch, IconTabMessages } from '../../components/icons';
import { ChatHistory } from '../../components/ChatHistory/ChatHistory';
import { ChipMenu } from '../../components/FolderMenu/ChipMenu';
import { useChatTabs, type SectionId } from '../../data/chatTabs';
import { SECTION_GROUP, SECTION_ICON, SECTION_LABEL } from './chatSections';
import { IconGearMk, IconSearchMk as IconSearchMenu } from '../../components/ChatItem/ChatIcons';
import { Collapse } from '../../components/Collapse/Collapse';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { ChatInfo, ChatNotes, noteText, sectionText } from '../../components/ChatCase/ChatCase';
import { ChatTasks, ChatTests, SelfTasks, SelfTests } from '../../components/ChatTests/ChatTests';
import { TabBar, type TabId } from '../../components/TabBar/TabBar';
import { MessageBubble } from '../../components/MessageBubble/MessageBubble';
import { SentTaskSheet } from '../../components/MessageBubble/SentTaskSheet';
import { SentTestSheet } from '../../components/MessageBubble/SentTestSheet';
import { MessageInput } from '../../components/MessageInput/MessageInput';
import { SwipePager } from '../../components/SwipePager/SwipePager';
import { IconChevronDown, IconChevronUp, IconCopy, IconForward, IconReply, IconTrash } from '../../components/ChatParts/ChatIcons';
import IconSelect from '../../assets/icons/solar/checklist-minimalistic.svg?react';
import IconCloseMk from '../../assets/icons/solar/close.svg?react';
import { RemoveSheet } from '../../components/Profile/ProfileSheets';
import { deleteMessage, ensureContactChat, forwardMessage, markRead, sendMessage, setMessagePinned, setMessageReaction, setMutedMany, setOpenChat, updateMessage, useChat, useChats, useMessages, useTyping } from '../../data/chatStore';
import { ME, contactOf, firstNameOf, nameOf } from '../../data/contacts';
import { can, canDeleteOthers, canInvite, canPin, canWrite, canSendMedia, leaveGroup, memberOf, myMember, subtitleOf, useGroup, useSlowLeft } from '../../data/groups';
import { roleOf } from '../../data/roles';
import { ForwardSheet } from '../../components/ForwardSheet/ForwardSheet';
import { EMOJI_GROUPS } from '../../data/emojiSet';
import { addNote, addSection, deleteNotes, deleteSections, useClientData } from '../../data/clientStore';
import type { Message } from '../../data/messages';
import { LIBRARY, TASK_LIBRARY } from '../../data/library';
import { findClientTaskResult } from '../../data/clientTaskResults';
import { clientResultId, clientResultPath } from '../../data/resultLinks';
import { hasTaskSettings } from '../../data/taskValues';
import { goBack, goBackBy, guardBack, navigate } from '../../router';
import { IconPinned } from '../../components/FolderMenu/FolderIcons';
import { useBackHandler } from '../../utils/backHandler';
import { copyText } from '../../utils/clipboard';
import { useSwipeBack } from '../../utils/swipeBack';
import { installBubbleGradient } from '../../utils/bubbleGradient';
import { useExitAnimation } from '../../utils/exitAnimation';
import './ChatPage.css';

// Разделы карточки собеседника; при открытии чата виден «Диалог». Порядок и видимость вкладок настраивает пользователь (data/chatTabs.ts)

/** В «Избранном» нет истории взаимодействия: взаимодействовать не с кем */
const FAVORITES_HIDDEN: SectionId[] = ['library'];

/**
 * Сообщения одной серии: тот же автор (в группе — тот же участник), не карточка и не сообщение с кнопками, не служебная запись,
 * разница меньше 5 минут. Посты канала каждый сами по себе
 */
function sameRun(a: Message | undefined, b: Message | undefined, kind?: 'group' | 'channel') {
  if (!a || !b || kind === 'channel' || a.service || b.service || a.from !== b.from || a.author !== b.author || a.test || b.test || a.task || b.task || a.buttons || b.buttons) return false;
  const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const d = mins(b.time) - mins(a.time);
  return d >= 0 && d < 5;
}

/** Быстрые реакции над меню сообщения; остальные — по стрелке «ещё» */
const QUICK_REACTIONS = ['❤️', '👍', '👎', '🔥', '🥰', '👏', '😁'];
/** Все реакции по стрелке: лица, жесты и символы из набора эмодзи */
const MORE_REACTIONS = [...(EMOJI_GROUPS.find((g) => g.id === 'smileys')?.emojis ?? []), ...(EMOJI_GROUPS.find((g) => g.id === 'people')?.emojis ?? []).slice(0, 40), ...(EMOJI_GROUPS.find((g) => g.id === 'symbols')?.emojis ?? []).slice(0, 0)];
const REACT_BAR_H = 48;
const REACT_BAR_W = 328;
const MENU_W = 196;
const MENU_ITEM_H = 48;
/** Не ближе к краю ленты, чем поле страницы (--page-gutter), как у меню чипса */
const MENU_EDGE = 16;

/** Где можно ставить меню сообщения: вся лента, кроме полосы под шапкой (лента лежит под ней, и меню не должно закрывать название и кнопки) */
function menuBounds(list: HTMLElement | null) {
  if (!list) return undefined;
  const rect = list.getBoundingClientRect();
  const inset = parseFloat(getComputedStyle(list).paddingTop) || 0;
  return new DOMRect(rect.left, rect.top + inset, rect.width, rect.height - inset);
}

/** Текст плашки закреплённого: сообщение одной строкой, у карточки — её вид */
const pinPreview = (m: Message) => (m.test ? 'Тест' : m.task ? 'Задание' : m.text.replace(/\s*\n\s*/g, ' '));

/** Что в меню сообщения разрешено: в обычном чате всё (правка — только у своего текста, её определяет permsFor), в группе и канале — по правам и настройкам */
interface MenuPerms {
  reply: boolean;
  edit: boolean;
  pin: boolean;
  forward: boolean;
  copy: boolean;
  remove: boolean;
  /** Реакции, которые можно поставить; null — любые (обычный чат); пустой список — реакции выключены */
  reactions: string[] | null;
}

const FULL_PERMS: MenuPerms = { reply: true, edit: false, pin: true, forward: true, copy: true, remove: true, reactions: null };

/** В меню есть что показать: реакции или хотя бы одно действие */
const hasMenu = (p: MenuPerms) => p.reactions === null || p.reactions.length > 0 || p.reply || p.edit || p.pin || p.forward || p.copy || p.remove;

/** Меню сообщения по долгому нажатию: реакции, ответить, изменить, закрепить, переслать, копировать, удалить */
function MessageMenu({
  message,
  rect,
  bounds,
  perms,
  mine,
  onClose,
  onReply,
  onEdit,
  onPin,
  onDelete,
  onReact,
  onForward,
  onSelect,
  onCopy,
}: {
  message: Message;
  rect: DOMRect;
  bounds?: DOMRect;
  perms: MenuPerms;
  /** Сообщение справа (ваше в обычном чате и группе): меню встаёт по правому краю */
  mine: boolean;
  onClose: () => void;
  onReply: () => void;
  onEdit: () => void;
  onPin: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  onForward: () => void;
  onSelect: () => void;
  onCopy: () => void;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  // Меню открывается касанием, и «клик», идущий за ним следом, попал бы уже в меню и закрыл его: первые 350 мс оно сквозное
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setArmed(true), 350);
    return () => window.clearTimeout(t);
  }, []);
  useExitAnimation(backdropRef);
  // Escape закрывает меню (на компьютере)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const items = [
    ...(perms.reply ? [{ label: 'Ответить', Icon: IconReply, run: onReply, danger: false }] : []),
    ...(perms.edit ? [{ label: 'Изменить', Icon: IconPenNew, run: onEdit, danger: false }] : []),
    ...(perms.pin ? [{ label: message.pinned ? 'Открепить' : 'Закрепить', Icon: IconPinned, run: onPin, danger: false }] : []),
    ...(perms.forward ? [{ label: 'Переслать', Icon: IconForward, run: onForward, danger: false }] : []),
    ...(perms.copy && message.text ? [{ label: 'Копировать', Icon: IconCopy, run: onCopy, danger: false }] : []),
    { label: 'Выбрать', Icon: IconSelect, run: onSelect, danger: false },
    ...(perms.remove ? [{ label: 'Удалить', Icon: IconTrash, run: onDelete, danger: true }] : []),
  ];
  // Панель реакций: в группе и канале только те, что разрешил владелец, и без стрелки «ещё»; если реакции выключены, панели нет
  const quick = perms.reactions ?? QUICK_REACTIONS;
  const reactable = quick.length > 0;
  const expandable = perms.reactions === null;
  const barH = reactable ? REACT_BAR_H + 8 : 0;
  const h = items.length * MENU_ITEM_H + (items.length ? 8 : 0);
  const minLeft = (bounds?.left ?? 0) + MENU_EDGE;
  const right = (bounds?.right ?? window.innerWidth) - MENU_EDGE;
  const maxLeft = right - MENU_W;
  const left = Math.max(minLeft, Math.min(mine ? rect.right - MENU_W : rect.left, maxLeft));
  // 16 — поля плашки, 40 — кнопка реакции, 32 — стрелка «ещё»
  const barW = Math.min(expandable ? REACT_BAR_W : 16 + quick.length * 40, right - minLeft);
  const barLeft = Math.max(minLeft, Math.min(mine ? rect.right - barW : rect.left, right - barW));
  // Сверху вниз: панель реакций, под ней меню; весь столбик над сообщением или, если там тесно, под ним
  const stack = barH + h;
  const topLimit = bounds?.top ?? 0;
  const above = rect.top - stack - 8 >= topLimit;
  const stackTop = above ? rect.top - stack - 8 : Math.min(rect.bottom + 8, window.innerHeight - stack - 8);
  const barTop = stackTop;
  const top = stackTop + barH;
  // Меню вырастает от пузыря: над ним — от нижнего края, под ним — от верхнего; сторону задаёт автор сообщения
  const origin = `${above ? 'bottom' : 'top'} ${mine ? 'right' : 'left'}`;
  const pick = (emoji: string) => {
    onReact(emoji);
    onClose();
  };
  return (
    <div ref={backdropRef} className="msg-menu__backdrop" data-no-swipe style={armed ? undefined : { pointerEvents: 'none' }} onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }}>
      {reactable && (
      <div
        className={`msg-react${more ? ' msg-react--more' : ''}`}
        role="group"
        aria-label="Реакции"
        style={{ left: barLeft, top: barTop, width: barW, transformOrigin: origin }}
        onClick={(e) => e.stopPropagation()}
      >
        {more ? (
          <ul className="msg-react__grid">
            {MORE_REACTIONS.map((emoji) => (
              <li key={emoji}>
                <button type="button" className={`msg-react__emoji${message.reaction === emoji ? ' msg-react__emoji--on' : ''}`} onClick={() => pick(emoji)}>
                  {emoji}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="msg-react__row">
            {quick.map((emoji) => (
              <button key={emoji} type="button" className={`msg-react__emoji${message.reaction === emoji ? ' msg-react__emoji--on' : ''}`} aria-label={`Реакция ${emoji}`} onClick={() => pick(emoji)}>
                {emoji}
              </button>
            ))}
            {expandable && (
              <button type="button" className="msg-react__more" aria-label="Все реакции" onClick={() => setMore(true)}>
                <IconChevronDown />
              </button>
            )}
          </div>
        )}
      </div>
      )}
      {!more && items.length > 0 && (
        <ul className="msg-menu" role="menu" style={{ left, top, width: MENU_W, transformOrigin: origin }} onClick={(e) => e.stopPropagation()}>
          {items.map(({ label, Icon, run, danger }) => (
            <li key={label}>
              <button
                type="button"
                role="menuitem"
                className={`msg-menu__item${danger ? ' msg-menu__item--danger' : ''}`}
                onClick={() => {
                  run();
                  onClose();
                }}
              >
                <Icon />
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface SectionPageProps {
  id: Exclude<SectionId, 'messages'>;
  chatId: string;
  /** Чат «Избранное»: вместо тестов клиента показываются свои */
  favorites: boolean;
  hasClientData: boolean;
  /** Раздел сейчас на экране */
  active: boolean;
  onAppTabChange: (id: TabId) => void;
  /** Выбранные карточки заметок или сведений (null — выбора нет) и отметка карточки */
  picked: string[] | null;
  onPick: (id: string) => void;
}

/**
 * Страница раздела, кроме переписки: содержимое и снизу панель. У «Заметок» и «Сведений» это поле ввода, как в переписке:
 * зашёл во вкладку и сразу пишешь; у остальных — панель приложения. Не перерисовывается, пока не изменились эти поля
 */
const SectionPage = memo(function SectionPage({ id, chatId, favorites, hasClientData, active, onAppTabChange, picked, onPick }: SectionPageProps) {
  return (
    <>
      {id === 'tests' &&
        (favorites ? (
          <SelfTests onOpen={(resultId) => navigate(`/chat/${chatId}/result/${resultId}`)} />
        ) : (
          <ChatTests
            hasData={hasClientData}
            onOpenTest={(testId) => navigate(`/chat/${chatId}/tests/${testId}`)}
            onOpenResult={(resultId) => navigate(clientResultPath(chatId, resultId))}
          />
        ))}
      {id === 'tasks' &&
        (favorites ? (
          <SelfTasks onOpen={(resultId) => navigate(`/chat/${chatId}/result/${resultId}`)} />
        ) : (
          <ChatTasks
            hasData={hasClientData}
            onOpenTask={(taskId) => hasTaskSettings(taskId) && navigate(`/chat/${chatId}/tasks/${taskId}`)}
            onOpenResult={(taskId) => findClientTaskResult(clientResultId(chatId, taskId)) && navigate(clientResultPath(chatId, taskId))}
          />
        ))}
      {id === 'notes' && (
        <>
          <ChatNotes chatId={chatId} selected={picked} onPick={onPick} />
          <MessageInput placeholder="Напишите заметку" extras={false} active={active} onSend={(text) => void addNote(chatId, text)} />
        </>
      )}
      {id === 'info' && (
        <>
          <ChatInfo chatId={chatId} selected={picked} onPick={onPick} />
          <MessageInput placeholder="Добавьте сведения" extras={false} active={active} onSend={(text) => void addSection(chatId, text)} />
        </>
      )}
      {id === 'library' && <ChatHistory hasData={hasClientData} />}
      {id !== 'notes' && id !== 'info' && <TabBar active="messages" onChange={onAppTabChange} />}
    </>
  );
});

interface ChatPageProps {
  chatId: string;
  /** Нажатие на кнопку нижней панели (панель видна на вкладках кроме «Сообщения») */
  onAppTabChange: (id: TabId) => void;
}

/** Чат с собеседником. Настройка теста и результат открываются поверх него отдельными экранами (ChatScreens.tsx) */
export function ChatPage({ chatId, onAppTabChange }: ChatPageProps) {
  // Раздел, который выбрал пользователь (нажатием на вкладку или свайпом)
  const [picked, setSection] = useState<SectionId>('messages');
  // После первого показа новые сообщения появляются с движением, а уже лежавшие в ленте — нет (см. styles/micro.css)
  useEffect(() => {
    listRef.current?.setAttribute('data-live', '');
  }, []);

  // Тесты, задания и история пока есть только у Максима
  const hasClientData = chatId === 'maxim';
  const chat = useChat(chatId);
  // Группа или канал: участники, права и настройки лежат в data/groups.ts; у обычного диалога info нет
  const groupInfo = useGroup(chatId);
  const info = chat?.kind ? groupInfo : undefined;
  const kind = info?.kind;
  const commentStore = useCommentsStore();
  const slow = useSlowLeft(chatId);
  const [toast, say] = useToast();
  const tabs = useChatTabs();
  // Вкладки в порядке пользователя, без скрытых им; в «Избранном» ещё и без истории; в группе и канале вкладок собеседника нет — только переписка
  const sections = useMemo(() => {
    const all = tabs.order.filter((id) => !tabs.hidden.includes(id) && !(chat?.favorites && FAVORITES_HIDDEN.includes(id)));
    return (kind ? (['messages'] as SectionId[]) : all).map((id) => ({ id, label: SECTION_LABEL[id] }));
  }, [tabs, chat?.favorites, kind]);
  // Выбранного раздела может не быть в списке (чат сменился на «Избранное»): тогда открыта переписка
  const section: SectionId = sections.some(({ id }) => id === picked) ? picked : 'messages';
  const groups = useMessages(chatId);
  const typing = useTyping(chatId);
  // Закреплённые по порядку переписки; плашка под шапкой показывает один и по нажатию переходит к нему, следующее нажатие — к предыдущему
  const pins = useMemo(() => groups.flatMap((g) => g.messages).filter((m) => m.pinned), [groups]);
  const [pinAt, setPinAt] = useState<number | undefined>(undefined);
  const pinNow = pins.length ? Math.min(pinAt ?? pins.length - 1, pins.length - 1) : 0;
  const listRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const prevCount = useRef(0);
  const [distance, setDistance] = useState(0);
  const [unseen, setUnseen] = useState(0);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  // Сообщение группы или канала, которое правится в поле ввода
  const [editing, setEditing] = useState<Message | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [menu, setMenu] = useState<{ message: Message; rect: DOMRect } | null>(null);
  // Карточка отправленного теста, чьи настройки показаны в окне
  const [settingsOf, setSettingsOf] = useState<Message | null>(null);
  const [forwarding, setForwarding] = useState<Message[] | null>(null);
  // Режим выбора: id отмеченных сообщений (null — обычный режим); с ним копирование, пересылка и удаление сразу нескольких
  const [selected, setSelected] = useState<string[] | null>(null);
  // Что удаляется, ждёт подтверждения в окне: одно сообщение из меню, отмеченные при выборе (null — окна нет)
  const [removing, setRemoving] = useState<string[] | null>(null);
  const allChats = useChats();
  const [searchOpen, setSearchOpen] = useState(false);
  /** Плашка закрепа видна: есть закреплённые, открыты сообщения и поиск по чату закрыт */
  const pinShown = pins.length > 0 && section === 'messages' && !searchOpen;
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ rect: DOMRect; opener: HTMLElement } | null>(null);
  // «Поиск по чату» из боковой панели на другой вкладке: сначала едем в диалог, и только потом поиск открывается
  const searchAfterSwitch = useRef(false);

  const flat = useMemo(() => groups.flatMap((g) => g.messages), [groups]);
  const byId = useMemo(() => new Map(flat.map((m) => [m.id, m])), [flat]);
  const q = query.trim().toLowerCase();
  const matches = useMemo(() => (q ? flat.filter((m) => m.text.toLowerCase().includes(q)).map((m) => m.id) : []), [flat, q]);
  const activeId = matches[activeIdx];

  const scrollToBottom = (smooth = false) => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  };

  // Градиент исходящих пузырей привязан к окну ленты (utils/bubbleGradient.ts)
  const hasChat = Boolean(chat);
  useEffect(() => {
    const feed = listRef.current;
    return feed ? installBubbleGradient(feed) : undefined;
  }, [hasChat]);

  // Переписка открывается внизу, у последних сообщений. Уйдя в тест или результат, чат остаётся под ним как был
  useEffect(() => {
    scrollToBottom();
    atBottom.current = true;
    setUnseen(0);
    setReplyTo(null);
    setEditing(null);
  }, [chatId]);

  // Открытый чат: входящие в нём сразу прочитаны (новое сообщение группы не копит счётчик, пока читаешь)
  useEffect(() => {
    setOpenChat(chatId);
    markRead(chatId);
    return () => setOpenChat(null);
  }, [chatId]);

  // Листая разделы, переписку не теряем: прокрутка, набранный текст и ответ остаются на месте. Закрывается только поиск
  // (кроме случая, когда в диалог перешли как раз ради поиска)
  useEffect(() => {
    if (searchAfterSwitch.current && section === 'messages') {
      searchAfterSwitch.current = false;
      setSearchOpen(true);
      return;
    }
    setSearchOpen(false);
    setQuery('');
  }, [chatId, section]);

  // Новое сообщение: своё или когда читаешь последнее, лента едет вниз; иначе копится счётчик входящих
  const messageCount = flat.length;
  useEffect(() => {
    const added = messageCount - prevCount.current;
    prevCount.current = messageCount;
    if (added <= 0) return;
    const last = flat[flat.length - 1];
    if (last?.from === 'me' || atBottom.current) scrollToBottom(prevCount.current > added);
    else if (last?.from === 'them') setUnseen((n) => n + added);
  }, [messageCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // «Печатает…» тоже держим в поле зрения, если читаешь последнее
  useEffect(() => {
    if (typing && atBottom.current) scrollToBottom(true);
  }, [typing]);

  const onFeedScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const d = el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottom.current = d < 80;
    setDistance(d);
    if (d < 80) setUnseen(0);
  };

  // Поиск: новый запрос начинает с самого свежего совпадения, переход к совпадению прокручивает к нему
  useEffect(() => setActiveIdx(Math.max(matches.length - 1, 0)), [q]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!activeId) return;
    listRef.current?.querySelector(`[data-mid="${activeId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeId]);

  const jumpTo = (id: string) => {
    const el = listRef.current?.querySelector(`[data-mid="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('bubble--flash');
    void (el as HTMLElement).offsetWidth;
    el.classList.add('bubble--flash');
    window.setTimeout(() => el.classList.remove('bubble--flash'), 1200);
  };

  const showPin = () => {
    if (!pins.length) return;
    jumpTo(pins[pinNow].id);
    setPinAt((pinNow - 1 + pins.length) % pins.length);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery('');
  };
  // Жест «назад» при открытом поиске закрывает его, как кнопка в строке поиска
  useBackHandler(searchOpen && section === 'messages', closeSearch);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  // Жест «назад» при открытой боковой панели закрывает её
  useBackHandler(menuOpen, closeMenu);
  // Системная «назад» (кнопка телефона) при открытой панели закрывает её, а не уводит из чата
  useEffect(() => (menuOpen ? guardBack(closeMenu) : undefined), [menuOpen, closeMenu]);
  // Так же с открытым поиском по чату
  const closeSearchNow = useRef(closeSearch);
  closeSearchNow.current = closeSearch;
  useEffect(() => (searchOpen && section === 'messages' ? guardBack(() => closeSearchNow.current()) : undefined), [searchOpen, section]);
  // Чат сменился или закрылся: панель не остаётся открытой
  useEffect(() => setMenuOpen(false), [chatId]);
  useEffect(() => setSelected(null), [chatId, section]);
  const pickCard = useCallback(
    (id: string) =>
      setSelected((now) => {
        if (!now) return [id];
        const next = now.includes(id) ? now.filter((x) => x !== id) : [...now, id];
        return next.length ? next : null;
      }),
    [],
  );
  const { notes: allNotes, caseSections: allSections } = useClientData();
  const cards = section === 'notes' || section === 'info';
  // Жест и системная «назад» при выборе сообщений выходят из выбора, а не из чата
  const cancelSelect = useCallback(() => setSelected(null), []);
  const selecting = selected !== null;
  useBackHandler(selecting, cancelSelect);
  useEffect(() => (selecting ? guardBack(cancelSelect) : undefined), [selecting, cancelSelect]);
  // Escape (на компьютере) выходит из выбора, если поверх него не открыто меню, пересылка или подтверждение: те закрывает сам Escape
  useEffect(() => {
    if (!selecting || menu || forwarding || removing) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && cancelSelect();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selecting, menu, forwarding, removing, cancelSelect]);

  const index = sections.findIndex((item) => item.id === section);

  // Свайп вправо в диалоге (первая страница, листать влево нечего) возвращает в список чатов, как стрелка в шапке
  useSwipeBack('.chat', index === 0 && !menuOpen && !searchOpen && !selecting, () => goBack());

  if (!chat) {
    return (
      <section className="chat">
        <EmptyState icon={<IconSearch />} title="Чат не найден" text="Возможно, его удалили." />
      </section>
    );
  }

  // ---- Группа и канал: что можно вам, как подписаны авторы, что стоит вместо поля ввода
  const writer = canWrite(info);
  const toggleMute = () => {
    setMutedMany([chatId], !chat.muted);
    say(chat.muted ? 'Звук включён' : 'Звук отключён');
  };
  /** Подпись автора рядом с именем в группе: владелец, администратор (со своей подписью, если она есть) */
  const authorTitle = (m: Message) => {
    const mem = info && m.author ? memberOf(info, m.author) : undefined;
    return mem?.role === 'owner' ? 'владелец' : mem?.role === 'admin' ? mem.title || 'админ' : undefined;
  };
  /** Чьё сообщение: «Вы», имя участника группы или собеседника */
  const replyFrom = (m: Message) => (m.from === 'me' ? 'Вы' : kind === 'group' && m.author ? firstNameOf(m.author) : chat.name.split(' ')[0]);
  const permsFor = (m: Message): MenuPerms => {
    const mine = m.from === 'me';
    // Править можно только свой обычный текст: карточки тестов и заданий, фото, файлы и пересланное остаются как есть
    const editable = mine && !m.image && !m.file && !m.test && !m.task && !m.forwarded && Boolean(m.text);
    if (!info) return { ...FULL_PERMS, edit: editable };
    const channel = info.kind === 'channel';
    return {
      reply: writer,
      edit: editable && (channel ? can(info, 'postMessages') : true),
      pin: canPin(info),
      forward: !info.protectContent,
      copy: !info.protectContent && Boolean(m.text),
      remove: mine ? (channel ? can(info, 'postMessages') : true) : canDeleteOthers(info),
      reactions: info.reactions,
    };
  };
  const toggleSelected = (id: string) =>
    setSelected((now) => {
      if (!now) return now;
      const next = now.includes(id) ? now.filter((x) => x !== id) : [...now, id];
      return next.length ? next : null;
    });
  /** Нажатие рядом с пузырём (на кружок, в пустое место строки) отмечает строку, на уровне которой оно пришлось: строка целиком — одна мишень, как в Telegram */
  const pickByRow = (e: React.MouseEvent<HTMLUListElement>) => {
    if (e.target !== e.currentTarget) return;
    let best: { id: string; gap: number } | null = null;
    e.currentTarget.querySelectorAll<HTMLElement>(':scope > li[data-selecting]').forEach((el) => {
      const r = el.getBoundingClientRect();
      // Строку держат её границы и половина зазора до соседей (4): в зазоре выигрывает ближайшая
      const gap = Math.abs(e.clientY - (r.top + r.bottom) / 2) - r.height / 2;
      if (gap <= 4 && (!best || gap < best.gap)) best = { id: el.dataset.mid ?? '', gap };
    });
    const hit = best as { id: string } | null;
    if (hit?.id) toggleSelected(hit.id);
  };
  /** Отмеченные сообщения в порядке переписки */
  const chosen = selected ? flat.filter((m) => selected.includes(m.id)) : [];
  const canCopyMany = cards || chosen.some((m) => permsFor(m).copy);
  const canForwardMany = chosen.length > 0 && chosen.every((m) => permsFor(m).forward);
  const canRemoveMany = cards || (chosen.length > 0 && chosen.every((m) => permsFor(m).remove));
  const copyMany = () => {
    const ids = selected ?? [];
    const text = cards
      ? (section === 'notes' ? allNotes.filter((n) => ids.includes(n.id)).map(noteText) : allSections.filter((x) => ids.includes(x.id)).map(sectionText)).join('\n\n')
      : chosen.filter((m) => permsFor(m).copy).map((m) => m.text).join('\n\n');
    void copyText(text).then((ok) => say(ok ? 'Скопировано' : 'Не удалось скопировать'));
    setSelected(null);
  };
  const removeTitle = (n: number) =>
    section === 'notes' ? (n > 1 ? 'Удалить заметки?' : 'Удалить заметку?') : section === 'info' ? 'Удалить сведения?' : n > 1 ? 'Удалить сообщения?' : 'Удалить сообщение?';
  const removeNow = () => {
    const ids = removing ?? [];
    if (cards) {
      if (section === 'notes') deleteNotes(ids);
      else deleteSections(ids);
    } else {
      ids.forEach((id) => deleteMessage(chatId, id));
      if (replyTo && ids.includes(replyTo.id)) setReplyTo(null);
      if (editing && ids.includes(editing.id)) setEditing(null);
    }
    setRemoving(null);
    setSelected(null);
  };
  /** Названия чатов, куда ушла пересылка: для подтверждения внизу */
  const forwardedTo = (ids: string[]) =>
    ids.length === 1 ? `Переслано: ${allChats.find((c) => c.id === ids[0])?.name ?? 'чат'}` : `Переслано: ${ids.length} чатов`;
  const mmss = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
  let composerBar: ReactNode;
  if (selecting && section === 'messages') {
    // Пока выбирают сообщения, вместо поля ввода (оно остаётся со своим черновиком) стоят действия: ответить на одно и переслать
    const replyOne = chosen.length === 1 && permsFor(chosen[0]).reply;
    composerBar = (
      <div className="composer__select" role="toolbar" aria-label="Действия с выбранными сообщениями">
        {replyOne && (
          <button
            type="button"
            className="composer__bar"
            onClick={() => {
              setReplyTo(chosen[0]);
              setSelected(null);
            }}
          >
            <IconReply />
            Ответить
          </button>
        )}
        <button type="button" className="composer__bar" disabled={!canForwardMany} onClick={() => setForwarding(chosen)}>
          <IconForward />
          Переслать
        </button>
      </div>
    );
  } else if (info && !writer) {
    composerBar =
      kind === 'channel' ? (
        <button type="button" className="composer__bar" onClick={toggleMute}>
          {chat.muted ? <IconBellLine /> : <IconBellOffLine />}
          {chat.muted ? 'Включить звук' : 'Отключить звук'}
        </button>
      ) : (
        <p className="composer__bar composer__bar--note" role="status">
          {myMember(info)?.silenced ? 'Администратор запретил вам писать' : 'Писать здесь могут только администраторы'}
        </p>
      );
  } else if (info && slow > 0) {
    composerBar = (
      <p className="composer__bar composer__bar--note" role="status">
        <IconHourglass />
        Медленный режим: {mmss(slow)}
      </p>
    );
  }

  // Переписка: лента и панель ввода. Меню сообщения стоит вне страниц (ему нужен весь экран, а не сдвинутая страница)
  const messagesPage = (
    <>
      <div className="chat__feed">
        <div className="chat__messages" ref={listRef} onScroll={onFeedScroll}>
          {groups.length === 0 && (
            <EmptyState
              icon={<IconTabMessages />}
              title="Пока нет сообщений"
              text={
                chat.favorites
                  ? 'Здесь будут тесты и задания, которые вы отправляете себе.'
                  : kind === 'channel'
                    ? writer
                      ? 'Опубликуйте первый пост — подписчики увидят его здесь.'
                      : 'В канале ещё нет публикаций.'
                    : 'Напишите первое сообщение — оно появится здесь.'
              }
            />
          )}
          {groups.map((group) => (
            <ul
              className={`chat__group${kind ? ` chat__group--${kind === 'group' ? 'grp' : 'chan'}` : ''}${selecting ? ' chat__group--selecting' : ''}`}
              key={group.label}
              onClick={selecting ? pickByRow : undefined}
            >
              <li className="chat__day">
                <span>{group.label}</span>
              </li>
              {group.messages.map((m, i) => {
                const prev = group.messages[i - 1];
                const next = group.messages[i + 1];
                return (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    replyTarget={m.replyTo ? byId.get(m.replyTo) : undefined}
                    peerName={chat.name.split(' ')[0]}
                    peerAvatar={chat.avatar}
                    showMeta={!sameRun(m, next, kind) || Boolean(m.pinned)}
                    joinPrev={sameRun(prev, m, kind)}
                    chatKind={kind}
                    showAuthor={!sameRun(prev, m, kind)}
                    showAvatar={!sameRun(m, next, kind)}
                    authorTitle={authorTitle(m)}
                    commentCount={kind === 'channel' && info?.comments && !m.service ? countIn(commentStore, chatId, m.id) : undefined}
                    onOpenComments={() => navigate(`/chat/${chatId}/comments/${m.id}`)}
                    onOpenAuthor={(who) => {
                      const person = contactOf(who);
                      if (!person || who === ME) return;
                      ensureContactChat(person);
                      navigate(`/chat/${who}/contact`);
                    }}
                    query={q}
                    activeMatch={m.id === activeId}
                    test={m.test ? LIBRARY.find((t) => t.id === m.test) : m.task ? TASK_LIBRARY.find((t) => t.id === m.task) : undefined}
                    selecting={selecting}
                    selected={Boolean(selected?.includes(m.id))}
                    onSelect={(message) => !message.service && setSelected([message.id])}
                    onReply={(message) => writer && !selecting && !message.service && setReplyTo(message)}
                    onMenu={(message, rect) => (selecting ? toggleSelected(message.id) : hasMenu(permsFor(message)) && setMenu({ message, rect }))}
                    onReact={(m, emoji) => setMessageReaction(chatId, m.id, emoji)}
                    onQuoteClick={jumpTo}
                    onOpenTest={(id) => navigate(`/chat/${chatId}/tests/${id}`)}
                    onOpenTask={(id) => navigate(`/chat/${chatId}/tasks/${id}`)}
                    onTestSettings={(m) => navigate(`/chat/${chatId}/sent/${m.id}`)}
                    onOpenLink={(href) => navigate(href)}
                  />
                );
              })}
            </ul>
          ))}
          {typing && (
            <ul className="chat__group chat__group--typing">
              <li className="bubble bubble--in bubble--typing" aria-label="печатает">
                <i />
                <i />
                <i />
              </li>
            </ul>
          )}
        </div>

        {/* Кнопка всегда в разметке: появляется и прячется плавно (data-shown), скрытая не берёт фокус и касания */}
        <button type="button" className="chat__down" data-shown={distance > 240 || unseen > 0 ? '' : undefined} aria-label="К последним сообщениям" onClick={() => scrollToBottom(true)}>
          <IconChevronDown />
          {unseen > 0 && <span className="chat__down-badge">{unseen}</span>}
        </button>
      </div>

      <MessageInput
        placeholder={kind === 'channel' ? 'Опубликовать' : 'Сообщение'}
        bar={composerBar}
        noAttach={!canSendMedia(info)}
        onSend={(text) => {
          // Правка заменяет текст, новое сообщение не появляется; «изм.» только если текст правда изменился
          if (editing) {
            if (text && text !== editing.text) updateMessage(chatId, editing.id, { text, edited: true });
            setEditing(null);
            return;
          }
          sendMessage(chatId, text, replyTo?.id);
          setReplyTo(null);
        }}
        onAttach={(files) =>
          files.forEach((f) => {
            const url = URL.createObjectURL(f);
            // Картинка уходит фото, остальное — файлом с названием и размером
            sendMessage(chatId, '', undefined, f.type.startsWith('image/') ? { image: url } : { file: { name: f.name, size: f.size, url } });
          })
        }
        onLayoutChange={() => atBottom.current && scrollToBottom()}
        edit={editing ? { key: editing.id, text: editing.text } : undefined}
        reply={
          editing
            ? { name: '', text: editing.text.replace(/\s*\n\s*/g, ' '), edit: true }
            : replyTo
              ? { name: replyFrom(replyTo), text: replyTo.test ? 'Тест' : replyTo.task ? 'Задание' : replyTo.text.replace(/\s*\n\s*/g, ' ') }
              : undefined
        }
        onCancelReply={() => (editing ? setEditing(null) : setReplyTo(null))}
      />
    </>
  );

  const pages = sections.map(({ id }) => ({
    key: id,
    node:
      id === 'messages' ? (
        messagesPage
      ) : (
        <SectionPage
          id={id}
          chatId={chatId}
          favorites={Boolean(chat.favorites)}
          hasClientData={hasClientData}
          active={id === section}
          onAppTabChange={onAppTabChange}
          picked={id === section ? selected : null}
          onPick={pickCard}
        />
      ),
  }));

  // Подпись под именем: в диалоге — состояние собеседника, в остальных вкладках — название вкладки (чипсов разделов в шапке больше нет)
  const status = info ? subtitleOf(info) : chat.favorites ? 'Только для вас' : typing ? 'печатает…' : roleOf(chat);
  const subtitle = section === 'messages' ? status : (sections.find((item) => item.id === section)?.label ?? '');
  const avatar = chat.favorites ? <Avatar icon={<IconBookmarkMk />} /> : <Avatar src={chat.avatar} alt="" presence={chat.online && !info ? 'online' : undefined} />;

  const openSearch = () => {
    setMenuOpen(false);
    if (section === 'messages') {
      setSearchOpen(true);
    } else {
      searchAfterSwitch.current = true;
      setSection('messages');
    }
  };

  return (
    <section className="chat" data-pinned={pinShown ? '' : undefined}>
      <header className="chat__header">
        {selecting ? (
          <div key="select" className="chat__top chat__select">
            <button type="button" className="chat__action" aria-label="Отменить выбор" onClick={cancelSelect}>
              <IconCloseMk />
            </button>
            <h1 className="chat__select-title" aria-live="polite">
              Выбрано <Badge count={cards ? (selected?.length ?? 0) : chosen.length} variant="select" />
            </h1>
            <div className="chat__select-actions">
              <button type="button" className="chat__action" aria-label="Копировать" disabled={!canCopyMany} onClick={copyMany}>
                <IconCopy />
              </button>
              {!cards && (
                <button type="button" className="chat__action" aria-label="Переслать" disabled={!canForwardMany} onClick={() => setForwarding(chosen)}>
                  <IconForward />
                </button>
              )}
              <button type="button" className="chat__action" aria-label="Удалить" disabled={!canRemoveMany} onClick={() => setRemoving(selected)}>
                <IconTrash />
              </button>
            </div>
          </div>
        ) : searchOpen && section === 'messages' ? (
          <div key="search" className="chat__top chat__search">
            <label className="chat__search-field">
              <IconSearchMk />
              <input
                className="chat__search-input"
                type="search"
                autoFocus
                placeholder="Поиск по чату"
                aria-label="Поиск по чату"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') closeSearch();
                  if (e.key === 'Enter' && matches.length) setActiveIdx((i) => (e.shiftKey ? (i + 1) % matches.length : (i - 1 + matches.length) % matches.length));
                }}
              />
              <span className="chat__search-count">{q ? (matches.length ? `${activeIdx + 1} из ${matches.length}` : 'Нет') : ''}</span>
            </label>
            <button
              type="button"
              className="chat__action chat__action--small"
              aria-label="Предыдущее совпадение"
              disabled={!matches.length}
              onClick={() => setActiveIdx((i) => (i - 1 + matches.length) % matches.length)}
            >
              <IconChevronUp />
            </button>
            <button
              type="button"
              className="chat__action chat__action--small"
              aria-label="Следующее совпадение"
              disabled={!matches.length}
              onClick={() => setActiveIdx((i) => (i + 1) % matches.length)}
            >
              <IconChevronDown />
            </button>
            <button type="button" className="chat__cancel" onClick={closeSearch}>
              Отмена
            </button>
          </div>
        ) : (
          <div key="top" className="chat__top">
            <button type="button" className="chat__action" aria-label="Назад" onClick={() => goBack()}>
              <IconBackMk />
            </button>
            {/* Фото и имя открывают профиль собеседника (у «Избранного» профиля нет) */}
            {chat.favorites ? (
              <>
                {avatar}
                <div className="chat__who">
                  <h1 className="chat__name">{chat.name}</h1>
                  <p className="chat__status">{subtitle}</p>
                </div>
              </>
            ) : (
              <button
                type="button"
                className="chat__peer"
                aria-label={info ? `${kind === 'channel' ? 'О канале' : 'Об общем чате'}: ${chat.name}` : `Профиль: ${chat.name}`}
                onClick={() => navigate(info ? `/chat/${chatId}/g` : `/chat/${chatId}/contact`)}
              >
                {avatar}
                <div className="chat__who">
                  <h1 className="chat__name">{chat.name}</h1>
                  <p className={`chat__status${section === 'messages' && typing ? ' chat__status--typing' : ''}`}>{subtitle}</p>
                </div>
              </button>
            )}
            <button
              type="button"
              className="chat__action"
              aria-label="Меню чата"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              onClick={(e) => {
                setMenuAnchor({ rect: e.currentTarget.getBoundingClientRect(), opener: e.currentTarget });
                setMenuOpen(true);
              }}
            >
              <IconMenuMk />
            </button>
          </div>
        )}
        {/* Плашка раскрывается и сворачивается по высоте (лента под ней сдвигается в такт: --chat-pin в ChatPage.css); при смене закрепа текст всплывает */}
        <Collapse open={pinShown}>
          {pins.length > 0 && (
            <div className="chat__pin">
              <button type="button" className="chat__pin-main" onClick={showPin}>
                <span key={`title${pinNow}`} className="chat__pin-title">
                  {pins.length > 1 ? `Закреплённое сообщение #${pinNow + 1}` : 'Закреплённое сообщение'}
                </span>
                <span key={`text${pinNow}`} className="chat__pin-text">
                  {pinPreview(pins[pinNow])}
                </span>
              </button>
              {canPin(info) && (
                <button type="button" className="chat__pin-off" aria-label="Открепить" onClick={() => setMessagePinned(chatId, pins[pinNow].id, false)}>
                  <IconPinned />
                </button>
              )}
            </div>
          )}
        </Collapse>
      </header>

      <SwipePager index={index} pages={pages} onIndexChange={(i) => setSection(sections[i].id)} />

      {menuOpen && menuAnchor && (
        <ChipMenu
          anchor={menuAnchor.rect}
          opener={menuAnchor.opener}
          label="Меню чата"
          width={240}
          onClose={closeMenu}
          items={
            info
              ? [
                  { key: 'm-search', label: 'Поиск', Icon: IconSearchMenu, run: openSearch },
                  { key: 'm-info', label: kind === 'channel' ? 'О канале' : 'Об общем чате', Icon: IconInfo, run: () => navigate(`/chat/${chatId}/g`) },
                  { key: 'm-mute', label: chat.muted ? 'Включить звук' : 'Отключить звук', Icon: chat.muted ? IconBellLine : IconBellOffLine, run: toggleMute },
                  ...(canInvite(info) ? [{ key: 'm-add', label: kind === 'channel' ? 'Добавить подписчиков' : 'Добавить пользователей', Icon: IconUserPlus, run: () => navigate(`/chat/${chatId}/g/add`) }] : []),
                  {
                    key: 'm-leave',
                    label: myMember(info)?.role === 'owner' ? (kind === 'channel' ? 'Удалить канал' : 'Удалить общий чат') : kind === 'channel' ? 'Отписаться' : 'Покинуть общий чат',
                    Icon: IconLeave,
                    danger: true,
                    gap: true,
                    run: () => setLeaving(true),
                  },
                ]
              : [
            { key: 'm-search', label: 'Поиск', Icon: IconSearchMenu, run: openSearch },
            // Порядок меню — порядок вкладок пользователя; отступ там, где меняется смысловая группа
            ...sections.map(({ id, label }, i) => ({
              key: `m-${id}`,
              label,
              Icon: SECTION_ICON[id],
              gap: i > 0 && SECTION_GROUP[id] !== SECTION_GROUP[sections[i - 1].id],
              run: () => {
                setSection(id);
                setMenuOpen(false);
              },
            })),
            { key: 'm-settings', label: 'Настройки', Icon: IconGearMk, gap: true, run: () => navigate(`/chat/${chatId}/tabs`) },
          ]
          }
        />
      )}

      {menu && (
        <MessageMenu
          message={menu.message}
          rect={menu.rect}
          bounds={menuBounds(listRef.current)}
          perms={permsFor(menu.message)}
          mine={menu.message.from === 'me' && kind !== 'channel'}
          onClose={() => setMenu(null)}
          onReply={() => {
            setEditing(null);
            setReplyTo(menu.message);
          }}
          onEdit={() => {
            setReplyTo(null);
            setEditing(menu.message);
          }}
          onPin={() => setMessagePinned(chatId, menu.message.id, !menu.message.pinned)}
          onReact={(emoji) => setMessageReaction(chatId, menu.message.id, emoji)}
          onForward={() => setForwarding([menu.message])}
          onSelect={() => setSelected([menu.message.id])}
          onCopy={() => void copyText(menu.message.text).then((ok) => say(ok ? 'Скопировано' : 'Не удалось скопировать'))}
          onDelete={() => setRemoving([menu.message.id])}
        />
      )}

      {forwarding && (
        <ForwardSheet
          onClose={() => setForwarding(null)}
          onSend={(ids) => {
            forwarding.forEach((m) => {
              const title = m.test ? LIBRARY.find((t) => t.id === m.test)?.title : m.task ? TASK_LIBRARY.find((t) => t.id === m.task)?.title : undefined;
              forwardMessage(ids, m, kind === 'channel' ? chat.name : m.from === 'me' ? 'Вы' : kind === 'group' && m.author ? nameOf(m.author) : chat.name.split(' ')[0], title);
            });
            setForwarding(null);
            setSelected(null);
            say(forwardedTo(ids));
          }}
        />
      )}

      {removing && (
        <RemoveSheet
          title={removeTitle(removing.length)}
          text={removing.length > 1 ? `Будет удалено: ${removing.length}. Это нельзя отменить.` : 'Удаление нельзя отменить.'}
          confirm="Удалить"
          onClose={() => setRemoving(null)}
          onConfirm={removeNow}
        />
      )}

      {leaving && info && (
        <LeaveSheet
          group={info}
          onClose={() => setLeaving(false)}
          onConfirm={() => {
            setLeaving(false);
            // Сначала экран уезжает в список (с учётом записи истории самого окна), и только потом чат исчезает из него: иначе на уходящем экране мелькнуло бы «Чат не найден»
            goBackBy(1);
            window.setTimeout(() => leaveGroup(chatId), 450);
          }}
        />
      )}

      {toast && <Toast text={toast} />}

      {settingsOf &&
        (settingsOf.task ? (
          <SentTaskSheet message={settingsOf} task={TASK_LIBRARY.find((t) => t.id === settingsOf.task)} onClose={() => setSettingsOf(null)} />
        ) : (
          <SentTestSheet message={settingsOf} test={LIBRARY.find((t) => t.id === settingsOf.test)} onClose={() => setSettingsOf(null)} />
        ))}
    </section>
  );
}
