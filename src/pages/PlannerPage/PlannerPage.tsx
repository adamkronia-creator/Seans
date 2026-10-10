import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildAgenda, flagsOf, type AgendaItem, type Visit } from '../../data/agenda';
import { proposeTime, useBooking, type Outcome } from '../../data/appointments';
import { paragraphsToText } from '../../data/case';
import type { ChatSection } from '../../data/chatIntent';
import { CHATS } from '../../data/chats';
import { sessionRecords, useClientData } from '../../data/clientStore';
import {
  addPlan,
  canUnmark,
  markVisit,
  removePlan,
  saveDayNote,
  saveVisitComment,
  toggleDone,
  updatePlan,
  usePlanner,
  type Plan,
  type PlanInput,
} from '../../data/planner';
import { ClosedCard, NoteCard, OfferCard, TaskCard, VisitCard } from '../../components/Planner/AgendaCards';
import { MonthGrid } from '../../components/Planner/MonthGrid';
import { OutcomeSheet, PlanSheet } from '../../components/Planner/PlannerSheets';
import { ProposeSheet } from '../../components/ChatBooking/BookingSheets';
import { EditSheet } from '../../components/EditSheet/EditSheet';
import { IconBack, IconPlus } from '../../components/icons';
import { Toast } from '../../components/Toast/Toast';
import { addDays, dateKey, dayLong, dayRelative, dayShort, monthTitle, parseDate, startOfMonth } from '../../utils/ruDate';
import { useNow } from '../../utils/useNow';
import { useSwipeSegments } from '../../utils/swipeSegments';
import './PlannerPage.css';

type SheetState =
  | { kind: 'plan'; plan?: Plan }
  | { kind: 'note' }
  /** Окна сеанса держат только ключ: сеанс в них берется из распорядка заново, после отметки он уже другой */
  | { kind: 'comment' | 'outcome' | 'offer'; key: string };

const CLIENTS = CHATS.filter((c) => c.category === 'clients');
const chatOf = (id: string) => CHATS.find((c) => c.id === id);
const firstName = (id: string) => chatOf(id)?.name.split(' ')[0] ?? 'Клиент';

/**
 * «Ежедневник»: календарь месяца и распорядок выбранного дня — подтвержденные приемы, запланированные сеансы, дела
 * и заметки дня. Прошедшие приемы отмечаются «состоялся» / «не состоялся»; у состоявшегося сеанса есть комментарий,
 * и это тот же текст, что в «Истории взаимодействия» клиента.
 */
