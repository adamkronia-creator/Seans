import { useRef, useState, type PointerEvent } from 'react';
import type { Message } from '../../data/messages';
import type { LibraryTest } from '../../data/library';
import { IconReadTicks } from '../icons';
import { IconClock, IconReply, IconTickSingle } from '../ChatParts/ChatIcons';
import './MessageBubble.css';

function Status({ message }: { message: Message }) {
  const s = message.status ?? 'read';
  if (s === 'sending') return <IconClock className="bubble__ticks bubble__ticks--clock" />;
  if (s === 'sent') return <IconTickSingle className="bubble__ticks bubble__ticks--single" />;
  return <IconReadTicks className="bubble__ticks" aria-hidden="true" />;
}

function Meta({ message }: { message: Message }) {
  return (
    <>
      <span className="bubble__time">{message.time}</span>
      {message.from === 'me' && <Status message={message} />}
    </>
  );
}

/** Текст с подсвеченным поисковым запросом */
function Highlighted({ text, query, active }: { text: string; query: string; active: boolean }) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let from = 0;
  let at = lower.indexOf(q);
  while (at !== -1) {
    if (at > from) parts.push(text.slice(from, at));
    parts.push(
      <mark key={at} className={`bubble__mark${active ? ' bubble__mark--active' : ''}`}>
        {text.slice(at, at + q.length)}
      </mark>,
    );
    from = at + q.length;
    at = lower.indexOf(q, from);
  }
  parts.push(text.slice(from));
  return <>{parts}</>;
}

const SWIPE_TRIGGER = 56;
const LONG_PRESS_MS = 450;

interface MessageBubbleProps {
  message: Message;
  /** Сообщение, на которое это — ответ (undefined, если удалено) */
  replyTarget?: Message;
  peerName: string;
  /** Время и статус показываются только у последнего сообщения серии */
  showMeta: boolean;
  joinPrev: boolean;
  query?: string;
  activeMatch?: boolean;
  test?: LibraryTest;
  onReply: (m: Message) => void;
  onMenu: (m: Message, rect: DOMRect) => void;
  onQuoteClick: (id: string) => void;
  onOpenTest: (id: string) => void;
  /** Нажатие на кнопку под сообщением: переход по адресу кнопки */
  onOpenLink: (href: string) => void;
}

