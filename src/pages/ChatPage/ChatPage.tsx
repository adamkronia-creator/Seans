import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Avatar } from '../../components/Avatar/Avatar';
import { IconBackMk, IconBookmarkMk, IconMenuMk, IconSearchMk } from '../../components/ChatItem/ChatIcons';
import {
  IconSearch,
  IconTabInfo,
  IconTabLibrary,
  IconTabMessages,
  IconTabNotes,
  IconTabPractices,
  IconTabTests,
} from '../../components/icons';
import { ChatHistory } from '../../components/ChatHistory/ChatHistory';
import { ChatSideMenu } from '../../components/ChatSideMenu/ChatSideMenu';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { ChatInfo, ChatNotes } from '../../components/ChatCase/ChatCase';
import { ChatTasks, ChatTests, SelfTasks, SelfTests } from '../../components/ChatTests/ChatTests';
import { TabBar, type TabId } from '../../components/TabBar/TabBar';
import { MessageBubble } from '../../components/MessageBubble/MessageBubble';
import { SentTaskSheet } from '../../components/MessageBubble/SentTaskSheet';
import { SentTestSheet } from '../../components/MessageBubble/SentTestSheet';
import { MessageInput } from '../../components/MessageInput/MessageInput';
import { SwipePager } from '../../components/SwipePager/SwipePager';
import { IconChevronDown, IconChevronUp, IconCopy, IconReply, IconTrash } from '../../components/ChatParts/ChatIcons';
import { deleteMessage, sendMessage, useChats, useMessages, useTyping } from '../../data/chatStore';
import { addNote, addSection, CLIENT_CHAT, countOf, useClientData } from '../../data/clientStore';
import { useTaskResults } from '../../data/selfTask';
import { useSelfResults } from '../../data/selfTest';
import type { Message } from '../../data/messages';
import { LIBRARY, TASK_LIBRARY } from '../../data/library';
import { findClientTaskResult } from '../../data/clientTaskResults';
import { clientResultId, clientResultPath } from '../../data/resultLinks';
import { hasTaskSettings } from '../../data/taskValues';
import { goBack, navigate } from '../../router';
import { useBackHandler } from '../../utils/backHandler';
import { useSwipeBack } from '../../utils/swipeBack';
import { installBubbleGradient } from '../../utils/bubbleGradient';
import { useExitAnimation } from '../../utils/exitAnimation';
import './ChatPage.css';

// Разделы карточки собеседника; при открытии чата виден «Диалог»
type SectionId = 'messages' | 'tests' | 'tasks' | 'notes' | 'info' | 'library';

const SECTIONS: { id: SectionId; label: string; icon: ReactNode }[] = [
  { id: 'messages', label: 'Диалог', icon: <IconTabMessages /> },
  { id: 'tests', label: 'Тесты', icon: <IconTabTests /> },
  { id: 'tasks', label: 'Задания', icon: <IconTabPractices /> },
  { id: 'notes', label: 'Заметки', icon: <IconTabNotes /> },
  { id: 'info', label: 'Сведения', icon: <IconTabInfo /> },
  { id: 'library', label: 'История', icon: <IconTabLibrary /> },
];

/** В «Избранном» нет истории взаимодействия: взаимодействовать не с кем */
const FAVORITES_HIDDEN: SectionId[] = ['library'];
const FAVORITES_SECTIONS = SECTIONS.filter(({ id }) => !FAVORITES_HIDDEN.includes(id));

/** Сообщения одной серии: тот же автор, не карточка и не сообщение с кнопками, разница меньше 5 минут */
function sameRun(a: Message | undefined, b: Message | undefined) {
  if (!a || !b || a.from !== b.from || a.test || b.test || a.task || b.task || a.buttons || b.buttons) return false;
  const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const d = mins(b.time) - mins(a.time);
  return d >= 0 && d < 5;
}

/** Подпись под именем: вид диалога (в сети показывает зелёная точка у фото) */
const KIND: Record<string, string> = { clients: 'Клиент', colleagues: 'Коллега', seminars: 'Семинар' };

const MENU_W = 196;
const MENU_ITEM_H = 44;

/** Где можно ставить меню сообщения: вся лента, кроме полосы под шапкой (лента лежит под ней, и меню не должно закрывать название и кнопки) */
function menuBounds(list: HTMLElement | null) {
  if (!list) return undefined;
  const rect = list.getBoundingClientRect();
  const inset = parseFloat(getComputedStyle(list).paddingTop) || 0;
  return new DOMRect(rect.left, rect.top + inset, rect.width, rect.height - inset);
}

