import type { Appointment, Outcome } from '../../data/appointments';
import type { Visit, VisitState } from '../../data/agenda';
import type { ChatSection } from '../../data/chatIntent';
import { CLIENT_CHAT } from '../../data/clientStore';
import type { Chat } from '../../data/chats';
import type { Plan } from '../../data/planner';
import { parseBlocks, RichBlocks } from '../../utils/richText';
import { dayShort, durationLabel } from '../../utils/ruDate';
import { Avatar } from '../Avatar/Avatar';
import { slotTime } from '../ChatBooking/bookingText';
import { IconBack, IconCaseEdit, IconTestChevronDown } from '../icons';
import './AgendaCards.css';

type Tone = 'green' | 'yellow' | 'red' | 'accent' | 'gray';

const firstName = (chat?: Chat) => chat?.name.split(' ')[0] ?? 'Клиент';

const TAGS: Record<VisitState, { label: string; tone: Tone }> = {
  planned: { label: 'Запланирован', tone: 'gray' },
  upcoming: { label: 'Подтвержден', tone: 'green' },
  now: { label: 'Идет сейчас', tone: 'accent' },
  await: { label: 'Ждет отметки', tone: 'yellow' },
  held: { label: 'Состоялся', tone: 'green' },
  missed: { label: 'Не состоялся', tone: 'red' },
};

/** Открыть чат клиента на нужном разделе */
type OpenChat = (chatId: string, section: ChatSection) => void;

/** Ссылка внизу карточки: ведет в чат клиента */
function OpenLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="pl-open" onClick={onClick}>
      {label}
      <IconBack className="pl-open__arrow" />
    </button>
  );
}

/** Куда вести из карточки сеанса: в историю, если сеанс записан в ней, иначе в запись на прием; у запланированного сеанса чата еще нет */
function openTarget(v: Visit): { section: ChatSection; label: string } | null {
  if (v.sessionId && v.chatId === CLIENT_CHAT) return { section: 'library', label: 'Открыть историю взаимодействия' };
  if (v.source === 'appointment') return { section: 'booking', label: 'Открыть запись на прием' };
  return null;
}

// ---------------------------------------------------------------- сеанс

interface VisitCardProps {
  visit: Visit;
  chat?: Chat;
  /** Номер сеанса в истории клиента (есть у состоявшихся) */
  number?: number;
  /** Комментарий к сеансу в мини-разметке */
  comment: string;
  /** Отметить, состоялся ли сеанс */
  onMark: (visit: Visit, outcome: Outcome) => void;
  /** Изменить отметку, которая уже стоит */
  onOutcome: (visit: Visit) => void;
  onComment: (visit: Visit) => void;
  /** Предложить время клиенту (у запланированного сеанса) */
  onOffer: (visit: Visit) => void;
  /** Изменить запланированный сеанс */
  onEdit: (visit: Visit) => void;
  onOpenChat: OpenChat;
}