export function MessageBubble({
  message,
  replyTarget,
  peerName,
  showMeta,
  joinPrev,
  query = '',
  activeMatch = false,
  test,
  onReply,
  onMenu,
  onQuoteClick,
  onOpenTest,
  onOpenLink,
}: MessageBubbleProps) {
  const ref = useRef<HTMLLIElement>(null);
  const [dx, setDx] = useState(0);
  const gesture = useRef<{ x: number; y: number; mode: 'idle' | 'swipe' | 'cancel'; timer?: number } | null>(null);
  const out = message.from === 'me';

  const clearTimer = () => {
    if (gesture.current?.timer) window.clearTimeout(gesture.current.timer);
  };

  const onPointerDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const g: { x: number; y: number; mode: 'idle' | 'swipe' | 'cancel'; timer?: number } = { x: e.clientX, y: e.clientY, mode: 'idle', timer: 0 };
    g.timer = window.setTimeout(() => {
      if (gesture.current === g && g.mode === 'idle') {
        g.mode = 'cancel';
        if (ref.current) onMenu(message, ref.current.getBoundingClientRect());
      }
    }, LONG_PRESS_MS);
    gesture.current = g;
  };

  const onPointerMove = (e: PointerEvent) => {
    const g = gesture.current;
    if (!g || g.mode === 'cancel') return;
    const mx = e.clientX - g.x;
    const my = e.clientY - g.y;
    if (g.mode === 'idle') {
      if (Math.abs(my) > 10) {
        clearTimer();
        g.mode = 'cancel';
      } else if (mx > 10 && Math.abs(mx) > Math.abs(my)) {
        clearTimer();
        g.mode = 'swipe';
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } else if (Math.abs(mx) > 10) {
        clearTimer();
        g.mode = 'cancel';
      }
    }
    if (g.mode === 'swipe') setDx(Math.max(0, Math.min(mx, 80)));
  };

  const end = () => {
    const g = gesture.current;
    clearTimer();
    if (g?.mode === 'swipe' && dx >= SWIPE_TRIGGER) onReply(message);
    gesture.current = null;
    setDx(0);
  };

  const common = {
    ref,
    'data-mid': message.id,
    // Вправо жест здесь — ответ на сообщение, поэтому листание разделов его не перехватывает (влево листает)
    'data-swipe-lock': 'right',
    onPointerDown,
    onPointerMove,
    onPointerUp: end,
    onPointerCancel: end,
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      if (ref.current) onMenu(message, ref.current.getBoundingClientRect());
    },
    style: dx ? { transform: `translateX(${dx}px)` } : undefined,
  };

  const swipeHint = dx > 8 && (
    <span className="bubble__swipe" style={{ opacity: Math.min(1, dx / SWIPE_TRIGGER), left: -dx + 8 }} aria-hidden="true">
      <IconReply />
    </span>
  );

  // Карточка теста: пузырь с аватаркой, подписью, названием и текстом, под ним кнопка той же ширины (как у ботов в Telegram)
  if (message.test) {
    const passed = message.testKind === 'passed';
    const link = passed ? message.buttons?.[0] : undefined;
    return (
      <li {...common} className={`bubble-group bubble-group--card bubble-group--${out ? 'out' : 'in'}`}>
        {swipeHint}
        <div className={`bubble bubble--${out ? 'out' : 'in'} bubble--last bubble--with-buttons bubble--tcard${message.text ? '' : ' bubble--tcard-bare'}${activeMatch ? ' bubble--match' : ''}`}>
          <div className="tcard">
            {test && (
              <span className="tcard__icon" style={{ background: test.tint }}>
                <img src={test.icon} alt="" />
              </span>
            )}
            <span className="tcard__text">
              <span className="tcard__label">{passed ? 'Пройденный тест' : 'Присланный тест'}</span>
              <span className="tcard__title">{test?.title ?? 'Тест'}</span>
            </span>
          </div>
          {message.text ? (
            <p className="tcard__body">
              <Highlighted text={message.text} query={query} active={activeMatch} />
              <span className="bubble__meta bubble__meta--ghost" aria-hidden="true">
                <Meta message={message} />
              </span>
            </p>
          ) : null}
          <span className="bubble__meta">
            <Meta message={message} />
          </span>
        </div>
        <ul className="bubble-buttons">
          <li>
            <button type="button" className="bubble-button" onClick={() => (link ? onOpenLink(link.href) : onOpenTest(message.test!))}>
              {passed ? 'Посмотреть' : 'Пройти'}
            </button>
          </li>
        </ul>
      </li>
    );
  }

  // Сообщение с кнопками (как у ботов в Telegram): пузырь и под ним кнопки той же ширины
  if (message.buttons?.length) {
    return (
      <li {...common} className={`bubble-group bubble-group--${out ? 'out' : 'in'}`}>
        {swipeHint}
        <div className={`bubble bubble--${out ? 'out' : 'in'} bubble--last bubble--with-buttons${activeMatch ? ' bubble--match' : ''}`}>
          <Highlighted text={message.text} query={query} active={activeMatch} />
          <span className="bubble__meta bubble__meta--ghost" aria-hidden="true">
            <Meta message={message} />
          </span>
          <span className="bubble__meta">
            <Meta message={message} />
          </span>
        </div>
        <ul className="bubble-buttons">
          {message.buttons.map((button) => (
            <li key={button.href}>
              <button type="button" className="bubble-button" onClick={() => onOpenLink(button.href)}>
                {button.label}
              </button>
            </li>
          ))}
        </ul>
      </li>
    );
  }

  return (
    <li
      {...common}
      className={`bubble bubble--${out ? 'out' : 'in'}${joinPrev ? ' bubble--joined-prev' : ''}${showMeta ? ' bubble--last' : ''}${activeMatch ? ' bubble--match' : ''}`}
    >
      {swipeHint}
      {message.replyTo && (
        <button type="button" className="bubble__quote" onClick={() => replyTarget && onQuoteClick(replyTarget.id)}>
          <span className="bubble__quote-name">{replyTarget ? (replyTarget.from === 'me' ? 'Вы' : peerName) : 'Сообщение'}</span>
          <span className="bubble__quote-text">{replyTarget ? replyTarget.text.replace(/\s*\n\s*/g, ' ') || 'Тест' : 'Сообщение удалено'}</span>
        </button>
      )}
      <Highlighted text={message.text} query={query} active={activeMatch} />
      {showMeta && (
        <>
          {/* Невидимая копия резервирует место под время в конце последней строки */}
          <span className="bubble__meta bubble__meta--ghost" aria-hidden="true">
            <Meta message={message} />
          </span>
          <span className="bubble__meta">
            <Meta message={message} />
          </span>
        </>
      )}
    </li>
  );
}
