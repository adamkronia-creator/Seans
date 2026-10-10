import { useId, useState } from 'react';
import { DEFAULT_DURATION, DURATIONS, endTime, type Outcome } from '../../data/appointments';
import type { Chat } from '../../data/chats';
import type { Plan, PlanInput, PlanKind } from '../../data/planner';
import { dayLong, toMinutes } from '../../utils/ruDate';
import { Frame } from '../ChatBooking/BookingSheets';
import '../ChatBooking/BookingSheets.css';
import { AutoTextarea } from '../EditSheet/AutoTextarea';
import { IconBookingCancelled, IconBookingDone, IconBookingPending } from '../icons';
import { Switch } from '../Switch/Switch';
import './PlannerSheets.css';

// ---------------------------------------------------------------- новая запись и правка

interface PlanSheetProps {
  /** Что правим; без него создаётся новая запись */
  plan?: Plan;
  /** День, на который создаётся запись */
  day: string;
  now: Date;
  clients: Chat[];
  onSave: (input: PlanInput) => void;
  onRemove?: () => void;
  onClose: () => void;
}

/** Дело или запланированный сеанс: что, когда и (для сеанса) с кем. Сеанс потом можно предложить клиенту */
export function PlanSheet({ plan, day, now, clients, onSave, onRemove, onClose }: PlanSheetProps) {
  const uid = useId();
  const [kind, setKind] = useState<PlanKind>(plan?.kind ?? 'task');
  const [title, setTitle] = useState(plan?.title ?? '');
  const [date, setDate] = useState(plan?.date ?? day);
  const [withTime, setWithTime] = useState(Boolean(plan?.time));
  const [time, setTime] = useState(plan?.time ?? '18:00');
  const [chatId, setChatId] = useState(plan?.chatId ?? clients[0]?.id ?? '');
  const [duration, setDuration] = useState(plan?.duration ?? DEFAULT_DURATION);

  const isSession = kind === 'session';
  let problem: string | null = null;
  if (!date) problem = 'Выберите дату';
  else if (isSession && !time) problem = 'Укажите время начала';
  else if (isSession && toMinutes(time) + duration > 24 * 60 - 1) problem = 'Сеанс должен закончиться до полуночи';
  else if (!isSession && !title.trim()) problem = 'Напишите, что нужно сделать';
  else if (isSession && !chatId) problem = 'Выберите клиента';

  // Пустое название дела не ругается красным: кнопка просто не нажимается, пока не напишешь
  const complaint = problem !== null && (isSession || title.trim() !== '') ? problem : null;
  const hint = isSession && !problem ? `${dayLong(date, now)} · ${time}–${endTime(time, duration)}` : null;
  const heading = plan ? (plan.kind === 'task' ? 'Дело' : 'Сеанс') : 'Новая запись';

  const save = () => {
    if (problem) return;
    onSave(
      isSession
        ? { kind, date, title: '', time, chatId, duration }
        : { kind, date, title, ...(withTime ? { time } : {}) },
    );
  };

  return (
    <Frame
      title={heading}
      onClose={onClose}
      swipe={plan ? undefined : { index: kind === 'task' ? 0 : 1, count: 2, onIndex: (i) => setKind(i === 0 ? 'task' : 'session') }}
      footer={
        <>
          <button type="button" className="sheet__button" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="sheet__button sheet__button--primary" disabled={problem !== null} onClick={save}>
            {plan ? 'Сохранить' : 'Добавить'}
          </button>
        </>
      }
    >
      {!plan && (
        <div className="bk-segments" role="radiogroup" aria-label="Что добавить">
          {(
            [
              ['task', 'Дело'],
              ['session', 'Сеанс'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={kind === id}
              className={`bk-segments__item${kind === id ? ' bk-segments__item--active' : ''}`}
              onClick={() => setKind(id)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {isSession ? (
        <section className="sheet__card bk-card" aria-label="Клиент">
          <h3 className="bk-label">Клиент</h3>
          <div className="bk-chips" role="radiogroup" aria-label="Клиент">
            {clients.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={chatId === c.id}
                className={`bk-chip${chatId === c.id ? ' bk-chip--active' : ''}`}
                onClick={() => setChatId(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="sheet__card bk-card">
          <AutoTextarea
            className="bk-textarea"
            rows={2}
            value={title}
            onChange={(v) => setTitle(v.replace(/\n/g, ' '))}
            placeholder="Что нужно сделать"
            aria-label="Что нужно сделать"
            maxLength={200}
          />
        </section>
      )}

      <div>
        <ul className="sheet__card bk-fields">
          <li className="sheet__row">
            <label className="sheet__row-label" htmlFor={`${uid}-date`}>
              Дата
            </label>
            <input id={`${uid}-date`} className="sheet__row-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </li>
          {isSession ? (
            <li className="sheet__row">
              <label className="sheet__row-label" htmlFor={`${uid}-time`}>
                Начало
              </label>
              <input id={`${uid}-time`} className="sheet__row-input" type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} />
            </li>
          ) : (
            <>
              <li className="sheet__row">
                <span className="sheet__row-label">Указать время</span>
                <span className="pl-switch">
                  <Switch checked={withTime} onChange={setWithTime} label="Указать время" />
                </span>
              </li>
              {withTime && (
                <li className="sheet__row">
                  <label className="sheet__row-label" htmlFor={`${uid}-time`}>
                    Время
                  </label>
                  <input id={`${uid}-time`} className="sheet__row-input" type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} />
                </li>
              )}
            </>
          )}
        </ul>
        {(complaint || hint) && (
          <p className={`bk-hint${complaint ? ' bk-hint--error' : ''}`} role={complaint ? 'alert' : undefined}>
            {complaint ?? hint}
          </p>
        )}
      </div>

      {isSession && (
        <section className="sheet__card bk-card" aria-label="Длительность сеанса">
          <h3 className="bk-label">Длительность</h3>
          <div className="bk-chips" role="radiogroup" aria-label="Длительность сеанса">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={duration === d}
                className={`bk-chip${duration === d ? ' bk-chip--active' : ''}`}
                onClick={() => setDuration(d)}
              >
                {d} мин
              </button>
            ))}
          </div>
        </section>
      )}

      {plan && onRemove && (
        <button type="button" className="sheet__card pl-remove" onClick={onRemove}>
          Удалить
        </button>
      )}
    </Frame>
  );
}

// ---------------------------------------------------------------- отметка о приеме

interface OutcomeSheetProps {
  /** Подпись под заголовком: «Максим Мартынов · чт, 8 окт, 18:00» */
  subtitle: string;
  current: Outcome | undefined;
  /** Отметку можно менять: у сеанса нет текста в истории */
  canChange: boolean;
  onPick: (outcome: Outcome | null) => void;
  onClose: () => void;
}

const CHOICES: { outcome: Outcome | null; label: string; Icon: typeof IconBookingDone; tone: 'green' | 'red' | 'gray' }[] = [
  { outcome: 'held', label: 'Состоялся', Icon: IconBookingDone, tone: 'green' },
  { outcome: 'missed', label: 'Не состоялся', Icon: IconBookingCancelled, tone: 'red' },
  { outcome: null, label: 'Без отметки', Icon: IconBookingPending, tone: 'gray' },
];

/** Изменить отметку о приеме: состоялся, не состоялся или снять отметку */
export function OutcomeSheet({ subtitle, current, canChange, onPick, onClose }: OutcomeSheetProps) {
  return (
    <Frame
      title="Отметка о приеме"
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <button type="button" className="sheet__button" onClick={onClose}>
          Закрыть
        </button>
      }
    >
      <div>
        <ul className="sheet__card pl-choices" role="radiogroup" aria-label="Отметка о приеме">
          {CHOICES.map(({ outcome, label, Icon, tone }) => {
            const active = (outcome ?? undefined) === current;
            return (
              <li key={label}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className="pl-choice"
                  disabled={!canChange && !active}
                  onClick={() => (active ? onClose() : onPick(outcome))}
                >
                  <Icon className={`pl-choice__icon pl-choice__icon--${tone}`} aria-hidden="true" />
                  <span className="pl-choice__label">{label}</span>
                  {active && (
                    <svg className="pl-choice__check" viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4.5 10.5l3.5 3.5 7.5-8" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        {!canChange && (
          <p className="bk-hint">К сеансу есть комментарий в истории клиента. Чтобы изменить отметку, сначала очистите его.</p>
        )}
      </div>
    </Frame>
  );
}
