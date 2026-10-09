import { useId, useState, type ReactNode } from 'react';
import {
  DEFAULT_DURATION,
  DURATIONS,
  endTime,
  pickableStarts,
  problemWith,
  type Appointment,
  type Place,
  type ProposalInput,
  type Slot,
} from '../../data/appointments';
import { addDays, dateKey, dayLong, durationLabel, parseDate } from '../../utils/ruDate';
import { AutoTextarea } from '../EditSheet/AutoTextarea';
import { SheetOverlay } from '../EditSheet/SheetOverlay';
import { useSheet } from '../EditSheet/useSheet';
import '../EditSheet/EditSheet.css';
import { IconExternal } from './BookingIcons';
import { MAP_LINKS } from './geocode';
import './BookingSheets.css';

interface FrameProps {
  title: string;
  /** Пояснение под заголовком: что именно меняем */
  subtitle?: string;
  footer: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

/** Каркас окна: ручка, заголовок, прокручиваемое содержимое и нижние кнопки */
function Frame({ title, subtitle, footer, onClose, children }: FrameProps) {
  useSheet(onClose);
  return (
    <SheetOverlay onClose={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet__grab" aria-hidden="true" />
        <div className="sheet__header">
          <h2 className="sheet__heading">{title}</h2>
          {subtitle && <p className="bk-subtitle">{subtitle}</p>}
        </div>
        <div className="sheet__body">{children}</div>
        <div className="sheet__footer">{footer}</div>
      </div>
    </SheetOverlay>
  );
}

// ---------------------------------------------------------------- предложить время

export type ProposeMode = 'new' | 'reschedule' | 'counter' | 'edit';

export interface Draft {
  slot: Slot;
  duration: number;
  comment?: string;
}

/** Первое предложение: завтра в 18:00 */
export const newDraft = (now: Date): Draft => ({
  slot: { kind: 'exact', date: dateKey(addDays(now, 1)), start: '18:00' },
  duration: DEFAULT_DURATION,
});

/** Перенос: то же время через неделю */
export function rescheduleDraft(a: Appointment): Draft {
  return {
    slot: { kind: 'exact', date: dateKey(addDays(parseDate(a.slot.date), 7)), start: a.slot.kind === 'exact' ? a.slot.start : '18:00' },
    duration: a.duration,
  };
}

const TITLES: Record<ProposeMode, string> = {
  new: 'Предложить время',
  reschedule: 'Перенести прием',
  counter: 'Другое время',
  edit: 'Изменить предложение',
};

const SUBMIT: Record<ProposeMode, string> = {
  new: 'Предложить',
  reschedule: 'Предложить',
  counter: 'Отправить',
  edit: 'Сохранить',
};

interface ProposeSheetProps {
  mode: ProposeMode;
  peerName: string;
  now: Date;
  initial: Draft;
  /** Строка под заголовком: «Сейчас: чт, 15 окт, 18:00–18:50» */
  subtitle?: string;
  onSubmit: (input: Omit<ProposalInput, 'replaces'>) => void;
  onClose: () => void;
}

/** Предложить время: точное или промежуток, длительность и комментарий. Нужно и для переноса, и для ответа «другое время» */
export function ProposeSheet({ mode, peerName, now, initial, subtitle, onSubmit, onClose }: ProposeSheetProps) {
  const uid = useId();
  const first = initial.slot;
  const [kind, setKind] = useState<Slot['kind']>(first.kind);
  const [date, setDate] = useState(first.date);
  const [start, setStart] = useState(first.kind === 'exact' ? first.start : '18:00');
  const [from, setFrom] = useState(first.kind === 'range' ? first.from : '15:00');
  const [to, setTo] = useState(first.kind === 'range' ? first.to : '19:00');
  const [duration, setDuration] = useState(initial.duration);
  const [comment, setComment] = useState(initial.comment ?? '');

  const slot: Slot = kind === 'exact' ? { kind, date, start } : { kind, date, from, to };
  const problem = problemWith(slot, duration, now);

  const hint = problem ?? (kind === 'exact' ? `${dayLong(date, now)} · ${start}–${endTime(start, duration)}` : `${peerName} выберет начало приема внутри промежутка`);

  return (
    <Frame
      title={TITLES[mode]}
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sheet__button" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className="sheet__button sheet__button--primary"
            disabled={problem !== null}
            onClick={() => onSubmit({ slot, duration, comment })}
          >
            {SUBMIT[mode]}
          </button>
        </>
      }
    >
      <div className="bk-segments" role="radiogroup" aria-label="Что предложить">
        {(
          [
            ['exact', 'Точное время'],
            ['range', 'Промежуток'],
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

      <div>
        <ul className="sheet__card bk-fields">
          <li className="sheet__row">
            <label className="sheet__row-label" htmlFor={`${uid}-date`}>
              Дата
            </label>
            <input
              id={`${uid}-date`}
              className="sheet__row-input"
              type="date"
              min={dateKey(now)}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </li>
          {kind === 'exact' ? (
            <li className="sheet__row">
              <label className="sheet__row-label" htmlFor={`${uid}-start`}>
                Начало
              </label>
              <input
                id={`${uid}-start`}
                className="sheet__row-input"
                type="time"
                step={300}
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </li>
          ) : (
            <>
              <li className="sheet__row">
                <label className="sheet__row-label" htmlFor={`${uid}-from`}>
                  Не раньше
                </label>
                <input
                  id={`${uid}-from`}
                  className="sheet__row-input"
                  type="time"
                  step={300}
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </li>
              <li className="sheet__row">
                <label className="sheet__row-label" htmlFor={`${uid}-to`}>
                  Закончить до
                </label>
                <input
                  id={`${uid}-to`}
                  className="sheet__row-input"
                  type="time"
                  step={300}
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </li>
            </>
          )}
        </ul>
        <p className={`bk-hint${problem ? ' bk-hint--error' : ''}`} role={problem ? 'alert' : undefined}>
          {hint}
        </p>
      </div>

      <section className="sheet__card bk-card" aria-label="Длительность приема">
        <h3 className="bk-label">Длительность</h3>
        <div className="bk-chips" role="radiogroup" aria-label="Длительность приема">
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

      <section className="sheet__card bk-card">
        <AutoTextarea
          className="bk-textarea"
          rows={2}
          value={comment}
          onChange={setComment}
          placeholder="Комментарий (необязательно)"
          aria-label="Комментарий"
          maxLength={500}
        />
      </section>
    </Frame>
  );
}

// ---------------------------------------------------------------- выбрать начало внутри промежутка

interface RangeSheetProps {
  a: Appointment;
  peerName: string;
  now: Date;
  onSubmit: (start: string) => void;
  onClose: () => void;
}

/** Согласие на промежуток: выбрать, во сколько начать внутри него */
export function RangeSheet({ a, peerName, now, onSubmit, onClose }: RangeSheetProps) {
  const starts = pickableStarts(a, now);
  const [start, setStart] = useState(starts[0] ?? '');
  const slot = a.slot;
  return (
    <Frame
      title="Выберите время"
      subtitle={slot.kind === 'range' ? `${peerName} предлагает ${dayLong(slot.date, now).toLowerCase()}, с ${slot.from} до ${slot.to}` : undefined}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sheet__button" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="sheet__button sheet__button--primary" disabled={!start} onClick={() => onSubmit(start)}>
            Подтвердить
          </button>
        </>
      }
    >
      {starts.length > 0 ? (
        <section className="sheet__card bk-card">
          <h3 className="bk-label">Начало приема</h3>
          <div className="bk-chips" role="radiogroup" aria-label="Начало приема">
            {starts.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={start === s}
                className={`bk-chip${start === s ? ' bk-chip--active' : ''}`}
                onClick={() => setStart(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="bk-hint bk-hint--inside">{start ? `Прием: ${start}–${endTime(start, a.duration)} · ${durationLabel(a.duration)}` : ''}</p>
        </section>
      ) : (
        <p className="bk-hint">Подходящих вариантов не осталось: предложите другое время.</p>
      )}
    </Frame>
  );
}

// ---------------------------------------------------------------- отказ и отмена

interface ReasonSheetProps {
  title: string;
  text: string;
  placeholder: string;
  back: string;
  confirm: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

/** Отказаться от предложения или отменить прием: пояснение, причина по желанию, красная кнопка */
export function ReasonSheet({ title, text, placeholder, back, confirm, onConfirm, onClose }: ReasonSheetProps) {
  const [reason, setReason] = useState('');
  return (
    <Frame
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sheet__button" onClick={onClose}>
            {back}
          </button>
          <button type="button" className="sheet__button sheet__button--danger" onClick={() => onConfirm(reason)}>
            {confirm}
          </button>
        </>
      }
    >
      <p className="bk-text">{text}</p>
      <section className="sheet__card bk-card">
        <AutoTextarea
          className="bk-textarea"
          rows={2}
          value={reason}
          onChange={setReason}
          placeholder={placeholder}
          aria-label="Причина"
          maxLength={300}
        />
      </section>
    </Frame>
  );
}

// ---------------------------------------------------------------- место приема

/** Адрес, как пройти и что принести */
export function PlaceSheet({ place, onSave, onClose }: { place: Place; onSave: (place: Place) => void; onClose: () => void }) {
  const uid = useId();
  const [address, setAddress] = useState(place.address);
  const [howTo, setHowTo] = useState(place.howTo);
  const [bring, setBring] = useState(place.bring);
  const canSave = address.trim().length > 0;
  return (
    <Frame
      title="Место приема"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sheet__button" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className="sheet__button sheet__button--primary"
            disabled={!canSave}
            onClick={() => onSave({ address, howTo, bring })}
          >
            Сохранить
          </button>
        </>
      }
    >
      <div>
        <section className="sheet__card bk-card">
          <label className="bk-label" htmlFor={`${uid}-address`}>
            Адрес
          </label>
          <AutoTextarea
            id={`${uid}-address`}
            className="bk-textarea"
            rows={1}
            value={address}
            onChange={(v) => setAddress(v.replace(/\n/g, ' '))}
            placeholder="Город, улица, дом"
            autoComplete="street-address"
          />
        </section>
        <p className="bk-hint">По адресу на карте ищется точка. Подробности вроде этажа и офиса лучше писать в «Как пройти».</p>
      </div>
      <section className="sheet__card bk-card">
        <label className="bk-label" htmlFor={`${uid}-howto`}>
          Как пройти
        </label>
        <AutoTextarea
          id={`${uid}-howto`}
          className="bk-textarea"
          rows={2}
          value={howTo}
          onChange={setHowTo}
          placeholder="Вход, этаж, домофон, ориентиры"
        />
      </section>
      <section className="sheet__card bk-card">
        <label className="bk-label" htmlFor={`${uid}-bring`}>
          Что принести
        </label>
        <AutoTextarea
          id={`${uid}-bring`}
          className="bk-textarea"
          rows={2}
          value={bring}
          onChange={setBring}
          placeholder="Документы, дневник, сменная обувь"
        />
      </section>
    </Frame>
  );
}

// ---------------------------------------------------------------- открыть в картах

/** Ссылки на карты: открываются в новой вкладке или в приложении карт, если оно установлено */
export function MapsSheet({ address, onClose }: { address: string; onClose: () => void }) {
  return (
    <Frame
      title="Открыть в картах"
      subtitle={address}
      onClose={onClose}
      footer={
        <button type="button" className="sheet__button" onClick={onClose}>
          Закрыть
        </button>
      }
    >
      <ul className="sheet__card bk-links">
        {MAP_LINKS.map(({ id, name, url }) => (
          <li key={id}>
            <a className="bk-link" href={url(address)} target="_blank" rel="noopener noreferrer" onClick={onClose}>
              <span>{name}</span>
              <IconExternal className="bk-link__icon" />
            </a>
          </li>
        ))}
      </ul>
    </Frame>
  );
}
