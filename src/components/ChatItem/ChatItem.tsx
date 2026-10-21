import { useRef, type MouseEvent, type PointerEvent } from 'react';
import type { Chat } from '../../data/chats';
import { Avatar } from '../Avatar/Avatar';
import { Badge } from '../Badge/Badge';
import { IconArchiveMk, IconBookmarkMk, IconChevronMk, IconTicksMk } from './ChatIcons';
import './ChatItem.css';

/** Сколько держать палец, чтобы это было долгое нажатие: как у чипсов и сообщений */
const LONG_PRESS_MS = 450;
/** Сдвиг пальца, после которого это уже прокрутка, а не долгое нажатие */
const SLOP = 10;
/** Столько после долгого нажатия системное меню браузера считается эхом того же касания */
const ECHO_MS = 1000;

/** Долгое нажатие, правая кнопка мыши и клавиша «меню» на кнопке: меню действий в стиле Telegram */
function useLongPress(onLong: ((el: HTMLElement) => void) | undefined) {
  const press = useRef<{ x: number; y: number; timer: number } | null>(null);
  const opened = useRef(false);
  const echoUntil = useRef(0);
  const stop = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };
  if (!onLong) return { handlers: {}, swallow: () => false };
  const handlers = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      opened.current = false;
      if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
      stop();
      const el = e.currentTarget;
      const start = { x: e.clientX, y: e.clientY, timer: 0 };
      start.timer = window.setTimeout(() => {
        if (press.current !== start) return;
        press.current = null;
        opened.current = true;
        echoUntil.current = Date.now() + ECHO_MS;
        onLong(el);
      }, LONG_PRESS_MS);
      press.current = start;
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const s = press.current;
      if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > SLOP) stop();
    },
    onPointerUp: stop,
    onPointerCancel: stop,
    onPointerLeave: stop,
    onContextMenu: (e: MouseEvent<HTMLElement>) => {
      e.preventDefault();
      if (Date.now() < echoUntil.current) return;
      stop();
      opened.current = true;
      onLong(e.currentTarget);
    },
  };
  /** Клик, которым закончилось долгое нажатие, строку не открывает */
  const swallow = (e: MouseEvent) => {
    if (opened.current && e.detail > 0) {
      opened.current = false;
      return true;
    }
    opened.current = false;
    return false;
  };
  return { handlers, swallow };
}

interface ChatItemProps {
  chat: Chat;
  onClick?: (chat: Chat) => void;
  /** Долгое нажатие на строку: меню действий (в архив и обратно) */
  onLongPress?: (chat: Chat, row: HTMLElement) => void;
  /** Идёт выбор чатов: строка выбрана (галочка на аватаре и заливка) */
  selected?: boolean;
}

/**
 * Строка списка чатов (ChatListItem системы мессенджера, раскладка как в Telegram): аватар с присутствием, имя и время,
 * превью и справа счётчик непрочитанных или значок закрепа. Размер аватара, поля и высота строки заданы токенами сетки 4 в ChatItem.css.
 */
export function ChatItem({ chat, onClick, onLongPress, selected = false }: ChatItemProps) {
  const pinned = chat.favorites === true;
  const cls = ['chat-item', chat.unread > 0 && 'chat-item--unread', pinned && 'chat-item--pinned', selected && 'chat-item--selected'].filter(Boolean).join(' ');
  const { handlers, swallow } = useLongPress(onLongPress ? (el) => onLongPress(chat, el) : undefined);
  // «Избранное» — компактная строка с шевроном, как в макете: без времени и счётчика
  if (pinned) {
    return (
      <li className={`${cls} chat-item--compact`}>
        <button type="button" className="chat-item__button" onClick={() => onClick?.(chat)}>
          <span className="visually-hidden">Закреплённый чат. </span>
          <Avatar icon={<IconBookmarkMk />} />
          <span className="chat-item__body">
            <span className="chat-item__row chat-item__row--top">
              <span className="chat-item__name">{chat.name}</span>
            </span>
            <span className="chat-item__row chat-item__row--bottom">
              <span className="chat-item__preview">{chat.lastMessage}</span>
            </span>
          </span>
          <IconChevronMk className="chat-item__chevron" />
        </button>
      </li>
    );
  }
  return (
    <li className={cls} data-chat={chat.id}>
      <button type="button" className="chat-item__button" onClick={(e) => !swallow(e) && onClick?.(chat)} {...handlers}>
        <Avatar src={chat.avatar} alt="" presence={chat.online ? 'online' : undefined} />
        <span className="chat-item__check" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>

        <span className="chat-item__body">
          <span className="chat-item__row chat-item__row--top">
            <span className="chat-item__title">
              <span className="chat-item__name">{chat.name}</span>
              {chat.muted && (
                <svg className="chat-item__mark" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Уведомления выключены">
                  <path d="M18 9a6 6 0 0 0-9.4-4.9M6.2 6.7A6.2 6.2 0 0 0 6 9c0 6.5-2.5 8.5-2.5 8.5h13M18 12.5c.1 2.8.9 4 1.5 5M10.2 20.5a2 2 0 0 0 3.6 0M3 3l18 18" />
                </svg>
              )}
              {chat.blocked && (
                <svg className="chat-item__mark" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Заблокирован">
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M6 6l12 12" />
                </svg>
              )}
              {chat.pinned && (
                <svg className="chat-item__mark" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Закреплён">
                  <path d="M9 3.5h6l-1 6 3 3.5H7l3-3.5-1-6zM12 13v7.5" />
                </svg>
              )}
            </span>
            <span className="chat-item__time">{chat.time}</span>
          </span>
          <span className="chat-item__row chat-item__row--bottom">
            <span className="chat-item__line">
              {chat.outgoing && (
                <span className={`chat-item__ticks chat-item__ticks--${chat.outgoing}`} role="img" aria-label={chat.outgoing === 'read' ? 'Прочитано' : 'Отправлено'}>
                  <IconTicksMk />
                </span>
              )}
              <span className="chat-item__preview">{chat.lastMessage}</span>
            </span>
            <Badge count={chat.unread} ariaLabel={`Непрочитанных: ${chat.unread}`} />
          </span>
        </span>
      </button>
    </li>
  );
}

interface ArchiveRowProps {
  /** Чаты в архиве: из них строится превью и число непрочитанных */
  chats: Chat[];
  onClick: () => void;
}

/**
 * Строка «Архивы» в начале списка, как в макете: круг с градиентом и коробкой, в превью имена чатов из архива, справа время
 * последнего и число непрочитанных сообщений. Список при открытии сдвинут так, что строки не видно: она выезжает при протяжке вниз.
 */
export function ArchiveRow({ chats, onClick }: ArchiveRowProps) {
  const unread = chats.reduce((sum, c) => sum + c.unread, 0);
  return (
    <li className="chat-item chat-item--compact chat-item--archive">
      <button type="button" className="chat-item__button" onClick={onClick}>
        <Avatar icon={<IconArchiveMk />} />
        <span className="chat-item__body">
          <span className="chat-item__row chat-item__row--top">
            <span className="chat-item__name">Архивы</span>
            <span className="chat-item__time">{chats[0]?.time}</span>
          </span>
          <span className="chat-item__row chat-item__row--bottom">
            <span className="chat-item__preview">{chats.map((c) => c.name.split(' ')[0]).join(', ')}</span>
            <Badge count={unread} ariaLabel={`Непрочитанных в архиве: ${unread}`} />
          </span>
        </span>
      </button>
    </li>
  );
}
