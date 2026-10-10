import { Badge } from '../Badge/Badge';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  acceptProposal,
  cancelAppointment,
  counterProposal,
  declineProposal,
  editProposal,
  proposeTime,
  saveInfo,
  useBooking,
  viewOf,
  remindNow,
  withdrawProposal,
  type Appointment,
} from '../../data/appointments';
import { useNow } from '../../utils/useNow';
import { Toast } from '../Toast/Toast';
import { AppointmentCard, HistoryList, type CardAction } from './AppointmentCard';
import { EmptyState } from '../EmptyState/EmptyState';
import { InfoSheet, MapsSheet, newDraft, ProposeSheet, RangeSheet, ReasonSheet, rescheduleDraft } from './BookingSheets';
import { slotShort } from './bookingText';
import { InfoCard } from './InfoCard';
import './ChatBooking.css';

type SheetState =
  | { kind: 'propose' | 'info' | 'maps' }
  | { kind: 'reschedule' | 'counter' | 'edit' | 'range' | 'decline' | 'cancel'; a: Appointment };

/** Сколько записей истории видно, пока список не раскрыт */
const HISTORY_SHOWN = 3;

function Section({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count?: number;
  action?: { label: string; onClick: () => void };
  children: ReactNode;
}) {
  return (
    <section className="booking__section">
      <div className="booking__heading">
        <h2 className="booking__title">{title}</h2>
        {count !== undefined && <Badge count={count} variant="neutral" showZero ariaLabel={`Всего: ${count}`} />}
        {action && (
          <button type="button" className="booking__link" onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

interface ChatBookingProps {
  chatId: string;
  /** Имя собеседника без фамилии: «Максим» */
  peerName: string;
}

/**
 * Вкладка «Запись на прием» в открытом чате. Любая сторона предлагает время (точное или промежуток), другая соглашается,
 * отказывается или отвечает своим временем; подтвержденный прием можно перенести или отменить. Ниже информация о приеме:
 * адрес с картой, как пройти, что принести и оплата сеанса.
 */
export function ChatBooking({ chatId, peerName }: ChatBookingProps) {
  const { items, info } = useBooking();
  const now = useNow();
  const view = useMemo(() => viewOf(items, chatId, now), [items, chatId, now]);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [allHistory, setAllHistory] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number>();

  const closeSheet = useCallback(() => setSheet(null), []);
  const say = useCallback((text: string) => {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const pending = [...view.incoming, ...view.outgoing];
  const nothingPlanned = view.upcoming.length === 0 && pending.length === 0;
  const history = allHistory ? view.past : view.past.slice(0, HISTORY_SHOWN);

  const onAction = (action: CardAction, a: Appointment) => {
    if (action === 'remind') {
      remindNow(a.id);
      say('Напоминание отправлено');
    } else if (action === 'withdraw') {
      withdrawProposal(a.id);
      say('Предложение отозвано');
    } else if (action === 'accept' && a.slot.kind === 'exact') {
      acceptProposal(a.id);
      say(a.replaces ? 'Прием перенесен' : 'Прием подтвержден');
    } else {
      // Промежуток принимается через выбор начала
      setSheet({ kind: action === 'accept' ? 'range' : action, a });
    }
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(info.address);
      say('Адрес скопирован');
    } catch {
      say('Не удалось скопировать');
    }
  };

  const confirmedAt = (id?: string) => items.find((x) => x.id === id);

  return (
    <div className="booking">
      <div className="booking__scroll">
        {nothingPlanned && (
          <div className="booking__empty">
            <EmptyState
              compact
              art="dyad"
             
              title={view.past.length > 0 ? 'Ближайших приемов нет' : 'Приема пока нет'}
              text="Нажмите «Предложить время» внизу или дождитесь предложения от собеседника."
            />
          </div>
        )}

        {view.upcoming.length > 0 && (
          <Section title="Предстоящие" count={view.upcoming.length}>
            <ul className="booking__list">
              {view.upcoming.map((a, i) => (
                <AppointmentCard
                  key={a.id}
                  a={a}
                  peerName={peerName}
                  now={now}
                  nearest={i === 0}
                  moving={pending.some((p) => p.replaces === a.id)}
                  onAction={onAction}
                />
              ))}
            </ul>
          </Section>
        )}

        {pending.length > 0 && (
          <Section title="Предложения" count={pending.length}>
            <ul className="booking__list">
              {pending.map((a) => (
                <AppointmentCard key={a.id} a={a} peerName={peerName} now={now} replaced={confirmedAt(a.replaces)} onAction={onAction} />
              ))}
            </ul>
          </Section>
        )}

        <Section title="Информация о приеме" action={{ label: 'Изменить', onClick: () => setSheet({ kind: 'info' }) }}>
          <InfoCard info={info} onCopy={() => void copyAddress()} onMaps={() => setSheet({ kind: 'maps' })} />
        </Section>

        {view.past.length > 0 && (
          <Section title="История" count={view.past.length}>
            <div className="history-card">
              <HistoryList items={history} peerName={peerName} now={now} />
              {view.past.length > HISTORY_SHOWN && (
                <button type="button" className="history__more" aria-expanded={allHistory} onClick={() => setAllHistory((v) => !v)}>
                  {allHistory ? 'Свернуть' : `Показать все (${view.past.length})`}
                </button>
              )}
            </div>
          </Section>
        )}
      </div>

      <div className="booking__cta">
        <button type="button" className="booking__cta-button" onClick={() => setSheet({ kind: 'propose' })}>
          Предложить время
        </button>
      </div>

      {toast && <Toast text={toast} />}

      {sheet?.kind === 'propose' && (
        <ProposeSheet
          mode="new"
          peerName={peerName}
          now={now}
          initial={newDraft(now)}
          onSubmit={(input) => {
            proposeTime(chatId, input);
            closeSheet();
            say('Предложение отправлено');
          }}
          onClose={closeSheet}
        />
      )}
      {sheet?.kind === 'reschedule' && (
        <ProposeSheet
          mode="reschedule"
          peerName={peerName}
          now={now}
          initial={rescheduleDraft(sheet.a)}
          subtitle={`Сейчас: ${slotShort(sheet.a.slot, sheet.a.duration, now)}`}
          onSubmit={(input) => {
            proposeTime(chatId, { ...input, replaces: sheet.a.id });
            closeSheet();
            say('Предложение о переносе отправлено');
          }}
          onClose={closeSheet}
        />
      )}
      {sheet?.kind === 'counter' && (
        <ProposeSheet
          mode="counter"
          peerName={peerName}
          now={now}
          initial={{ slot: sheet.a.slot, duration: sheet.a.duration }}
          subtitle={`${peerName} предложил: ${slotShort(sheet.a.slot, sheet.a.duration, now)}`}
          onSubmit={(input) => {
            counterProposal(sheet.a.id, input);
            closeSheet();
            say('Другое время отправлено');
          }}
          onClose={closeSheet}
        />
      )}
      {sheet?.kind === 'edit' && (
        <ProposeSheet
          mode="edit"
          peerName={peerName}
          now={now}
          initial={{ slot: sheet.a.slot, duration: sheet.a.duration, comment: sheet.a.comment }}
          onSubmit={(input) => {
            editProposal(sheet.a.id, input);
            closeSheet();
            say('Предложение обновлено');
          }}
          onClose={closeSheet}
        />
      )}
      {sheet?.kind === 'range' && (
        <RangeSheet
          a={sheet.a}
          peerName={peerName}
          now={now}
          onSubmit={(start) => {
            acceptProposal(sheet.a.id, start);
            closeSheet();
            say(sheet.a.replaces ? 'Прием перенесен' : 'Прием подтвержден');
          }}
          onClose={closeSheet}
        />
      )}
      {sheet?.kind === 'decline' && (
        <ReasonSheet
          title={sheet.a.replaces ? 'Отклонить перенос?' : 'Отказаться от приема?'}
          text={
            sheet.a.replaces
              ? `Прием останется на прежнем времени: ${slotShort(confirmedAt(sheet.a.replaces)?.slot ?? sheet.a.slot, sheet.a.duration, now)}. ${peerName} получит отказ.`
              : `${peerName} получит отказ. Причину можно не указывать.`
          }
          placeholder="Причина (необязательно)"
          back="Назад"
          confirm={sheet.a.replaces ? 'Отклонить' : 'Отказаться'}
          onConfirm={(reason) => {
            declineProposal(sheet.a.id, reason);
            closeSheet();
            say(sheet.a.replaces ? 'Перенос отклонен' : 'Вы отказались от приема');
          }}
          onClose={closeSheet}
        />
      )}
      {sheet?.kind === 'cancel' && (
        <ReasonSheet
          title="Отменить прием?"
          text={`Прием ${slotShort(sheet.a.slot, sheet.a.duration, now)} будет отменен, ${peerName} получит уведомление.`}
          placeholder="Причина (необязательно)"
          back="Не отменять"
          confirm="Отменить прием"
          onConfirm={(reason) => {
            cancelAppointment(sheet.a.id, reason);
            closeSheet();
            say('Прием отменен');
          }}
          onClose={closeSheet}
        />
      )}
      {sheet?.kind === 'info' && (
        <InfoSheet
          info={info}
          onSave={(next) => {
            saveInfo(next);
            closeSheet();
            say('Информация о приеме сохранена');
          }}
          onClose={closeSheet}
        />
      )}
      {sheet?.kind === 'maps' && <MapsSheet address={info.address} onClose={closeSheet} />}
    </div>
  );
}
