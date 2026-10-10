import type { ComponentType, SVGProps } from 'react';
import { bounds, phaseOf, type Appointment } from '../../data/appointments';
import { dayLong, dayShort, untilDay } from '../../utils/ruDate';
import { IconBookingCancelled, IconBookingDone, IconBookingMoved, IconBookingPending } from '../icons';
import { slotDetail, slotShort, slotTime } from './bookingText';

export type CardAction = 'reschedule' | 'cancel' | 'accept' | 'counter' | 'decline' | 'edit' | 'withdraw' | 'remind';

interface CardProps {
  a: Appointment;
  peerName: string;
  now: Date;
  /** Для переноса: прием, который он заменит */
  replaced?: Appointment;
  /** Для подтвержденного приема: уже есть предложение о его переносе */
  moving?: boolean;
  /** Ближайший из подтвержденных */
  nearest?: boolean;
  onAction: (action: CardAction, a: Appointment) => void;
}

type Tone = 'green' | 'accent' | 'yellow';

/** Карточка приема: подтвержденного или предложения (входящего и своего). Кнопки зависят от состояния */
export function AppointmentCard({ a, peerName, now, replaced, moving, nearest, onAction }: CardProps) {
  const confirmed = a.status === 'confirmed';
  const incoming = a.status === 'proposed' && a.by === 'them';
  const range = a.slot.kind === 'range';

  let tone: Tone;
  let eyebrow: string;
  if (confirmed) {
    tone = 'green';
    const started = bounds(a).start.getTime() <= now.getTime();
    eyebrow = `${nearest ? 'Ближайший прием' : 'Прием'} · ${started ? 'идет сейчас' : untilDay(a.slot.date, now)}`;
  } else if (incoming) {
    tone = 'accent';
    eyebrow = a.replaces
      ? `${peerName} просит перенести прием`
      : a.countered
        ? `${peerName} предлагает другое время`
        : range
          ? `${peerName} предлагает выбрать время`
          : `${peerName} предлагает время`;
  } else {
    tone = 'yellow';
    eyebrow = a.replaces ? 'Вы предложили перенос' : a.countered ? 'Вы предложили другое время' : 'Вы предложили время';
  }

  const run = (action: CardAction) => () => onAction(action, a);

  return (
    <li className="appt">
      <div className="appt__body">
        <p className={`appt__eyebrow appt__eyebrow--${tone}`}>{eyebrow}</p>
        <div>
          <h3 className="appt__date">{dayLong(a.slot.date, now)}</h3>
          <p className="appt__time">{slotDetail(a.slot, a.duration)}</p>
        </div>
        {replaced && <p className="appt__note">Сейчас: {slotShort(replaced.slot, replaced.duration, now)}</p>}
        {a.comment && <blockquote className="appt__quote">{a.comment}</blockquote>}
        {!incoming && !confirmed && <p className="appt__note">Ждем ответа · {peerName}</p>}
        {moving && <p className="appt__note">Идет согласование переноса: ответьте в предложениях ниже</p>}

        {confirmed && (
          <p className="appt__note">Напоминание клиенту уйдет за час до начала</p>
        )}

        <div className="bk-actions">
          {confirmed && (
            <button type="button" className="bk-button" onClick={run('remind')}>
              Напомнить
            </button>
          )}
          {confirmed && !moving && (
            <button type="button" className="bk-button" onClick={run('reschedule')}>
              Перенести
            </button>
          )}
          {confirmed && (
            <button type="button" className="bk-button bk-button--danger" onClick={run('cancel')}>
              Отменить
            </button>
          )}
          {incoming && (
            <>
              <button type="button" className="bk-button bk-button--primary" onClick={run('accept')}>
                {range ? 'Выбрать время' : 'Принять'}
              </button>
              <button type="button" className="bk-button" onClick={run('counter')}>
                Другое время
              </button>
            </>
          )}
          {!incoming && !confirmed && (
            <>
              <button type="button" className="bk-button" onClick={run('edit')}>
                Изменить
              </button>
              <button type="button" className="bk-button bk-button--danger" onClick={run('withdraw')}>
                Отозвать
              </button>
            </>
          )}
        </div>
      </div>
      {incoming && (
        <div className="appt__foot">
          <button type="button" className="appt__foot-button" onClick={run('decline')}>
            Отказаться
          </button>
        </div>
      )}
    </li>
  );
}

interface HistoryInfo {
  status: string;
  /** Цвет подписи и значка: состоялся — зеленый, отказ и отмена — красный, остальное — серый */
  tone: 'green' | 'red' | 'gray';
  /** Значок статуса: по форме видно, чем закончилось, даже без цвета */
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  sub?: string;
}

/** Подпись, цвет и значок строки истории */
function historyInfo(a: Appointment, now: Date, peerName: string): HistoryInfo {
  const who = a.closedBy === 'me' ? 'вы' : peerName;
  switch (a.status) {
    case 'confirmed':
      // Отметка из «Ежедневника»: без нее прошедший прием считается состоявшимся
      return a.outcome === 'missed'
        ? { status: 'Не состоялся', tone: 'red', Icon: IconBookingCancelled }
        : { status: 'Состоялся', tone: 'green', Icon: IconBookingDone };
    case 'cancelled':
      return { status: `Отменен · ${who}`, tone: 'red', Icon: IconBookingCancelled, sub: a.reason };
    case 'declined':
      return { status: `${a.replaces ? 'Перенос отклонен' : 'Отказ'} · ${who}`, tone: 'red', Icon: IconBookingCancelled, sub: a.reason };
    case 'moved':
      return {
        status: 'Перенесен',
        tone: 'gray',
        Icon: IconBookingMoved,
        sub: a.movedTo ? `На ${dayShort(a.movedTo.date, now)}, ${a.movedTo.start}` : undefined,
      };
    default:
      return { status: 'Не согласован', tone: 'gray', Icon: IconBookingPending, sub: phaseOf(a, now) === 'expired' ? 'Время прошло' : undefined };
  }
}

/** История: что состоялось, отменено, перенесено. Одна белая карточка со строками: значок статуса и три строки текста */
export function HistoryList({ items, peerName, now }: { items: Appointment[]; peerName: string; now: Date }) {
  return (
    <ul className="history">
      {items.map((a) => {
        const { status, tone, Icon, sub } = historyInfo(a, now, peerName);
        return (
          <li key={a.id} className="history__row">
            <Icon className={`history__icon history__icon--${tone}`} aria-hidden="true" />
            <div className="history__body">
              <p className={`history__status history__status--${tone}`}>{status}</p>
              <p className="history__when">
                {dayShort(a.slot.date, now)} · {slotTime(a.slot, a.duration)}
              </p>
              {sub && <p className="history__sub">{a.status === 'cancelled' || a.status === 'declined' ? `«${sub}»` : sub}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
