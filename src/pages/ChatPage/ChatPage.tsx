import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Avatar } from '../../components/Avatar/Avatar';
import {
  IconBack,
  IconSearch,
  IconFavorites,
  IconSettings,
} from '../../components/icons';
import { ChatBooking } from '../../components/ChatBooking/ChatBooking';
import { ChatHistory } from '../../components/ChatHistory/ChatHistory';
import { ChatCase } from '../../components/ChatCase/ChatCase';
import { ChatTasks, ChatTests, SelfTests } from '../../components/ChatTests/ChatTests';
import { TabBar, type TabId } from '../../components/TabBar/TabBar';
import { MessageBubble } from '../../components/MessageBubble/MessageBubble';
import { SentTestSheet } from '../../components/MessageBubble/SentTestSheet';
import { MessageInput } from '../../components/MessageInput/MessageInput';
import { SwipePager } from '../../components/SwipePager/SwipePager';
import { IconChevronDown, IconChevronUp, IconCopy, IconReply, IconTrash } from '../../components/ChatParts/ChatIcons';
import { deleteMessage, sendMessage, useChats, useMessages, useTyping } from '../../data/chatStore';
import type { Message } from '../../data/messages';
import { LIBRARY } from '../../data/library';
import { clientResultPath } from '../../data/resultLinks';
import { Chip } from '../../components/Chip/Chip';
import { followChips } from '../../utils/followChips';
import { centerChips } from '../../utils/centerChips';
import { clearWanted, wantedSection, type ChatSection } from '../../data/chatIntent';
import { goBack, navigate } from '../../router';
import { useBackHandler } from '../../utils/backHandler';
import { installBubbleGradient } from '../../utils/bubbleGradient';
import { useExitAnimation } from '../../utils/exitAnimation';
import './ChatPage.css';

// Разделы карточки собеседника; при открытии чата виден «Сообщения»
type SectionId = ChatSection;

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'booking', label: 'Прием' },
  { id: 'messages', label: 'Диалог' },
  { id: 'tests', label: 'Тесты' },
  { id: 'tasks', label: 'Задания' },
  { id: 'notes', label: 'Кейс' },
  { id: 'library', label: 'История' },
];

/** В «Избранном» нет записи на прием и истории взаимодействия: записываться не к кому, взаимодействовать не с кем */
const FAVORITES_HIDDEN: SectionId[] = ['booking', 'library'];
const FAVORITES_SECTIONS = SECTIONS.filter(({ id }) => !FAVORITES_HIDDEN.includes(id));

/** Сообщения одной серии: тот же автор, не карточка и не сообщение с кнопками, разница меньше 5 минут */
function sameRun(a: Message | undefined, b: Message | undefined) {
  if (!a || !b || a.from !== b.from || a.test || b.test || a.buttons || b.buttons) return false;
  const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const d = mins(b.time) - mins(a.time);
  return d >= 0 && d < 5;
}

const MENU_W = 196;
const MENU_ITEM_H = 44;

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
  /** Имя собеседника без фамилии */
  peerName: string;
  hasClientData: boolean;
  onAppTabChange: (id: TabId) => void;
}

