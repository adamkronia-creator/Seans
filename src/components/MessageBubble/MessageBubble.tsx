import { requestPass } from '../../data/selfTest';
import { requestTaskPass, useAssignmentRecords } from '../../data/selfTask';
import { recordsText, TASK_DEADLINES } from '../../data/taskValues';
import { BLIND_FALLBACK_TITLE } from '../../data/resultMode';
import { useRef, useState, type PointerEvent } from 'react';
import { useAvatarSrc } from '../../data/profile';
import { avatarOf, firstNameOf, nameOf } from '../../data/contacts';
import type { Message } from '../../data/messages';
import { authorColor } from '../../data/contacts';
import { Avatar } from '../Avatar/Avatar';
import { IconEye } from '../GroupUi/GroupIcons';
import type { LibraryItem } from '../../data/library';
import { IconReadTicks } from '../icons';
import { IconClock, IconReply, IconTickSingle } from '../ChatParts/ChatIcons';
import { IconPinned } from '../FolderMenu/FolderIcons';
import { IconDownload as IconDownloadFile } from '../Profile/ProfileIcons';
import './MessageBubble.css';

function Status({ message }: { message: Message }) {
  const s = message.status ?? 'read';
  if (s === 'sending') return <IconClock className="bubble__ticks bubble__ticks--clock" />;
  if (s === 'sent') return <IconTickSingle className="bubble__ticks bubble__ticks--single" />;
  return <IconReadTicks className="bubble__ticks" aria-hidden="true" />;
}

/** Счётчик просмотров поста: 214, 1,2 тыс. */
const viewsText = (n: number) => (n < 1000 ? String(n) : `${(n / 1000).toFixed(n < 10000 ? 1 : 0).replace('.', ',')} тыс.`);