export function PlannerPage({ onOpenChat }: { onOpenChat: (chatId: string, section: ChatSection) => void }) {
  const now = useNow();
  const today = dateKey(now);
  const { items: appointments } = useBooking();
  const client = useClientData();
  const planner = usePlanner();
  const [selected, setSelected] = useState(today);
  // На невысоком экране календарь сразу сворачивается до недели: иначе под ним почти не остается места
  const [compact, setCompact] = useState(() => window.innerHeight < 720);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number>();
  const scroller = useRef<HTMLDivElement>(null);
  // Свайп по распорядку листает дни: влево — следующий, вправо — предыдущий
  useSwipeSegments(scroller, { index: 1, count: 3, onIndex: (i) => setSelected((day) => dateKey(addDays(parseDate(day), i - 1))) });

  const say = useCallback((text: string) => {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const records = useMemo(() => sessionRecords(client), [client]);
  const source = useMemo(() => ({ appointments, plans: planner.plans, records, now }), [appointments, planner.plans, records, now]);
  const agenda = useMemo(() => buildAgenda(selected, source), [selected, source]);
  const flags = useCallback((key: string) => flagsOf(buildAgenda(key, source), key in planner.notes), [source, planner.notes]);

  // Новый день открывается с начала списка
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [selected]);

  const month = parseDate(selected);

  // Стрелки: в календаре месяца — месяц (выбирается его первый день, а в текущем — сегодня), в свернутом — неделя
  const step = (dir: -1 | 1) => {
    if (compact) {
      setSelected(dateKey(addDays(month, 7 * dir)));
      return;
    }
    const target = new Date(month.getFullYear(), month.getMonth() + dir, 1);
    setSelected(dateKey(startOfMonth(now)) === dateKey(target) ? today : dateKey(target));
  };

  // ——— действия над сеансами ———
  const visits = useMemo(() => agenda.flatMap((i) => (i.type === 'visit' ? [i.visit] : [])), [agenda]);
  const visitOf = (key: string) => visits.find((v) => v.key === key);
  const sessionOf = (v: Visit) => (v.sessionId ? client.sessions.find((x) => x.id === v.sessionId) : undefined);
  const commentOf = (v: Visit) => (v.sessionId ? paragraphsToText(sessionOf(v)?.paragraphs ?? []) : (planner.comments[v.key] ?? ''));

  const closeSheet = useCallback(() => setSheet(null), []);

  const onMark = (visit: Visit, outcome: Outcome) => {
    markVisit(visit, outcome);
    if (outcome === 'held') {
      // Сразу предлагаем записать, как прошел сеанс
      setSheet({ kind: 'comment', key: visit.key });
      if (visit.chatId === 'maxim') say('Сеанс добавлен в историю клиента');
    } else {
      say('Отмечено: не состоялся');
    }
  };

  const onPick = (visit: Visit, outcome: Outcome | null) => {
    markVisit(visit, outcome);
    if (outcome === 'held') {
      setSheet({ kind: 'comment', key: visit.key });
    } else {
      closeSheet();
      say(outcome === 'missed' ? 'Отмечено: не состоялся' : 'Отметка снята');
    }
  };

  const savePlan = (editing: Plan | undefined, input: PlanInput) => {
    if (editing) {
      updatePlan(editing.id, { date: input.date, time: input.time, title: input.title, chatId: input.chatId, duration: input.duration });
    } else {
      addPlan(input);
    }
    closeSheet();
    // Запись могла уйти на другой день: переходим к нему, чтобы ее было видно
    if (input.date !== selected) setSelected(input.date);
    say(editing ? 'Запись обновлена' : 'Запись добавлена');
  };

  const renderItem = (item: AgendaItem) => {
    switch (item.type) {
      case 'visit': {
        const v = item.visit;
        return (
          <VisitCard
            key={item.id}
            visit={v}
            chat={chatOf(v.chatId)}
            number={sessionOf(v)?.number}
            comment={commentOf(v)}
            onMark={onMark}
            onOutcome={(x) => setSheet({ kind: 'outcome', key: x.key })}
            onComment={(x) => setSheet({ kind: 'comment', key: x.key })}
            onOffer={(x) => setSheet({ kind: 'offer', key: x.key })}
            onEdit={(x) => setSheet({ kind: 'plan', plan: x.plan })}
            onOpenChat={onOpenChat}
          />
        );
      }
      case 'offer':
        return <OfferCard key={item.id} appointment={item.appointment} chat={chatOf(item.appointment.chatId)} onOpenChat={onOpenChat} />;
      case 'closed':
        return <ClosedCard key={item.id} appointment={item.appointment} chat={chatOf(item.appointment.chatId)} now={now} onOpenChat={onOpenChat} />;
      case 'task':
        return <TaskCard key={item.id} plan={item.plan} onToggle={(p) => toggleDone(p.id)} onEdit={(p) => setSheet({ kind: 'plan', plan: p })} />;
    }
  };

  const target = sheet && 'key' in sheet ? visitOf(sheet.key) : undefined;
  const targetChat = target ? chatOf(target.chatId) : undefined;
  const targetNumber = target ? sessionOf(target)?.number : undefined;

  return (
    <section className="planner">
      <header className="screen-header planner__header">
        <div className="screen-header__top">
          <h1 className="screen-header__title">Ежедневник</h1>
          <div className="screen-header__side">
            <button
              type="button"
              className={`planner__today${selected === today ? ' planner__today--hidden' : ''}`}
              tabIndex={selected === today ? -1 : 0}
              onClick={() => setSelected(today)}
            >
              Сегодня
            </button>
          </div>
        </div>

        <div className="planner__nav">
          <h2 className="planner__month">{monthTitle(month)}</h2>
          <div className="planner__arrows">
            <button type="button" className="planner__arrow" aria-label={compact ? 'Предыдущая неделя' : 'Предыдущий месяц'} onClick={() => step(-1)}>
              <IconBack />
            </button>
            <button type="button" className="planner__arrow planner__arrow--next" aria-label={compact ? 'Следующая неделя' : 'Следующий месяц'} onClick={() => step(1)}>
              <IconBack />
            </button>
          </div>
        </div>

        <MonthGrid month={month} selected={selected} today={today} compact={compact} flags={flags} onSelect={setSelected} />

        <button
          type="button"
          className="planner__handle"
          aria-label={compact ? 'Показать месяц' : 'Свернуть до недели'}
          aria-expanded={!compact}
          onClick={() => setCompact((v) => !v)}
        >
          <span />
        </button>
      </header>

      <div ref={scroller} className="planner__scroll">
        <div className="planner__day-head">
          <h2 className="planner__day-title">{dayLong(selected, now)}</h2>
          <span className="planner__day-rel">{dayRelative(selected, now)}</span>
        </div>

        {agenda.length > 0 ? (
          <ul className="planner__list">{agenda.map(renderItem)}</ul>
        ) : (
          <p className="planner__empty">На этот день ничего не запланировано</p>
        )}

        <NoteCard text={planner.notes[selected] ?? ''} onEdit={() => setSheet({ kind: 'note' })} />
      </div>

      <button type="button" className="planner__fab" aria-label="Добавить запись" onClick={() => setSheet({ kind: 'plan' })}>
        <IconPlus />
      </button>

      {toast && <Toast text={toast} />}

      {sheet?.kind === 'plan' && (
        <PlanSheet
          key={sheet.plan?.id ?? 'new'}
          plan={sheet.plan}
          day={selected}
          now={now}
          clients={CLIENTS}
          onSave={(input) => savePlan(sheet.plan, input)}
          onRemove={
            sheet.plan
              ? () => {
                  removePlan(sheet.plan!.id);
                  closeSheet();
                  say('Запись удалена');
                }
              : undefined
          }
          onClose={closeSheet}
        />
      )}

      {sheet?.kind === 'note' && (
        <EditSheet
          heading="Заметки дня"
          initial={{ text: planner.notes[selected] ?? '' }}
          textPlaceholder="Мысли, наблюдения, план на день"
          onClose={closeSheet}
          onSave={({ text = '' }) => {
            saveDayNote(selected, text);
            closeSheet();
            say(text.trim() ? 'Заметка сохранена' : 'Заметка удалена');
          }}
        />
      )}

      {sheet?.kind === 'comment' && target && (
        <EditSheet
          key={target.key}
          heading={`Комментарий к сеансу${targetNumber ? ` №${targetNumber}` : ''}`}
          initial={{ text: commentOf(target) }}
          textPlaceholder="Что произошло на сеансе"
          onClose={closeSheet}
          onSave={({ text = '' }) => {
            saveVisitComment(target, text);
            closeSheet();
            say(text.trim() ? 'Комментарий сохранен' : 'Комментарий удален');
          }}
        />
      )}

      {sheet?.kind === 'outcome' && target && (
        <OutcomeSheet
          subtitle={`${targetChat?.name ?? 'Клиент'} · ${dayShort(target.date, now)}, ${target.start ?? ''}`}
          current={target.state === 'held' ? 'held' : target.state === 'missed' ? 'missed' : undefined}
          canChange={canUnmark(target)}
          onPick={(outcome) => onPick(target, outcome)}
          onClose={closeSheet}
        />
      )}

      {sheet?.kind === 'offer' && target?.plan && target.plan.chatId && (
        <ProposeSheet
          mode="new"
          peerName={firstName(target.chatId)}
          now={now}
          initial={{ slot: { kind: 'exact', date: target.date, start: target.start ?? '18:00' }, duration: target.plan.duration ?? 50 }}
          onSubmit={(input) => {
            const id = proposeTime(target.chatId, input);
            updatePlan(target.plan!.id, { offeredAs: id });
            closeSheet();
            // Предложение живет на своем дне: переходим к нему, чтобы оно было видно
            if (input.slot.date !== selected) setSelected(input.slot.date);
            say('Предложение отправлено');
          }}
          onClose={closeSheet}
        />
      )}
    </section>
  );
}