/** Сеанс на день: время, клиент, состояние и то, что с ним можно сделать сейчас */
export function VisitCard({ visit, chat, number, comment, onMark, onOutcome, onComment, onOffer, onEdit, onOpenChat }: VisitCardProps) {
  const { state, source } = visit;
  const tag = TAGS[state];
  const duration = visit.appointment?.duration ?? visit.plan?.duration;
  const kind = number ? `Сеанс №${number}` : source === 'appointment' ? 'Прием' : 'Сеанс';
  const sub = duration ? `${kind} · ${durationLabel(duration)}` : kind;
  const marked = state === 'held' || state === 'missed';
  const open = openTarget(visit);
  // Запланированный сеанс правится, пока на нем нет отметки: отметку сначала снимают
  const editable = source === 'plan' && !marked;
  const who = (
    <>
      <Avatar src={chat?.avatar} size={36} />
      <span className="pl-visit__text">
        <span className="pl-visit__name">{chat?.name ?? 'Клиент'}</span>
        <span className="pl-visit__sub">{sub}</span>
      </span>
    </>
  );

  return (
    <li className={`pl-card pl-visit pl-visit--${state}`}>
      <div className="pl-visit__top">
        <span className={`pl-visit__time${visit.start ? '' : ' pl-visit__time--none'}`}>
          {visit.start ? `${visit.start}–${visit.end}` : 'Время не указано'}
        </span>
        {marked && source !== 'record' ? (
          <button
            type="button"
            className={`pl-tag pl-tag--${tag.tone} pl-tag--button`}
            aria-label={`${tag.label}. Изменить отметку`}
            onClick={() => onOutcome(visit)}
          >
            {tag.label}
            <IconTestChevronDown className="pl-tag__chevron" />
          </button>
        ) : (
          <span className={`pl-tag pl-tag--${tag.tone}`}>{tag.label}</span>
        )}
      </div>

      {editable ? (
        <button type="button" className="pl-visit__who" aria-label={`${chat?.name ?? 'Клиент'}: изменить запись`} onClick={() => onEdit(visit)}>
          {who}
        </button>
      ) : (
        <div className="pl-visit__who">{who}</div>
      )}

      {(state === 'await' || state === 'now') && (
        <div className="pl-actions">
          <button type="button" className="pl-button pl-button--primary" onClick={() => onMark(visit, 'held')}>
            Состоялся
          </button>
          <button type="button" className="pl-button" onClick={() => onMark(visit, 'missed')}>
            Не состоялся
          </button>
        </div>
      )}
      {state === 'planned' && (
        <div className="pl-actions">
          <button type="button" className="pl-button pl-button--primary" onClick={() => onOffer(visit)}>
            Предложить клиенту
          </button>
        </div>
      )}

      {state === 'held' && (
        <div className="pl-comment">
          <div className="pl-comment__head">
            <span className="pl-comment__label">Комментарий к сеансу</span>
            {comment && (
              <button type="button" className="pl-comment__edit" aria-label="Изменить комментарий" onClick={() => onComment(visit)}>
                <IconCaseEdit />
              </button>
            )}
          </div>
          {comment ? (
            <div className="pl-comment__text" onClick={() => onComment(visit)}>
              <RichBlocks blocks={parseBlocks(comment)} textClass="pl-text" listClass="pl-list" />
            </div>
          ) : (
            <button type="button" className="pl-comment__add" onClick={() => onComment(visit)}>
              Добавить комментарий
            </button>
          )}
        </div>
      )}

      {open && <OpenLink label={open.label} onClick={() => onOpenChat(visit.chatId, open.section)} />}
    </li>
  );
}

// ---------------------------------------------------------------- предложение времени

