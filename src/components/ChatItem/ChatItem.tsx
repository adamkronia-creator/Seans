import { useEffect, useRef, type MouseEvent, type PointerEvent, type ReactNode, type RefObject } from 'react';
import type { Chat } from '../../data/chats';
import { Avatar } from '../Avatar/Avatar';
import { Badge } from '../Badge/Badge';
import { IconArchiveMk, IconBookmarkMk, IconChevronMk, IconTicksMk } from './ChatIcons';
import { guardClick, reducedMotion, runSpring, SWIPE_DOMINANCE, SWIPE_SLOP, swipeCommits, VelocityTracker } from '../../utils/swipe';
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

/** Чаты, которые только что ушли свайпом за край: список не показывает их заново при сворачивании места (ChatList) */
export const slidOut = new Set<string>();

/**
 * Свайп влево по строке (касание и перо; мышью есть долгое нажатие): строка едет за пальцем, за ней растёт цветное поле с действием;
 * засчитанный жест (общие пороги из utils/swipe.ts) уводит строку за край и выполняет действие, незасчитанный пружинит назад.
 * Листание папок пейджером на строке влево отдано строке (data-swipe-lock="left"), вправо листает по-прежнему.
 */
function useRowSwipe(li: RefObject<HTMLLIElement>, enabled: boolean, commit: () => void) {
  const act = useRef(commit);
  act.current = commit;
  useEffect(() => {
    const el = li.current;
    if (!el || !enabled) return;
    type G = { id: number; x0: number; y0: number; mode: 'armed' | 'drag' | 'ignore'; x: number; tracker: VelocityTracker; release?: () => void };
    let g: G | null = null;
    let stop: (() => void) | null = null;
    const paint = (x: number) => el.style.setProperty('--row-x', `${x}px`);
    const rest = () => {
      el.style.removeProperty('--row-x');
      el.removeAttribute('data-swiping');
    };

    const down = (e: globalThis.PointerEvent) => {
      if (e.pointerType === 'mouse' || !e.isPrimary || stop) return;
      g = { id: e.pointerId, x0: e.clientX, y0: e.clientY, mode: 'armed', x: 0, tracker: new VelocityTracker() };
    };
    const move = (e: globalThis.PointerEvent) => {
      if (!g || e.pointerId !== g.id || g.mode === 'ignore') return;
      const dx = e.clientX - g.x0;
      const dy = e.clientY - g.y0;
      if (g.mode === 'armed') {
        if (Math.abs(dx) <= SWIPE_SLOP && Math.abs(dy) <= SWIPE_SLOP) return;
        if (dx < 0 && Math.abs(dx) >= Math.abs(dy) * SWIPE_DOMINANCE) {
          g.mode = 'drag';
          g.release = guardClick();
          el.setAttribute('data-swiping', '');
          try {
            el.setPointerCapture(e.pointerId);
          } catch {
            // касание уже ушло
          }
        } else {
          g.mode = 'ignore';
          return;
        }
      }
      g.tracker.push(e.timeStamp, e.clientX);
      g.x = Math.max(-el.clientWidth, Math.min(0, dx));
      paint(g.x);
    };
    const end = (e: globalThis.PointerEvent) => {
      const d = g;
      g = null;
      if (!d || e.pointerId !== d.id || d.mode !== 'drag') return;
      d.release?.();
      const cancelled = e.type === 'pointercancel';
      const v = cancelled ? 0 : d.tracker.velocity(e.timeStamp);
      const yes = !cancelled && swipeCommits(-d.x, -v);
      const finish = () => {
        stop = null;
        if (yes) act.current();
        else rest();
      };
      if (reducedMotion()) {
        finish();
        return;
      }
      stop = runSpring({ from: d.x, to: yes ? -el.clientWidth : 0, velocity: v * 1000, rest: 0.4, onFrame: paint, onDone: finish });
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', end);
      el.removeEventListener('pointercancel', end);
      stop?.();
    };
  }, [li, enabled]);
}

interface ChatItemProps {
  chat: Chat;
  onClick?: (chat: Chat) => void;
  /** Долгое нажатие на строку: меню действий (в архив и обратно) */
  onLongPress?: (chat: Chat, row: HTMLElement) => void;
  /** Свайп влево по строке: действие с чатом и то, что написано на цветном поле за строкой */
  swipeAction?: { label: string; icon: ReactNode; run: (chat: Chat) => void };
}

/**
 * Строка списка чатов (ChatListItem системы мессенджера, раскладка как в Telegram): аватар с присутствием, имя и время,
 * превью и справа счётчик непрочитанных или значок закрепа. Размер аватара, поля и высота строки заданы токенами сетки 4 в ChatItem.css.
 */
export function ChatItem({ chat, onClick, onLongPress, swipeAction }: ChatItemProps) {
  const li = useRef<HTMLLIElement>(null);
  useRowSwipe(li, Boolean(swipeAction) && chat.favorites !== true, () => {
    slidOut.add(chat.id);
    swipeAction?.run(chat);
  });
  const pinned = chat.favorites === true;
  const cls = ['chat-item', chat.unread > 0 && 'chat-item--unread', pinned && 'chat-item--pinned'].filter(Boolean).join(' ');
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
    <li ref={li} className={cls} data-chat={chat.id} {...(swipeAction ? { 'data-swipe': '', 'data-swipe-lock': 'left' } : {})}>
      {swipeAction && (
        <span className="chat-item__swipe" aria-hidden="true">
          {swipeAction.icon}
          <span>{swipeAction.label}</span>
        </span>
      )}
      <button type="button" className="chat-item__button" onClick={(e) => !swallow(e) && onClick?.(chat)} {...handlers}>
        <Avatar src={chat.avatar} alt="" presence={chat.online ? 'online' : undefined} />

        <span className="chat-item__body">
          <span className="chat-item__row chat-item__row--top">
            <span className="chat-item__name">{chat.name}</span>
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