/** Подпись под сообщением: просмотры и автор поста (канал), «изм.», закреп, время и статус доставки (кроме постов канала) */
function Meta({ message, post }: { message: Message; post?: boolean }) {
  return (
    <>
      {post && message.signature && <span className="bubble__sign">{message.signature}</span>}
      {message.views !== undefined && (
        <span className="bubble__views">
          <IconEye aria-hidden="true" />
          {viewsText(message.views)}
        </span>
      )}
      {message.edited && <span className="bubble__edited">изм.</span>}
      {message.pinned && <IconPinned className="bubble__pin" aria-label="Закреплено" role="img" />}
      <span className="bubble__time">{message.time}</span>
      {message.from === 'me' && !post && <Status message={message} />}
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

const fileSize = (n: number) => (n < 1024 ? `${n} Б` : n < 1024 * 1024 ? `${Math.round(n / 1024)} КБ` : `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`);

/** Файл в сообщении: значок, название, размер; нажатие на значок скачивает */
function FileBlock({ file }: { file: NonNullable<Message['file']> }) {
  const download = () => {
    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.name;
    a.click();
  };
  return (
    <span className="bubble__file">
      <button type="button" className="bubble__file-icon" aria-label={`Скачать ${file.name}`} onClick={download}>
        <IconDownloadFile />
      </button>
      <span className="bubble__file-text">
        <span className="bubble__file-name">{file.name}</span>
        <span className="bubble__file-size">{fileSize(file.size)}</span>
      </span>
    </span>
  );
}

/** Реакции под сообщением, как в Telegram: белая плашка, эмодзи и фото того, кто его поставил; у одинаковых реакций два фото рядом */
function Reaction({ message, peerAvatar, onReact, counted }: { message: Message; peerAvatar?: string; onReact?: (m: Message, emoji: string | null) => void; counted?: boolean }) {
  const myAvatar = useAvatarSrc();
  const mine = message.reaction;
  const theirs = message.theirReaction;
  // Группа и канал: плашки «эмодзи и число», нажатие ставит или снимает вашу реакцию
  if (counted) {
    const totals = new Map<string, number>(Object.entries(message.counts ?? {}));
    if (mine) totals.set(mine, (totals.get(mine) ?? 0) + 1);
    if (totals.size === 0) return null;
    return (
      <span className="bubble__reactions">
        {[...totals].map(([emoji, n]) => (
          <button
            key={emoji}
            type="button"
            className={`bubble__reaction bubble__reaction--count${emoji === mine ? ' bubble__reaction--mine' : ''}`}
            aria-pressed={emoji === mine}
            aria-label={`Реакция ${emoji}: ${n}`}
            onClick={() => onReact?.(message, emoji === mine ? null : emoji)}
          >
            <span className="bubble__reaction-emoji">{emoji}</span>
            <span className="bubble__reaction-count">{n}</span>
          </button>
        ))}
      </span>
    );
  }
  if (!mine && !theirs) return null;
  const chip = (emoji: string, avatars: Array<string | undefined>, own: boolean) => {
    const body = (
      <>
        <span className="bubble__reaction-emoji">{emoji}</span>
        <span className="bubble__reaction-faces">
          {avatars.map((src, i) => (src ? <img key={i} src={src} alt="" /> : <span key={i} className="bubble__reaction-face--empty" />))}
        </span>
      </>
    );
    return own ? (
      <button key={emoji} type="button" className="bubble__reaction" aria-label={`Ваша реакция ${emoji}: снять`} onClick={() => onReact?.(message, null)}>
        {body}
      </button>
    ) : (
      <span key={emoji} className="bubble__reaction" aria-label={`Реакция собеседника ${emoji}`}>
        {body}
      </span>
    );
  };
  return (
    <span className="bubble__reactions">
      {theirs && theirs !== mine && chip(theirs, [peerAvatar], false)}
      {mine && chip(mine, mine === theirs ? [peerAvatar, myAvatar] : [myAvatar], true)}
    </span>
  );
}
const LONG_PRESS_MS = 450;

interface MessageBubbleProps {
  message: Message;
  /** Сообщение, на которое это — ответ (undefined, если удалено) */
  replyTarget?: Message;
  peerName: string;
  /** Фото собеседника: на плашке его реакции */
  peerAvatar?: string;
  /** Время и статус показываются только у последнего сообщения серии */
  showMeta: boolean;
  joinPrev: boolean;
  query?: string;
  activeMatch?: boolean;
  test?: LibraryItem;
  onReply: (m: Message) => void;
  /** Снять свою реакцию, нажав на неё под сообщением */
  onReact?: (m: Message, emoji: string | null) => void;
  onMenu: (m: Message, rect: DOMRect) => void;
  onQuoteClick: (id: string) => void;
  onOpenTest: (id: string) => void;
  onOpenTask: (id: string) => void;
  /** Кнопка «Настройки теста» или «Настройки задания» под карточкой, отправленной вами */
  onTestSettings: (m: Message) => void;
  /** Нажатие на кнопку под сообщением: переход по адресу кнопки */
  onOpenLink: (href: string) => void;
  /** Группа или канал: у входящих имя и фото автора, у канала — пост вместо пузыря собеседника; реакции со счётчиками */
  chatKind?: 'group' | 'channel';
  /** Имя автора над пузырём (первое сообщение серии) */
  showAuthor?: boolean;
  /** Фото автора слева от пузыря (последнее сообщение серии) */
  showAvatar?: boolean;
  /** Подпись автора рядом с именем: «владелец», «Куратор» */
  authorTitle?: string;
}

export function MessageBubble({
  message,
  replyTarget,
  peerName,
  peerAvatar,
  showMeta,
  joinPrev,
  query = '',
  activeMatch = false,
  test,
  onReply,
  onReact,
  onMenu,
  onQuoteClick,
  onOpenTest,
  onOpenTask,
  onTestSettings,
  onOpenLink,
  chatKind,
  showAuthor = false,
  showAvatar = false,
  authorTitle,
}: MessageBubbleProps) {
  const ref = useRef<HTMLLIElement>(null);
  const [dx, setDx] = useState(0);
  const gesture = useRef<{ x: number; y: number; mode: 'idle' | 'swipe' | 'cancel'; timer?: number } | null>(null);
  // Пост канала всегда в белом стекле, как у подписчиков: свои публикации выглядят так же, как чужие
  const post = chatKind === 'channel';
  const out = message.from === 'me' && !post;
  const counted = Boolean(chatKind);
  const hasReaction = Boolean(message.reaction || message.theirReaction || message.file || (counted && message.counts && Object.keys(message.counts).length));
  // Автор входящего сообщения в группе
  const authored = chatKind === 'group' && !out && Boolean(message.author);
  const authorName = message.author ? nameOf(message.author) : '';
  const authorStyle = authored ? ({ '--author': `var(--author-${authorColor(message.author!)})` } as React.CSSProperties) : undefined;
  const authorLine = authored && showAuthor && (
    <span className="bubble__author" style={authorStyle}>
      <span className="bubble__author-name">{authorName}</span>
      {authorTitle && <span className="bubble__author-title">{authorTitle}</span>}
    </span>
  );
  const authorFace = authored && showAvatar && (
    <span className="bubble__avatar" aria-hidden="true">
      <Avatar src={avatarOf(message.author!)} size={36} />
    </span>
  );
  // Постоянное задание: клиенту ушло правило (сколько записей всего), а у отправленного себе считаются сделанные записи
  const permanent = message.task ? message.taskOptions?.permanent : undefined;
  const selfRecords = useAssignmentRecords(message.toSelf && permanent ? message.id : '');
  const exhausted = Boolean(permanent?.limit && selfRecords >= permanent.limit);

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

  // Служебная запись: по центру, без пузыря и жестов
  if (message.service) {
    return (
      <li ref={ref} data-mid={message.id} className="chat__service">
        <span>{message.text}</span>
      </li>
    );
  }

  const common = {
    ref,
    'data-mid': message.id,
    // Вправо жест здесь — ответ на сообщение, поэтому листание разделов его не перехватывает (влево листает)
    'data-swipe-lock': 'right',
    onPointerDown,
    onPointerMove,
    onPointerUp: (e: PointerEvent) => {
      const g = gesture.current;
      // Короткое касание без сдвига открывает меню сразу, удерживать не нужно
      const tap = g?.mode === 'idle' && !(e.target as HTMLElement).closest('button') && Math.hypot(e.clientX - g.x, e.clientY - g.y) < 10;
      end();
      if (tap && ref.current) onMenu(message, ref.current.getBoundingClientRect());
    },
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

  // Карточка теста или задания: пузырь с аватаркой, подписью, названием и текстом, под ним кнопка той же ширины (как у ботов в Telegram)
  if (message.test || message.task) {
    const isTask = Boolean(message.task);
    const passed = message.testKind === 'passed';
    const link = passed ? message.buttons?.[0] : undefined;
    // Тест или задание, которое прислали вы, клиенту уже ушло: пройти его тут нечего, кнопка показывает настройки, с какими оно отправлено
    const settings = out && !passed && !message.toSelf;
    // Слепой тест, отправленный себе, выглядит так же, как у клиента: без названия и значка методики
    const hiddenTest = Boolean(!isTask && message.toSelf && message.testOptions?.blind);
    return (
      <li {...common} className={`bubble-group bubble-group--card bubble-group--${out ? 'out' : 'in'}`}>
        {swipeHint}
        <div className={`bubble bubble--${out ? 'out' : 'in'} bubble--last bubble--with-buttons bubble--tcard${message.text ? '' : ' bubble--tcard-bare'}${activeMatch ? ' bubble--match' : ''}`}>
          <div className="tcard">
            {test && !hiddenTest && (
              <span className="tcard__icon" style={{ background: test.tint }}>
                <img src={test.icon} alt="" loading="lazy" decoding="async" />
              </span>
            )}
            <span className="tcard__text">
              <span className="tcard__label">
                {isTask
                  ? passed
                    ? message.record
                      ? 'Запись задания'
                      : 'Выполненное задание'
                    : permanent
                      ? 'Постоянное задание'
                      : settings
                        ? 'Отправленное задание'
                        : 'Присланное задание'
                  : passed
                    ? 'Пройденный тест'
                    : settings
                      ? 'Отправленный тест'
                      : 'Присланный тест'}
              </span>
              <span className="tcard__title">{hiddenTest ? (message.testOptions?.blindTitle ?? BLIND_FALLBACK_TITLE) : (test?.title ?? (isTask ? 'Задание' : 'Тест'))}</span>
              {settings && message.testOptions?.blind && <span className="tcard__note">Слепой тест: клиент не видит название</span>}
              {!passed && permanent && (
                <span className="tcard__note">
                  {message.toSelf ? recordsText(selfRecords, permanent.limit) : permanent.limit ? `Всего записей: ${permanent.limit}` : 'Записей без ограничения'}
                </span>
              )}
            </span>
          </div>
          {message.text ? (
            <p className="tcard__body">
              <Highlighted text={message.text} query={query} active={activeMatch} />
              <span className="bubble__meta bubble__meta--ghost" aria-hidden="true">
                <Meta message={message} post={post} />
              </span>
            </p>
          ) : null}
          {message.reaction || message.theirReaction ? (
            <div className="bubble__foot bubble__foot--text">
              <Reaction message={message} peerAvatar={peerAvatar} onReact={onReact} counted={counted} />
              <span className="bubble__meta bubble__meta--foot">
                <Meta message={message} post={post} />
              </span>
            </div>
          ) : (
            <span className="bubble__meta">
              <Meta message={message} post={post} />
            </span>
          )}
        </div>
        <ul className="bubble-buttons">
          <li>
            <button
              type="button"
              className="bubble-button"
              disabled={exhausted}
              onClick={() => {
                if (settings) return onTestSettings(message);
                if (link) return onOpenLink(link.href);
                if (isTask) {
                  // Задание, отправленное себе, откроется выполнением с теми настройками, с какими оно ушло
                  if (message.toSelf) {
                    const o = message.taskOptions;
                    requestTaskPass({
                      taskId: message.task!,
                      form: o?.form ?? '',
                      comment: o?.comment ?? true,
                      state: o?.state ?? true,
                      deadline: o?.deadline ?? TASK_DEADLINES[0],
                      message: o?.note ?? '',
                      ...(permanent ? { permanent, assignment: message.id } : {}),
                    });
                  }
                  return onOpenTask(message.task!);
                }
                if (message.toSelf) {
                  const o = message.testOptions;
                  requestPass({ testId: message.test!, form: o?.form ?? '', saveBlank: o?.saveBlank ?? true, shuffle: o?.shuffle ?? false, blind: o?.blind ?? true, blindTitle: o?.blindTitle, result: o?.result ?? 'thanks', message: message.text });
                }
                onOpenTest(message.test!);
              }}
            >
              {settings ? (isTask ? 'Настройки задания' : 'Настройки теста') : passed ? 'Посмотреть' : exhausted ? 'Все записи выполнены' : 'Пройти'}
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
        {authorFace}
        <div className={`bubble bubble--${out ? 'out' : 'in'} bubble--last bubble--with-buttons${activeMatch ? ' bubble--match' : ''}`}>
          {authorLine}
          <Highlighted text={message.text} query={query} active={activeMatch} />
          <span className="bubble__meta bubble__meta--ghost" aria-hidden="true">
            <Meta message={message} post={post} />
          </span>
          <span className="bubble__meta">
            <Meta message={message} post={post} />
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

  // Фото: пузырь по размеру картинки с узкой каймой, подпись под ней; внизу плашка реакций слева и время справа
  if (message.image) {
    return (
      <li
        {...common}
        className={`bubble bubble--photo bubble--${out ? 'out' : 'in'}${joinPrev ? ' bubble--joined-prev' : ''}${showMeta ? ' bubble--last' : ''}${activeMatch ? ' bubble--match' : ''}`}
      >
        {swipeHint}
        {authorFace}
        {message.forwarded && <span className="bubble__fwd bubble__fwd--photo">Переслано от {message.forwarded}</span>}
        <img className="bubble__img" src={message.image} alt="Фото" draggable={false} />
        {message.text && (
          <p className="bubble__caption">
            <Highlighted text={message.text} query={query} active={activeMatch} />
          </p>
        )}
        <div className="bubble__foot">
          <Reaction message={message} peerAvatar={peerAvatar} onReact={onReact} counted={counted} />
          <span className="bubble__meta bubble__meta--foot">
            <Meta message={message} post={post} />
          </span>
        </div>
      </li>
    );
  }

  return (
    <li
      {...common}
      className={`bubble bubble--${out ? 'out' : 'in'}${joinPrev ? ' bubble--joined-prev' : ''}${showMeta ? ' bubble--last' : ''}${activeMatch ? ' bubble--match' : ''}`}
    >
      {swipeHint}
      {authorFace}
      {authorLine}
      {message.replyTo && (
        <button type="button" className="bubble__quote" onClick={() => replyTarget && onQuoteClick(replyTarget.id)}>
          <span className="bubble__quote-name">{replyTarget ? (replyTarget.from === 'me' ? 'Вы' : chatKind === 'group' && replyTarget.author ? firstNameOf(replyTarget.author) : peerName) : 'Сообщение'}</span>
          <span className="bubble__quote-text">{replyTarget ? replyTarget.text.replace(/\s*\n\s*/g, ' ') || 'Тест' : 'Сообщение удалено'}</span>
        </button>
      )}
      {message.image && <img className="bubble__img" src={message.image} alt="Фото" draggable={false} />}
      {message.forwarded && <span className="bubble__fwd">Переслано от {message.forwarded}</span>}
      {message.file && <FileBlock file={message.file} />}
      <Highlighted text={message.text} query={query} active={activeMatch} />
      {hasReaction && (
        <div className="bubble__foot bubble__foot--text">
          <Reaction message={message} peerAvatar={peerAvatar} onReact={onReact} counted={counted} />
          <span className="bubble__meta bubble__meta--foot">
            <Meta message={message} post={post} />
          </span>
        </div>
      )}
      {showMeta && !hasReaction && (
        <>
          {/* Невидимая копия резервирует место под время в конце последней строки */}
          <span className="bubble__meta bubble__meta--ghost" aria-hidden="true">
            <Meta message={message} post={post} />
          </span>
          <span className="bubble__meta">
            <Meta message={message} post={post} />
          </span>
        </>
      )}
    </li>
  );
}