/** Предложение времени, на которое ещё нет ответа: ваше или клиента */
export function OfferCard({ appointment: a, chat, onOpenChat }: { appointment: Appointment; chat?: Chat; onOpenChat: OpenChat }) {
  const mine = a.by === 'me';
  // Имя клиента уже в заголовке карточки, поэтому в подписи его нет
  const text = mine
    ? a.replaces
      ? 'Вы предложили перенос'
      : a.countered
        ? 'Вы предложили другое время'
        : 'Вы предложили время'
    : a.replaces
      ? 'Просит перенести прием'
      : a.slot.kind === 'range'
        ? 'Предлагает выбрать время'
        : a.countered
          ? 'Предлагает другое время'
          : 'Предлагает время';
  return (
    <li className="pl-card pl-visit pl-visit--offer">
      <div className="pl-visit__top">
        <span className="pl-visit__time">{slotTime(a.slot, a.duration)}</span>
        <span className={`pl-tag pl-tag--${mine ? 'yellow' : 'accent'}`}>{mine ? 'Ждем ответа' : 'Ждет вашего ответа'}</span>
      </div>
      <div className="pl-visit__who">
        <Avatar src={chat?.avatar} size={36} />
        <span className="pl-visit__text">
          <span className="pl-visit__name">{chat?.name ?? 'Клиент'}</span>
          <span className="pl-visit__sub">
            {text} · {durationLabel(a.duration)}
          </span>
        </span>
      </div>
      {mine ? (
        <OpenLink label="Открыть запись на прием" onClick={() => onOpenChat(a.chatId, 'booking')} />
      ) : (
        <div className="pl-actions">
          <button type="button" className="pl-button pl-button--primary" onClick={() => onOpenChat(a.chatId, 'booking')}>
            Ответить в чате
          </button>
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------- отмененный и перенесенный прием

export function ClosedCard({ appointment: a, chat, now, onOpenChat }: { appointment: Appointment; chat?: Chat; now: Date; onOpenChat: OpenChat }) {
  const cancelled = a.status === 'cancelled';
  const who = a.closedBy === 'me' ? 'вы' : firstName(chat);
  const sub = cancelled
    ? `Отменил ${who}${a.reason ? ` · «${a.reason}»` : ''}`
    : a.movedTo
      ? `Перенесен на ${dayShort(a.movedTo.date, now)}, ${a.movedTo.start}`
      : 'Перенесен';
  return (
    <li className="pl-card pl-visit pl-visit--closed">
      <div className="pl-visit__top">
        <span className="pl-visit__time">{slotTime(a.slot, a.duration)}</span>
        <span className={`pl-tag pl-tag--${cancelled ? 'red' : 'gray'}`}>{cancelled ? 'Отменен' : 'Перенесен'}</span>
      </div>
      <div className="pl-visit__who">
        <Avatar src={chat?.avatar} size={36} />
        <span className="pl-visit__text">
          <span className="pl-visit__name">{chat?.name ?? 'Клиент'}</span>
          <span className="pl-visit__sub">{sub}</span>
        </span>
      </div>
      <OpenLink label="Открыть запись на прием" onClick={() => onOpenChat(a.chatId, 'booking')} />
    </li>
  );
}

// ---------------------------------------------------------------- дело

interface TaskCardProps {
  plan: Plan;
  onToggle: (plan: Plan) => void;
  onEdit: (plan: Plan) => void;
}

/** Дело с галочкой: нажатие на кружок отмечает выполнение, на текст открывает правку */
export function TaskCard({ plan, onToggle, onEdit }: TaskCardProps) {
  return (
    <li className={`pl-card pl-task${plan.done ? ' pl-task--done' : ''}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={plan.done}
        aria-label={`Выполнено: ${plan.title}`}
        className="pl-check"
        onClick={() => onToggle(plan)}
      >
        <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2.5 6.4l2.3 2.3 4.7-4.9" />
        </svg>
      </button>
      <button type="button" className="pl-task__body" onClick={() => onEdit(plan)}>
        <span className="pl-task__title">{plan.title}</span>
        {plan.time && <span className="pl-task__time">{plan.time}</span>}
      </button>
    </li>
  );
}

// ---------------------------------------------------------------- заметка дня

/** Заметки дня: свободный текст с форматированием, внизу распорядка */
export function NoteCard({ text, onEdit }: { text: string; onEdit: () => void }) {
  return (
    <section className="pl-card pl-note" aria-label="Заметки дня">
      <div className="pl-comment__head">
        <h3 className="pl-note__title">Заметки дня</h3>
        {text && (
          <button type="button" className="pl-comment__edit" aria-label="Изменить заметки" onClick={onEdit}>
            <IconCaseEdit />
          </button>
        )}
      </div>
      {text ? (
        <div className="pl-comment__text" onClick={onEdit}>
          <RichBlocks blocks={parseBlocks(text)} textClass="pl-text" listClass="pl-list" />
        </div>
      ) : (
        <button type="button" className="pl-comment__add" onClick={onEdit}>
          Записать заметку
        </button>
      )}
    </section>
  );
}
