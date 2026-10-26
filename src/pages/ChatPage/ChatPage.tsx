import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Avatar } from '../../components/Avatar/Avatar';
import { IconBackMk, IconBookmarkMk, IconMenuMk, IconSearchMk } from '../../components/ChatItem/ChatIcons';
import { IconSearch, IconTabMessages } from '../../components/icons';
import { ChatHistory } from '../../components/ChatHistory/ChatHistory';
import { ChipMenu } from '../../components/FolderMenu/ChipMenu';
import { useChatTabs, type SectionId } from '../../data/chatTabs';
import { SECTION_GROUP, SECTION_ICON, SECTION_LABEL } from './chatSections';
import { IconGearMk, IconSearchMk as IconSearchMenu } from '../../components/ChatItem/ChatIcons';
import { Collapse } from '../../components/Collapse/Collapse';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { ChatInfo, ChatNotes } from '../../components/ChatCase/ChatCase';
import { ChatTasks, ChatTests, SelfTasks, SelfTests } from '../../components/ChatTests/ChatTests';
import { TabBar, type TabId } from '../../components/TabBar/TabBar';
import { MessageBubble } from '../../components/MessageBubble/MessageBubble';
import { SentTaskSheet } from '../../components/MessageBubble/SentTaskSheet';
import { SentTestSheet } from '../../components/MessageBubble/SentTestSheet';
import { MessageInput } from '../../components/MessageInput/MessageInput';
import { SwipePager } from '../../components/SwipePager/SwipePager';
import { IconChevronDown, IconChevronUp, IconCopy, IconForward, IconReply, IconTrash } from '../../components/ChatParts/ChatIcons';
import { deleteMessage, forwardMessage, sendMessage, setMessagePinned, setMessageReaction, useChats, useMessages, useTyping } from '../../data/chatStore';
import { roleOf } from '../../data/roles';
import { ForwardSheet } from '../../components/ForwardSheet/ForwardSheet';
import { EMOJI_GROUPS } from '../../data/emojiSet';
import { addNote, addSection } from '../../data/clientStore';
import type { Message } from '../../data/messages';
import { LIBRARY, TASK_LIBRARY } from '../../data/library';
import { findClientTaskResult } from '../../data/clientTaskResults';
import { clientResultId, clientResultPath } from '../../data/resultLinks';
import { hasTaskSettings } from '../../data/taskValues';
import { goBack, guardBack, navigate } from '../../router';
import { IconPinned } from '../../components/FolderMenu/FolderIcons';
import { useBackHandler } from '../../utils/backHandler';
import { useSwipeBack } from '../../utils/swipeBack';
import { installBubbleGradient } from '../../utils/bubbleGradient';
import { useExitAnimation } from '../../utils/exitAnimation';
import './ChatPage.css';

// Разделы карточки собеседника; при открытии чата виден «Диалог». Порядок и видимость вкладок настраивает пользователь (data/chatTabs.ts)

/** В «Избранном» нет истории взаимодействия: взаимодействовать не с кем */
const FAVORITES_HIDDEN: SectionId[] = ['library'];