/** Меню сообщения по долгому нажатию: ответить, копировать, удалить */
function MessageMenu({
  message,
  rect,
  bounds,
  onClose,
  onReply,
  onDelete,
}: {
  message: Message;
  rect: DOMRect;
  bounds?: DOMRect;
  onClose: () => void;
  onReply: () => void;
  onDelete: () => void;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  useExitAnimation(backdropRef);
  const items = [
    { label: 'Ответить', Icon: IconReply, run: onReply },
    ...(message.text ? [{ label: 'Копировать', Icon: IconCopy, run: () => void navigator.clipboard?.writeText(message.text).catch(() => undefined) }] : []),
    { label: 'Удалить', Icon: IconTrash, run: onDelete, danger: true },
  ];
  const h = items.length * MENU_ITEM_H + 8;
  const minLeft = (bounds?.left ?? 0) + 8;
  const maxLeft = (bounds?.right ?? window.innerWidth) - MENU_W - 8;
  const left = Math.max(minLeft, Math.min(message.from === 'me' ? rect.right - MENU_W : rect.left, maxLeft));
  const topLimit = bounds?.top ?? 0;
  const above = rect.top - h - 8 >= topLimit;
  const top = above ? rect.top - h - 8 : Math.min(rect.bottom + 8, window.innerHeight - h - 8);
  // Меню вырастает от пузыря: над ним — от нижнего края, под ним — от верхнего; сторону задаёт автор сообщения
  const origin = `${above ? 'bottom' : 'top'} ${message.from === 'me' ? 'right' : 'left'}`;
  return (
    <div ref={backdropRef} className="msg-menu__backdrop" data-no-swipe onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }}>
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
  const sections = chat?.favorites ? FAVORITES_SECTIONS : SECTIONS;
  // Выбранного раздела может не быть в списке (чат сменился на «Избранное»): тогда открыта переписка
  const section: SectionId = sections.some(({ id }) => id === picked) ? picked : 'messages';
  const groups = useMessages(chatId);
  const typing = useTyping(chatId);
  const listRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const prevCount = useRef(0);
  const [distance, setDistance] = useState(0);
  const [unseen, setUnseen] = useState(0);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [menu, setMenu] = useState<{ message: Message; rect: DOMRect } | null>(null);
  // Карточка отправленного теста, чьи настройки показаны в окне
  const [settingsOf, setSettingsOf] = useState<Message | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
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

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery('');
  };
  // Жест «назад» при открытом поиске закрывает его, как кнопка в строке поиска
  useBackHandler(searchOpen && section === 'messages', closeSearch);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  // Жест «назад» при открытой боковой панели закрывает её
  useBackHandler(menuOpen, closeMenu);
  // Чат сменился или закрылся: панель не остаётся открытой
  useEffect(() => setMenuOpen(false), [chatId]);

  const index = sections.findIndex((item) => item.id === section);

  // Свайп вправо в диалоге (первая страница, листать влево нечего) возвращает в список чатов, как стрелка в шапке
  useSwipeBack('.chat', index === 0 && !menuOpen && !searchOpen, () => goBack());

  // Сколько записей в разделах: подпись в боковой панели. «Избранное» считает то, что психолог прошёл сам
  const clientData = useClientData();
  const selfTests = useSelfResults();
  const selfTasks = useTaskResults();
  const counts = useMemo<Partial<Record<SectionId, number>>>(() => {
    if (chat?.favorites) return { tests: selfTests.length, tasks: selfTasks.length };
    if (!hasClientData) return {};
    const mine = (chatOf?: string) => (chatOf ?? CLIENT_CHAT) === chatId;
    return {
      // Те же числа, что на чипсах «Истории»: считаются тесты и задания, а не карточки (у постоянного задания их несколько: запись = карточка)
      tests: countOf(clientData, 'test'),
      tasks: countOf(clientData, 'task'),
      notes: clientData.notes.filter((n) => mine(n.chatId)).length,
      info: clientData.caseSections.filter((x) => mine(x.chatId)).length,
    };
  }, [chat?.favorites, hasClientData, clientData, selfTests, selfTasks, chatId]);

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
                    showMeta={!sameRun(m, next)}
                    joinPrev={sameRun(prev, m)}
                    query={q}
                    activeMatch={m.id === activeId}
                    test={m.test ? LIBRARY.find((t) => t.id === m.test) : m.task ? TASK_LIBRARY.find((t) => t.id === m.task) : undefined}
                    onReply={setReplyTo}
                    onMenu={(message, rect) => setMenu({ message, rect })}
                    onQuoteClick={jumpTo}
                    onOpenTest={(id) => navigate(`/chat/${chatId}/tests/${id}`)}
                    onOpenTask={(id) => navigate(`/chat/${chatId}/tasks/${id}`)}
                    onTestSettings={setSettingsOf}
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

        {(distance > 240 || unseen > 0) && (
          <button type="button" className="chat__down" aria-label="К последним сообщениям" onClick={() => scrollToBottom(true)}>
            <IconChevronDown />
            {unseen > 0 && <span className="chat__down-badge">{unseen}</span>}
          </button>
        )}
      </div>

      <MessageInput
        onSend={(text) => {
          sendMessage(chatId, text, replyTo?.id);
          setReplyTo(null);
        }}
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
  const status = chat.favorites ? 'Только для вас' : typing ? 'печатает…' : (KIND[chat.category ?? ''] ?? 'Диалог');
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
    <section className="chat">
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
            {avatar}
            <div className="chat__who">
              <h1 className="chat__name">{chat.name}</h1>
              <p className={`chat__status${section === 'messages' && typing ? ' chat__status--typing' : ''}`}>{subtitle}</p>
            </div>
            <button type="button" className="chat__action" aria-label="Назад" onClick={() => goBack()}>
              <IconBackMk />
            </button>
            <button
              type="button"
              className="chat__action"
              aria-label="Меню чата"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <IconMenuMk />
            </button>
          </div>
        )}
      </header>

      <SwipePager index={index} pages={pages} onIndexChange={(i) => setSection(sections[i].id)} />

      <ChatSideMenu
        open={menuOpen}
        onClose={closeMenu}
        avatar={avatar}
        name={chat.name}
        status={status}
        items={sections.map(({ id, label, icon }) => ({ id, label, icon, count: counts[id] }))}
        active={section}
        onSelect={(id) => {
          setSection(id as SectionId);
          setMenuOpen(false);
        }}
        onSwitch={(id) => setSection(id as SectionId)}
        onSearch={openSearch}
      />

      {menu && (
        <MessageMenu
          message={menu.message}
          rect={menu.rect}
          bounds={menuBounds(listRef.current)}
          onClose={() => setMenu(null)}
          onReply={() => setReplyTo(menu.message)}
          onDelete={() => {
            if (replyTo?.id === menu.message.id) setReplyTo(null);
            deleteMessage(chatId, menu.message.id);
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
