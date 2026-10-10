import { useSyncExternalStore } from 'react';
import { addDays, dateKey, startOfDay } from '../utils/ruDate';
import { markAppointment, type Outcome } from './appointments';
import { textToParagraphs } from './case';
import { CLIENT_CHAT, readClientData, registerSession, removeSession, updateSessionText } from './clientStore';
import type { Visit } from './agenda';

/*
 * «Ежедневник»: свои записи психолога (дела и запланированные сеансы) и заметки дней.
 * Приемы берутся из записи на прием (data/appointments.ts), сеансы — из истории клиента (data/clientStore.ts);
 * здесь они не копируются, а собираются на день в data/agenda.ts. Отметка о приеме и комментарий к сеансу пишутся
 * прямо в эти данные, поэтому в истории взаимодействия видны сразу.
 *
 * Данные только в памяти: после перезагрузки страницы возвращаются исходные.
 */

export type PlanKind = 'task' | 'session';

export interface Plan {
  id: string;
  kind: PlanKind;
  /** День: «2026-10-15» */
  date: string;
  /** Время: «18:00». У дела можно не указывать — тогда оно «на день» */
  time?: string;
  /** Дело: что сделать. У сеанса пусто, он называется по клиенту */
  title: string;
  /** Дело выполнено */
  done: boolean;
  /** Сеанс: чат клиента и длительность */
  chatId?: string;
  duration?: number;
  /** Сеанс: отметка после него и запись в истории клиента, если он состоялся */
  outcome?: Outcome;
  sessionId?: string;
  /** Сеанс, который предложили клиенту: id предложения в записи на прием */
  offeredAs?: string;
}

interface PlannerState {
  plans: Plan[];
  /** Заметка дня: день → текст в мини-разметке */
  notes: Record<string, string>;
  /** Комментарии к приемам клиентов, у которых нет истории в кейсе: ключ приема → текст */
  comments: Record<string, string>;
}

// ---------------------------------------------------------------- исходные данные

let counter = 0;
const nextId = () => `p${++counter}`;

/** Дни считаются от сегодняшнего, чтобы раздел не пустовал, когда его ни откроешь */
function seed(): PlannerState {
  const today = startOfDay(new Date());
  const day = (n: number) => dateKey(addDays(today, n));
  // Ближайший четверг не раньше чем через два дня: в записи на прием на него стоит сеанс Максима
  let thursday = addDays(today, 2);
  while (thursday.getDay() !== 4) thursday = addDays(thursday, 1);
  const task = (date: string, title: string, time?: string, done = false): Plan => ({
    id: nextId(),
    kind: 'task',
    date,
    ...(time ? { time } : {}),
    title,
    done,
  });
  const session = (date: string, time: string, chatId: string): Plan => ({
    id: nextId(),
    kind: 'session',
    date,
    time,
    title: '',
    done: false,
    chatId,
    duration: 50,
  });
  return {
    plans: [
      // Вчерашний сеанс без отметки: показывает, как его отметить и записать комментарий
      session(day(-1), '17:00', 'vera'),
      task(day(-1), 'Отправить Максиму опросник', '10:00', true),
      task(day(0), 'Заполнить журнал за неделю', '12:00'),
      task(day(0), 'Ответить Богдану по семинару'),
      task(day(1), 'Подобрать задания для Веры'),
      task(dateKey(thursday), 'Супервизия', '12:30'),
      session(dateKey(thursday), '16:00', 'vera'),
    ],
    notes: {
      [day(-1)]: 'Итоги дня: **отметить сеанс** и дописать комментарий.\n\n• Вера просила встречаться раньше\n• Обсудить условия оплаты',
    },
    comments: {},
  };
}

let state: PlannerState = seed();
const listeners = new Set<() => void>();

function commit(next: PlannerState) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const usePlanner = () => useSyncExternalStore(subscribe, () => state);

// ---------------------------------------------------------------- дела и запланированные сеансы

export type PlanInput = Pick<Plan, 'kind' | 'date' | 'title'> & Partial<Pick<Plan, 'time' | 'chatId' | 'duration'>>;

export function addPlan(input: PlanInput): string {
  const id = nextId();
  const plan: Plan = {
    id,
    kind: input.kind,
    date: input.date,
    title: input.kind === 'task' ? input.title.trim() : '',
    done: false,
    ...(input.time ? { time: input.time } : {}),
    ...(input.kind === 'session' ? { chatId: input.chatId, duration: input.duration } : {}),
  };
  commit({ ...state, plans: [...state.plans, plan] });
  return id;
}

export function updatePlan(id: string, patch: Partial<Omit<Plan, 'id' | 'kind'>>) {
  commit({
    ...state,
    plans: state.plans.map((p) => {
      if (p.id !== id) return p;
      const next = { ...p, ...patch };
      if (patch.title !== undefined) next.title = patch.title.trim();
      // Без времени дело остаётся «на день»
      if ('time' in patch && !patch.time) delete next.time;
      return next;
    }),
  });
}

export function removePlan(id: string) {
  const plan = state.plans.find((p) => p.id === id);
  // Вместе с сеансом без текста уходит и его запись в истории
  if (plan?.sessionId && isEmptySession(plan.sessionId)) removeSession(plan.sessionId);
  commit({ ...state, plans: state.plans.filter((p) => p.id !== id) });
}

export function toggleDone(id: string) {
  commit({ ...state, plans: state.plans.map((p) => (p.id === id ? { ...p, done: !p.done } : p)) });
}

// ---------------------------------------------------------------- заметки дня

/** Пустой текст убирает заметку */
export function saveDayNote(day: string, text: string) {
  const notes = { ...state.notes };
  if (text.trim()) notes[day] = text.trim();
  else delete notes[day];
  commit({ ...state, notes });
}

// ---------------------------------------------------------------- отметка о приеме и комментарий к сеансу

/** У сеанса в истории нет текста: такую запись можно убрать без потери заметок */
const isEmptySession = (id: string) => {
  const session = readClientData().sessions.find((x) => x.id === id);
  return !session || session.paragraphs.length === 0;
};

/** Можно ли снять отметку «состоялся»: пока у сеанса есть текст, снять нельзя — он остался бы в истории без приема */
export function canUnmark(visit: Visit): boolean {
  return !visit.sessionId || isEmptySession(visit.sessionId);
}

/**
 * Отметка о приеме. «Состоялся» у клиента с историей создает в ней запись о сеансе (на дату приема),
 * «не состоялся» и снятие отметки убирают пустую запись. null — без отметки.
 */
export function markVisit(visit: Visit, outcome: Outcome | null) {
  if (visit.source === 'record') return;
  let sessionId = visit.sessionId;
  if (outcome === 'held' && !sessionId && visit.chatId === CLIENT_CHAT) {
    sessionId = registerSession(visit.date);
  } else if (outcome !== 'held' && sessionId) {
    if (!isEmptySession(sessionId)) return;
    removeSession(sessionId);
    sessionId = undefined;
  }
  const patch = { outcome: outcome ?? undefined, sessionId };
  if (visit.source === 'appointment' && visit.appointment) markAppointment(visit.appointment.id, patch);
  else if (visit.plan) updatePlan(visit.plan.id, patch);
}

/** Комментарий к сеансу: у клиента с историей это текст сеанса в ней, у остальных — запись здесь */
export function saveVisitComment(visit: Visit, text: string) {
  if (visit.sessionId) {
    updateSessionText(visit.sessionId, textToParagraphs(text));
    return;
  }
  const comments = { ...state.comments };
  if (text.trim()) comments[visit.key] = text.trim();
  else delete comments[visit.key];
  commit({ ...state, comments });
}