/** Сообщения одной серии: тот же автор, не карточка и не сообщение с кнопками, разница меньше 5 минут */
function sameRun(a: Message | undefined, b: Message | undefined) {
  if (!a || !b || a.from !== b.from || a.test || b.test || a.task || b.task || a.buttons || b.buttons) return false;
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

/** Меню сообщения по долгому нажатию: ответить, копировать, удалить */
function MessageMenu({
  message,
  rect,
  bounds,
  onClose,
  onReply,
  onPin,
  onDelete,
  onReact,
  onForward,
}: {
  message: Message;
  rect: DOMRect;
  bounds?: DOMRect;
  onClose: () => void;
  onReply: () => void;
  onPin: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  onForward: () => void;
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
  const items = [
    { label: 'Ответить', Icon: IconReply, run: onReply },
    { label: message.pinned ? 'Открепить' : 'Закрепить', Icon: IconPinned, run: onPin },
    { label: 'Переслать', Icon: IconForward, run: onForward },
    ...(message.text ? [{ label: 'Копировать', Icon: IconCopy, run: () => void navigator.clipboard?.writeText(message.text).catch(() => undefined) }] : []),
    { label: 'Удалить', Icon: IconTrash, run: onDelete, danger: true },
  ];
  const h = items.length * MENU_ITEM_H + 8;
  const minLeft = (bounds?.left ?? 0) + MENU_EDGE;
  const right = (bounds?.right ?? window.innerWidth) - MENU_EDGE;
  const maxLeft = right - MENU_W;
  const left = Math.max(minLeft, Math.min(message.from === 'me' ? rect.right - MENU_W : rect.left, maxLeft));
  const barW = Math.min(REACT_BAR_W, right - minLeft);
  const barLeft = Math.max(minLeft, Math.min(message.from === 'me' ? rect.right - barW : rect.left, right - barW));
  // Сверху вниз: панель реакций, под ней меню; весь столбик над сообщением или, если там тесно, под ним
  const stack = REACT_BAR_H + 8 + h;
  const topLimit = bounds?.top ?? 0;
  const above = rect.top - stack - 8 >= topLimit;
  const stackTop = above ? rect.top - stack - 8 : Math.min(rect.bottom + 8, window.innerHeight - stack - 8);
  const barTop = stackTop;
  const top = stackTop + REACT_BAR_H + 8;
  // Меню вырастает от пузыря: над ним — от нижнего края, под ним — от верхнего; сторону задаёт автор сообщения
  const origin = `${above ? 'bottom' : 'top'} ${message.from === 'me' ? 'right' : 'left'}`;
  const pick = (emoji: string) => {
    onReact(emoji);
    onClose();
  };
  return (
    <div ref={backdropRef} className="msg-menu__backdrop" data-no-swipe style={armed ? undefined : { pointerEvents: 'none' }} onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }}>
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
            {QUICK_REACTIONS.map((emoji) => (
              <button key={emoji} type="button" className={`msg-react__emoji${message.reaction === emoji ? ' msg-react__emoji--on' : ''}`} aria-label={`Реакция ${emoji}`} onClick={() => pick(emoji)}>
                {emoji}
              </button>
            ))}
            <button type="button" className="msg-react__more" aria-label="Все реакции" onClick={() => setMore(true)}>
              <IconChevronDown />
            </button>
          </div>
        )}
      </div>
      {!more && (
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
}

/**
 * Страница раздела, кроме переписки: содержимое и снизу панель. У «Заметок» и «Сведений» это поле ввода, как в переписке:
 * зашёл во вкладку и сразу пишешь; у остальных — панель приложения. Не перерисовывается, пока не изменились эти поля
 */
const SectionPage = memo(function SectionPage({ id, chatId, favorites, hasClientData, active, onAppTabChange }: SectionPageProps) {
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
          <ChatNotes chatId={chatId} />
          <MessageInput placeholder="Напишите заметку" extras={false} active={active} onSend={(text) => void addNote(chatId, text)} />
        </>
      )}
      {id === 'info' && (
        <>
          <ChatInfo chatId={chatId} />
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
  const chat = useChats().find((c) => c.id === chatId);
  const tabs = useChatTabs();
  // Вкладки в порядке пользователя, без скрытых им; в «Избранном» ещё и без истории
  const sections = useMemo(
    () => tabs.order.filter((id) => !tabs.hidden.includes(id) && !(chat?.favorites && FAVORITES_HIDDEN.includes(id))).map((id) => ({ id, label: SECTION_LABEL[id] })),
    [tabs, chat?.favorites],
  );
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
  const [menu, setMenu] = useState<{ message: Message; rect: DOMRect } | null>(null);
  // Карточка отправленного теста, чьи настройки показаны в окне
  const [settingsOf, setSettingsOf] = useState<Message | null>(null);
  const [forwarding, setForwarding] = useState<Message | null>(null);
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

  const index = sections.findIndex((item) => item.id === section);

  // Свайп вправо в диалоге (первая страница, листать влево нечего) возвращает в список чатов, как стрелка в шапке
  useSwipeBack('.chat', index === 0 && !menuOpen && !searchOpen, () => goBack());

  if (!chat) {
    return (
      <section className="chat">
        <EmptyState icon={<IconSearch />} title="Чат не найден" text="Возможно, его удалили." />
      </section>
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
              text={chat.favorites ? 'Здесь будут тесты и задания, которые вы отправляете себе.' : 'Напишите первое сообщение — оно появится здесь.'}
            />
          )}
          {groups.map((group) => (
            <ul className="chat__group" key={group.label}>
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
                    showMeta={!sameRun(m, next) || Boolean(m.pinned)}
                    joinPrev={sameRun(prev, m)}
                    query={q}
                    activeMatch={m.id === activeId}
                    test={m.test ? LIBRARY.find((t) => t.id === m.test) : m.task ? TASK_LIBRARY.find((t) => t.id === m.task) : undefined}
                    onReply={setReplyTo}
                    onMenu={(message, rect) => setMenu({ message, rect })}
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
        onSend={(text) => {
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
        reply={replyTo ? { name: replyTo.from === 'me' ? 'Вы' : chat.name.split(' ')[0], text: replyTo.test ? 'Тест' : replyTo.task ? 'Задание' : replyTo.text.replace(/\s*\n\s*/g, ' ') } : undefined}
        onCancelReply={() => setReplyTo(null)}
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
        />
      ),
  }));

  // Подпись под именем: в диалоге — состояние собеседника, в остальных вкладках — название вкладки (чипсов разделов в шапке больше нет)
  const status = chat.favorites ? 'Только для вас' : typing ? 'печатает…' : roleOf(chat);
  const subtitle = section === 'messages' ? status : (sections.find((item) => item.id === section)?.label ?? '');
  const avatar = chat.favorites ? <Avatar icon={<IconBookmarkMk />} /> : <Avatar src={chat.avatar} alt="" presence={chat.online ? 'online' : undefined} />;

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
        {searchOpen && section === 'messages' ? (
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
              <button type="button" className="chat__peer" aria-label={`Профиль: ${chat.name}`} onClick={() => navigate(`/chat/${chatId}/contact`)}>
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
              <button type="button" className="chat__pin-off" aria-label="Открепить" onClick={() => setMessagePinned(chatId, pins[pinNow].id, false)}>
                <IconPinned />
              </button>
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
          items={[
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
          ]}
        />
      )}

      {menu && (
        <MessageMenu
          message={menu.message}
          rect={menu.rect}
          bounds={menuBounds(listRef.current)}
          onClose={() => setMenu(null)}
          onReply={() => setReplyTo(menu.message)}
          onPin={() => setMessagePinned(chatId, menu.message.id, !menu.message.pinned)}
          onReact={(emoji) => setMessageReaction(chatId, menu.message.id, emoji)}
          onForward={() => setForwarding(menu.message)}
          onDelete={() => {
            if (replyTo?.id === menu.message.id) setReplyTo(null);
            deleteMessage(chatId, menu.message.id);
          }}
        />
      )}

      {forwarding && (
        <ForwardSheet
          onClose={() => setForwarding(null)}
          onSend={(ids) => {
            const title = forwarding.test ? LIBRARY.find((t) => t.id === forwarding.test)?.title : forwarding.task ? TASK_LIBRARY.find((t) => t.id === forwarding.task)?.title : undefined;
            forwardMessage(ids, forwarding, forwarding.from === 'me' ? 'Вы' : chat.name.split(' ')[0], title);
            setForwarding(null);
          }}
        />
      )}

      {settingsOf &&
        (settingsOf.task ? (
          <SentTaskSheet message={settingsOf} task={TASK_LIBRARY.find((t) => t.id === settingsOf.task)} onClose={() => setSettingsOf(null)} />
        ) : (
          <SentTestSheet message={settingsOf} test={LIBRARY.find((t) => t.id === settingsOf.test)} onClose={() => setSettingsOf(null)} />
        ))}
    </section>
  );
}
