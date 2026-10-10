import { bounds, phaseOf, type Appointment, type Outcome } from './appointments';
import { CLIENT_CHAT, type SessionRecord } from './clientStore';
import type { Plan } from './planner';
import { fromMinutes, toMinutes } from '../utils/ruDate';

/*
 * Распорядок дня «Ежедневника»: из приемов (запись на прием), запланированных сеансов, сеансов в истории клиента и дел
 * собирается один список на день. Ничего не копируется: список строится заново из этих данных, поэтому правка
 * в любом месте (в чате, в истории, здесь) видна сразу везде.
 */

/**
 * Где сеанс сейчас:
 * planned — запланирован, клиенту не предложен; upcoming — прием подтвержден, ещё не начался;
 * now — идет; await — время вышло, отметки нет; held — состоялся; missed — не состоялся
 */
export type VisitState = 'planned' | 'upcoming' | 'now' | 'await' | 'held' | 'missed';

export interface Visit {
  /** Устойчивый ключ: «appt:ap1», «plan:p3», «rec:s3» */
  key: string;
  /** Откуда сеанс: подтвержденный прием, запланированный сеанс или запись в истории клиента без приема */
  source: 'appointment' | 'plan' | 'record';
  chatId: string;
  date: string;
  start?: string;
  end?: string;
  state: VisitState;
  /** Запись о сеансе в истории клиента (есть у состоявшихся) */
  sessionId?: string;
  appointment?: Appointment;
  plan?: Plan;
}

export type AgendaItem =
  | { type: 'visit'; id: string; sort: number; visit: Visit }
  /** Предложение времени, на которое ещё не ответили (ваше или клиента) */
  | { type: 'offer'; id: string; sort: number; appointment: Appointment }
  /** Отмененный или перенесенный прием: для памяти, действий нет */
  | { type: 'closed'; id: string; sort: number; appointment: Appointment }
  | { type: 'task'; id: string; sort: number; plan: Plan };

export interface AgendaSource {
  appointments: Appointment[];
  plans: Plan[];
  /** Сеансы из истории клиента */
  records: SessionRecord[];
  now: Date;
}

/** Дела без времени идут после всего, что привязано к часам */
const UNTIMED = 24 * 60;

function stateOf(start: Date, end: Date, now: Date, outcome: Outcome | undefined, before: VisitState): VisitState {
  if (outcome === 'held') return 'held';
  if (outcome === 'missed') return 'missed';
  if (now.getTime() < start.getTime()) return before;
  return now.getTime() < end.getTime() ? 'now' : 'await';
}

/** Предложенный клиенту сеанс живет в записи на прием; пока предложение в силе, здесь его повторять не нужно */
function offered(plan: Plan, byId: Map<string, Appointment>, now: Date): boolean {
  const a = plan.offeredAs ? byId.get(plan.offeredAs) : undefined;
  if (!a) return false;
  return a.status === 'confirmed' || a.status === 'moved' || (a.status === 'proposed' && phaseOf(a, now) === 'open');
}

const startOf = (a: Appointment) => (a.slot.kind === 'exact' ? a.slot.start : a.slot.from);

/** Всё, что на указанный день, по порядку времени */
export function buildAgenda(day: string, { appointments, plans, records, now }: AgendaSource): AgendaItem[] {
  const items: AgendaItem[] = [];
  const byId = new Map(appointments.map((a) => [a.id, a]));
  const linked = new Set<string>();

  for (const a of appointments) {
    if (a.sessionId) linked.add(a.sessionId);
    if (a.slot.date !== day) continue;
    if (a.status === 'confirmed') {
      const { start, end } = bounds(a);
      const startTime = startOf(a);
      items.push({
        type: 'visit',
        id: `appt:${a.id}`,
        sort: toMinutes(startTime),
        visit: {
          key: `appt:${a.id}`,
          source: 'appointment',
          chatId: a.chatId,
          date: day,
          start: startTime,
          end: fromMinutes(Math.min(toMinutes(startTime) + a.duration, 24 * 60 - 1)),
          state: stateOf(start, end, now, a.outcome, 'upcoming'),
          sessionId: a.sessionId,
          appointment: a,
        },
      });
    } else if (a.status === 'proposed' && phaseOf(a, now) === 'open') {
      items.push({ type: 'offer', id: `offer:${a.id}`, sort: toMinutes(startOf(a)), appointment: a });
    } else if (a.status === 'cancelled' || a.status === 'moved') {
      items.push({ type: 'closed', id: `closed:${a.id}`, sort: toMinutes(startOf(a)), appointment: a });
    }
  }

  for (const p of plans) {
    if (p.sessionId) linked.add(p.sessionId);
    if (p.date !== day) continue;
    if (p.kind === 'task') {
      items.push({ type: 'task', id: `task:${p.id}`, sort: p.time ? toMinutes(p.time) : UNTIMED, plan: p });
    } else if (p.time && p.chatId && !offered(p, byId, now)) {
      const duration = p.duration ?? 50;
      const startMin = toMinutes(p.time);
      const [y, m, d] = day.split('-').map(Number);
      const start = new Date(y, m - 1, d, 0, startMin);
      const end = new Date(y, m - 1, d, 0, startMin + duration);
      items.push({
        type: 'visit',
        id: `plan:${p.id}`,
        sort: startMin,
        visit: {
          key: `plan:${p.id}`,
          source: 'plan',
          chatId: p.chatId,
          date: day,
          start: p.time,
          end: fromMinutes(Math.min(startMin + duration, 24 * 60 - 1)),
          state: stateOf(start, end, now, p.outcome, 'planned'),
          sessionId: p.sessionId,
          plan: p,
        },
      });
    }
  }

  // Сеансы из истории клиента, к которым не привязан ни прием, ни запланированный сеанс (прошли до «Ежедневника»)
  for (const r of records) {
    if (r.date !== day || linked.has(r.id)) continue;
    items.push({
      type: 'visit',
      id: `rec:${r.id}`,
      sort: -1,
      visit: { key: `rec:${r.id}`, source: 'record', chatId: CLIENT_CHAT, date: day, state: 'held', sessionId: r.id },
    });
  }

  return items.sort((x, y) => x.sort - y.sort);
}

/** Что отметить точкой в календаре */
export interface DayFlags {
  /** Есть сеансы или предложения времени */
  visits: number;
  /** Есть дела */
  tasks: number;
  note: boolean;
}

export function flagsOf(items: AgendaItem[], hasNote: boolean): DayFlags {
  return {
    visits: items.filter((i) => i.type === 'visit' || i.type === 'offer').length,
    tasks: items.filter((i) => i.type === 'task').length,
    note: hasNote,
  };
}