/** Страница раздела, кроме переписки: содержимое и снизу панель приложения. Не перерисовывается, пока не изменились эти поля */
const SectionPage = memo(function SectionPage({ id, chatId, favorites, peerName, hasClientData, onAppTabChange }: SectionPageProps) {
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
      {id === 'tasks' && <ChatTasks hasData={hasClientData} />}
      {id === 'notes' && <ChatCase hasData={hasClientData} clientId={chatId} />}
      {id === 'library' && <ChatHistory hasData={hasClientData} />}
      {id === 'booking' && <ChatBooking chatId={chatId} peerName={peerName} />}
      <TabBar active="messages" onChange={onAppTabChange} />
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
  // Из «Ежедневника» чат может открываться сразу на нужном разделе; записка стирается, когда чат открылся
  const [picked, setSection] = useState<SectionId>(() => wantedSection(chatId) ?? 'messages');
  useEffect(() => {
    clearWanted();
  }, []);
  // Тесты, задания и кейс пока есть только у Максима
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
  useEffect(() => {
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

  const index = sections.findIndex((item) => item.id === section);

  // Чипсы разделов идут за страницами: цвет перетекает вслед за пальцем, а не прыгает на готовый выбор,
  // а ряд едет так, чтобы выбранный чипс оставался посередине (видно больше соседей)
  const chipsRef = useRef<HTMLDivElement>(null);
  const showPosition = useCallback((position: number) => {
    const row = chipsRef.current;
    if (!row) return;
    followChips(row.querySelectorAll<HTMLElement>('.chip'), position);
    centerChips(row, position);
  }, []);
  // Чат открыт сразу на нужном разделе: ряд уже стоит на нем
  useEffect(() => {
    if (chipsRef.current) centerChips(chipsRef.current, index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!chat) {
    return (
      <section className="chat">
        <p className="chat__empty">Чат не найден</p>
      </section>
    );
  }

  // Переписка: лента и панель ввода. Меню сообщения стоит вне страниц (ему нужен весь экран, а не сдвинутая страница)
  const messagesPage = (
    <>
      <div className="chat__feed">
        <div className="chat__messages" ref={listRef} onScroll={onFeedScroll}>
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
                    test={m.test ? LIBRARY.find((t) => t.id === m.test) : undefined}
                    onReply={setReplyTo}
                    onMenu={(message, rect) => setMenu({ message, rect })}
                    onQuoteClick={jumpTo}
                    onOpenTest={(id) => navigate(`/chat/${chatId}/tests/${id}`)}
                    onTestSettings={setSettingsOf}
                    onOpenLink={navigate}
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
        reply={replyTo ? { name: replyTo.from === 'me' ? 'Вы' : chat.name.split(' ')[0], text: replyTo.test ? 'Тест' : replyTo.text.replace(/\s*\n\s*/g, ' ') } : undefined}
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
          peerName={chat.name.split(' ')[0]}
          hasClientData={hasClientData}
          onAppTabChange={onAppTabChange}
        />
      ),
  }));

  return (
    <section className="chat">
      <header className="chat__header">
        {searchOpen && section === 'messages' ? (
          <div className="chat__top chat__search">
            <button type="button" className="chat__icon-button" aria-label="Закрыть поиск" onClick={closeSearch}>
              <IconBack />
            </button>
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
            <button
              type="button"
              className="chat__icon-button chat__icon-button--small"
              aria-label="Предыдущее совпадение"
              disabled={!matches.length}
              onClick={() => setActiveIdx((i) => (i - 1 + matches.length) % matches.length)}
            >
              <IconChevronUp />
            </button>
            <button
              type="button"
              className="chat__icon-button chat__icon-button--small"
              aria-label="Следующее совпадение"
              disabled={!matches.length}
              onClick={() => setActiveIdx((i) => (i + 1) % matches.length)}
            >
              <IconChevronDown />
            </button>
          </div>
        ) : (
          <div className="chat__top">
            <button type="button" className="chat__icon-button" aria-label="Назад" onClick={() => goBack()}>
              <IconBack />
            </button>
            <div className="chat__peer">
              {chat.favorites ? (
                <Avatar icon={<IconFavorites />} size={36} />
              ) : (
                <Avatar src={chat.avatar} alt="" size={36} online={chat.online} />
              )}
              <div className="chat__who">
                <h1 className="chat__name">{chat.name}</h1>
                {!chat.favorites && (
                  <p className={`chat__status${typing ? ' chat__status--typing' : ''}`}>
                    {typing ? 'печатает…' : chat.online ? 'в сети' : 'был(а) недавно'}
                  </p>
                )}
              </div>
            </div>
            {section === 'messages' && (
              <button type="button" className="chat__icon-button" aria-label="Поиск по чату" onClick={() => setSearchOpen(true)}>
                <IconSearch />
              </button>
            )}
            <button type="button" className="chat__icon-button" aria-label="Настройки чата">
              <IconSettings />
            </button>
          </div>
        )}

        <div className="chat__chips" role="group" aria-label="Разделы" ref={chipsRef}>
          {sections.map(({ id, label }) => (
            <Chip key={id} follow active={id === section} onClick={() => setSection(id)}>
              {label}
            </Chip>
          ))}
        </div>
      </header>

      <SwipePager index={index} pages={pages} onIndexChange={(i) => setSection(sections[i].id)} onPosition={showPosition} />

      {menu && (
        <MessageMenu
          message={menu.message}
          rect={menu.rect}
          bounds={listRef.current?.getBoundingClientRect()}
          onClose={() => setMenu(null)}
          onReply={() => setReplyTo(menu.message)}
          onDelete={() => {
            if (replyTo?.id === menu.message.id) setReplyTo(null);
            deleteMessage(chatId, menu.message.id);
          }}
        />
      )}

      {settingsOf && <SentTestSheet message={settingsOf} test={LIBRARY.find((t) => t.id === settingsOf.test)} onClose={() => setSettingsOf(null)} />}
    </section>
  );
}
