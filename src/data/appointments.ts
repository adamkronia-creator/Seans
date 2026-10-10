import { useSyncExternalStore } from 'react';
import { noticeAccept, noticeCancel, noticeDecline, noticeProposal, noticeReminder, noticeWithdraw } from './bookingMessages';
import { addDays, at, dateKey, durationLabel, fromMinutes, startOfDay, toMinutes } from '../utils/ruDate';

/*
 * Запись на прием. У каждого приема одна «ветка согласования»: предложение живет, пока его не приняли, не отклонили
 * и не отозвали. Ответить можно тремя способами: согласиться, отказаться или предложить другое время (тогда то же
 * предложение переходит к другой стороне с новым временем). Перенос подтвержденного приема — это предложение со ссылкой
 * на него (replaces): пока ответа нет, действует прежнее время, а после согласия прежний прием уходит в историю.
 * Состояния «состоялся» и «время прошло» не хранятся, а считаются по часам (phaseOf).
 *
 * Данные только в памяти: после перезагрузки страницы возвращаются исходные. Ответы второй стороны не имитируются:
 * входящие предложения заложены в исходные данные.
 */

export type Who = 'me' | 'them';

/** Время приема: точное (начало, конец по длительности) или промежуток, внутри которого начало выберет другая сторона */
export type Slot =
  | { kind: 'exact'; date: string; start: string }
  | { kind: 'range'; date: string; from: string; to: string };

export type Status = 'proposed' | 'confirmed' | 'declined' | 'cancelled' | 'moved';

/** Отметка психолога после приема: состоялся или нет. Без отметки прошедший прием считается состоявшимся по часам */
export type Outcome = 'held' | 'missed';

export interface Appointment {
  id: string;
  chatId: string;
  status: Status;
  /** Чье предложение сейчас на столе (для подтвержденного — чье предложение приняли) */
  by: Who;
  slot: Slot;
  /** Длительность приема в минутах */
  duration: number;
  /** Комментарий к предложению */
  comment?: string;
  /** Это ответное предложение другого времени */
  countered?: boolean;
  /** Перенос: id подтвержденного приема, который заменит это предложение */
  replaces?: string;
  /** Отказ или отмена: кто и почему */
  closedBy?: Who;
  reason?: string;
  /** Перенесенный прием: когда он теперь */
  movedTo?: { date: string; start: string };
  /** Отметка о приеме (ставится в «Ежедневнике» или вручную после приема) */
  outcome?: Outcome;
  /** Состоялся: запись о сеансе в истории клиента (id сеанса в данных клиента) */
  sessionId?: string;
  /** Когда запись менялась в последний раз (порядок в истории) */
  updatedAt: number;
}

/** Информация о приеме одна на все чаты: у психолога один кабинет и свои условия */
export interface Info {
  address: string;
  /** Как пройти в кабинет */
  howTo: string;
  /** Что принести */
  bring: string;
  /** Оплата сеанса: сколько стоит и как заплатить */
  payment: string;
}

export interface ProposalInput {
  slot: Slot;
  duration: number;
  comment?: string;
  replaces?: string;
}

export const DURATIONS = [30, 45, 50, 60, 90];
export const DEFAULT_DURATION = 50;
/** Шаг, с которым предлагается начало внутри промежутка */
export const PICK_STEP = 30;

// ---------------------------------------------------------------- время

/** Конец точного приема: «18:50» */
export const endTime = (start: string, duration: number) => fromMinutes(toMinutes(start) + duration);

/** Начало и конец: у точного времени это сам прием, у промежутка — весь промежуток */
export function bounds(a: Pick<Appointment, 'slot' | 'duration'>): { start: Date; end: Date } {
  const { slot } = a;
  if (slot.kind === 'range') return { start: at(slot.date, slot.from), end: at(slot.date, slot.to) };
  const start = at(slot.date, slot.start);
  return { start, end: new Date(start.getTime() + a.duration * 60_000) };
}

/** Самое позднее начало: после него предложение уже не принять */
function lastStart(a: Pick<Appointment, 'slot' | 'duration'>): Date {
  const { slot } = a;
  return slot.kind === 'range' ? at(slot.date, fromMinutes(toMinutes(slot.to) - a.duration)) : at(slot.date, slot.start);
}

export type Phase = 'upcoming' | 'done' | 'open' | 'expired' | 'closed';

/** upcoming — подтвержден и еще не закончился, done — состоялся; open — ждет ответа, expired — время вышло; closed — закрыт */
export function phaseOf(a: Appointment, now: Date): Phase {
  if (a.status === 'confirmed') return bounds(a).end.getTime() > now.getTime() ? 'upcoming' : 'done';
  if (a.status === 'proposed') return lastStart(a).getTime() > now.getTime() ? 'open' : 'expired';
  return 'closed';
}

/** Начала, из которых другая сторона может выбрать внутри промежутка: каждые полчаса и само начало промежутка */
export function pickableStarts(a: Appointment, now: Date): string[] {
  const { slot } = a;
  if (slot.kind !== 'range') return [];
  const from = toMinutes(slot.from);
  const last = toMinutes(slot.to) - a.duration;
  const starts = new Set<number>([from]);
  for (let m = Math.ceil(from / PICK_STEP) * PICK_STEP; m <= last; m += PICK_STEP) starts.add(m);
  return [...starts]
    .filter((m) => m <= last && at(slot.date, fromMinutes(m)).getTime() > now.getTime())
    .sort((x, y) => x - y)
    .map(fromMinutes);
}

/** Почему такое предложение отправить нельзя (null — можно) */
export function problemWith(slot: Slot, duration: number, now: Date): string | null {
  if (!slot.date) return 'Выберите дату';
  if (slot.kind === 'exact') {
    if (!slot.start) return 'Укажите время начала';
    if (toMinutes(slot.start) + duration > 24 * 60 - 1) return 'Прием должен закончиться до полуночи';
    if (at(slot.date, slot.start).getTime() <= now.getTime()) return 'Это время уже прошло';
    return null;
  }
  if (!slot.from || !slot.to) return 'Укажите начало и конец промежутка';
  if (toMinutes(slot.to) - toMinutes(slot.from) < duration) return `Промежуток короче приема (${durationLabel(duration)})`;
  if (lastStart({ slot, duration }).getTime() <= now.getTime()) return 'Это время уже прошло';
  return null;
}

// ---------------------------------------------------------------- выборки

export interface BookingView {
  /** Подтвержденные, ближайший первым */
  upcoming: Appointment[];
  /** Предложения собеседника: ждут ответа психолога */
  incoming: Appointment[];
  /** Предложения психолога: ждут ответа собеседника */
  outgoing: Appointment[];
  /** История: состоялись, отменены, отклонены, перенесены, не успели согласовать. Свежие сверху */
  past: Appointment[];
}

export function viewOf(items: Appointment[], chatId: string, now: Date): BookingView {
  const upcoming: Appointment[] = [];
  const incoming: Appointment[] = [];
  const outgoing: Appointment[] = [];
  const past: Appointment[] = [];
  for (const a of items) {
    if (a.chatId !== chatId) continue;
    const phase = phaseOf(a, now);
    if (phase === 'upcoming') upcoming.push(a);
    else if (phase === 'open') (a.by === 'them' ? incoming : outgoing).push(a);
    else past.push(a);
  }
  const byStart = (x: Appointment, y: Appointment) => bounds(x).start.getTime() - bounds(y).start.getTime();
  // В истории порядок по моменту, когда запись закрылась: у состоявшегося это конец приема, у остальных — последнее изменение
  const closedAt = (a: Appointment) => (a.status === 'confirmed' ? bounds(a).end.getTime() : a.updatedAt);
  upcoming.sort(byStart);
  incoming.sort(byStart);
  outgoing.sort(byStart);
  past.sort((x, y) => closedAt(y) - closedAt(x));
  return { upcoming, incoming, outgoing, past };
}

// ---------------------------------------------------------------- исходные данные

const exact = (date: string, start: string): Slot => ({ kind: 'exact', date, start });

function seedItems(): Appointment[] {
  const today = startOfDay(new Date());
  // Ближайший четверг не раньше чем через два дня: сеансы Максима идут по четвергам
  let thursday = addDays(today, 2);
  while (thursday.getDay() !== 4) thursday = addDays(thursday, 1);
  const base = Date.now();
  const chatId = 'maxim';
  return [
    { id: 'ap1', chatId, status: 'confirmed', by: 'me', slot: exact(dateKey(thursday), '18:00'), duration: 50, updatedAt: base - 3 * 86_400_000 },
    {
      id: 'ap2',
      chatId,
      status: 'proposed',
      by: 'them',
      slot: exact(dateKey(addDays(thursday, -1)), '12:00'),
      duration: 50,
      comment: 'В четверг не получится, перенесли рабочую встречу. Можно в среду в обед?',
      replaces: 'ap1',
      updatedAt: base - 2 * 3_600_000,
    },
    {
      id: 'ap3',
      chatId,
      status: 'proposed',
      by: 'them',
      slot: { kind: 'range', date: dateKey(addDays(thursday, 5)), from: '15:00', to: '19:00' },
      duration: 50,
      comment: 'Хочу отдельно обсудить итоги месяца. Подстроюсь под любое время из промежутка.',
      updatedAt: base - 5 * 3_600_000,
    },
    // Два последних приема уже отмечены как состоявшиеся: это сеансы №6 и №5 в истории Максима (s6, s5)
    {
      id: 'ap4',
      chatId,
      status: 'confirmed',
      by: 'me',
      slot: exact('2026-10-08', '18:00'),
      duration: 50,
      outcome: 'held',
      sessionId: 's6',
      updatedAt: new Date(2026, 9, 1, 12).getTime(),
    },
    {
      id: 'ap5',
      chatId,
      status: 'confirmed',
      by: 'me',
      slot: exact('2026-10-01', '18:00'),
      duration: 50,
      outcome: 'held',
      sessionId: 's5',
      updatedAt: new Date(2026, 8, 24, 12).getTime(),
    },
    {
      id: 'ap6',
      chatId,
      status: 'cancelled',
      by: 'me',
      slot: exact('2026-09-24', '18:00'),
      duration: 50,
      closedBy: 'them',
      reason: 'Заболел, прошу прощения',
      updatedAt: new Date(2026, 8, 23, 9, 40).getTime(),
    },
  ];
}

const SEED_INFO: Info = {
  address: 'Екатеринбург, ул. Мира, 19',
  howTo: 'Вход со двора, через арку. Домофон 91, третий этаж, лифт справа. Кабинет №91 — вторая дверь налево.',
  bring: 'Ничего особенного. Если вели дневник эмоций, возьмите его.',
  payment: '3 500 ₽ за сеанс. Перевод по номеру телефона +7 900 000-00-00 или наличными в кабинете.',
};

// ---------------------------------------------------------------- хранилище

interface BookingState {
  items: Appointment[];
  info: Info;
}

let state: BookingState = { items: seedItems(), info: SEED_INFO };
let counter = 100;
const listeners = new Set<() => void>();

function commit(next: BookingState) {
  state = next;
  scheduleReminders();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const useBooking = () => useSyncExternalStore(subscribe, () => state);

/** Меняет запись; вернувшая null функция убирает ее */
function change(id: string, fn: (a: Appointment) => Appointment | null) {
  commit({ ...state, items: state.items.flatMap((a) => (a.id === id ? (fn(a) ?? []) : [a])) });
}

const clean = (text?: string) => text?.trim() || undefined;

/** Предложить время (новый прием или перенос подтвержденного, если указан replaces) */
export function proposeTime(chatId: string, input: ProposalInput): string {
  counter += 1;
  const id = `ap${counter}`;
  const comment = clean(input.comment);
  const item: Appointment = {
    id,
    chatId,
    status: 'proposed',
    by: 'me',
    slot: input.slot,
    duration: input.duration,
    ...(comment ? { comment } : {}),
    ...(input.replaces ? { replaces: input.replaces } : {}),
    updatedAt: Date.now(),
  };
  commit({ ...state, items: [...state.items, item] });
  noticeProposal(chatId, input, 'new', input.replaces ? state.items.find((x) => x.id === input.replaces) : undefined);
  return id;
}

/** Изменить свое предложение, пока на него не ответили */
export function editProposal(id: string, input: ProposalInput) {
  change(id, (a) => {
    const next: Appointment = { ...a, slot: input.slot, duration: input.duration, updatedAt: Date.now() };
    const comment = clean(input.comment);
    if (comment) next.comment = comment;
    else delete next.comment;
    return next;
  });
}

/** Ответить своим временем: предложение переходит к другой стороне */
export function counterProposal(id: string, input: ProposalInput) {
  const chatId = state.items.find((x) => x.id === id)?.chatId;
  if (chatId) noticeProposal(chatId, input, 'counter');
  change(id, (a) => {
    const next: Appointment = { ...a, by: 'me', countered: true, slot: input.slot, duration: input.duration, updatedAt: Date.now() };
    const comment = clean(input.comment);
    if (comment) next.comment = comment;
    else delete next.comment;
    return next;
  });
}

/** Отозвать свое предложение */
export function withdrawProposal(id: string) {
  const withdrawn = state.items.find((x) => x.id === id);
  if (withdrawn && withdrawn.by === 'me') noticeWithdraw(withdrawn);
  change(id, () => null);
}

/** Согласиться. Если предложен промежуток, нужно указать начало приема внутри него */
export function acceptProposal(id: string, start?: string) {
  const a = state.items.find((x) => x.id === id);
  if (!a || a.status !== 'proposed') return;
  const chosen = a.slot.kind === 'exact' ? a.slot.start : (start ?? a.slot.from);
  const slot = exact(a.slot.date, chosen);
  const now = Date.now();
  if (a.by === 'them') noticeAccept(a, slot);
  commit({
    ...state,
    items: state.items.flatMap((x) => {
      if (x.id === id) {
        const next: Appointment = { ...x, status: 'confirmed', slot, updatedAt: now };
        delete next.replaces;
        delete next.countered;
        return [next];
      }
      // Прежний прием уходит в историю с пометкой «перенесен»; прочие предложения о переносе того же приема теряют смысл
      if (a.replaces && x.id === a.replaces) return [{ ...x, status: 'moved' as const, movedTo: { date: slot.date, start: chosen }, updatedAt: now }];
      if (a.replaces && x.replaces === a.replaces && x.status === 'proposed') return [];
      return [x];
    }),
  });
}

/** Отказаться от предложения (причина по желанию) */
export function declineProposal(id: string, reason?: string) {
  const declined = state.items.find((x) => x.id === id);
  if (declined) noticeDecline(declined, reason);
  change(id, (a) => {
    const next: Appointment = { ...a, status: 'declined', closedBy: 'me', updatedAt: Date.now() };
    const text = clean(reason);
    if (text) next.reason = text;
    return next;
  });
}

/** Отменить подтвержденный прием. Предложения о его переносе снимаются */
export function cancelAppointment(id: string, reason?: string) {
  const cancelled = state.items.find((x) => x.id === id);
  if (cancelled) noticeCancel(cancelled, reason);
  commit({
    ...state,
    items: state.items.flatMap((a) => {
      if (a.replaces === id && a.status === 'proposed') return [];
      if (a.id !== id) return [a];
      const next: Appointment = { ...a, status: 'cancelled', closedBy: 'me', updatedAt: Date.now() };
      const text = clean(reason);
      if (text) next.reason = text;
      return [next];
    }),
  });
}

/** Отметка о приеме: «состоялся» (с записью о сеансе в истории) или «не состоялся»; undefined снимает отметку.
 *  Время записи не меняется: от него зависит порядок в истории приемов */
export function markAppointment(id: string, patch: { outcome?: Outcome; sessionId?: string }) {
  change(id, (a) => ({ ...a, outcome: patch.outcome, sessionId: patch.sessionId }));
}

export function saveInfo(info: Info) {
  commit({
    ...state,
    info: { address: info.address.trim(), howTo: info.howTo.trim(), bring: info.bring.trim(), payment: info.payment.trim() },
  });
}

// ---------------------------------------------------------------- напоминания

/** За сколько до начала клиенту уходит напоминание */
export const REMIND_BEFORE = 60 * 60_000;

/** Уже отправленные напоминания: «прием|дата|время», чтобы одно и то же не уходило дважды */
const reminded = new Set<string>();
const reminders = new Map<string, number>();
const remindKey = (a: Appointment) => `${a.id}|${bounds(a).start.getTime()}`;

function sendReminder(a: Appointment) {
  reminded.add(remindKey(a));
  noticeReminder(a, state.info.address);
}

/** Отправить напоминание сейчас, не дожидаясь срока (кнопка в карточке приема) */
export function remindNow(id: string) {
  const a = state.items.find((x) => x.id === id);
  if (a && a.status === 'confirmed') sendReminder(a);
}

/** Для каждого будущего подтвержденного приема заводится таймер на «за час до начала»; перенесенным и отмененным он снимается */
function scheduleReminders() {
  const now = Date.now();
  const wanted = new Map<string, Appointment>();
  state.items.forEach((a) => {
    if (a.status !== 'confirmed' || a.slot.kind !== 'exact') return;
    const at = bounds(a).start.getTime() - REMIND_BEFORE;
    if (at > now && at - now < 2 ** 31 - 1 && !reminded.has(remindKey(a))) wanted.set(remindKey(a), a);
  });
  reminders.forEach((timer, key) => {
    if (!wanted.has(key)) {
      window.clearTimeout(timer);
      reminders.delete(key);
    }
  });
  wanted.forEach((a, key) => {
    if (reminders.has(key)) return;
    const id = a.id;
    reminders.set(
      key,
      window.setTimeout(() => {
        reminders.delete(key);
        const current = state.items.find((x) => x.id === id);
        if (current && current.status === 'confirmed' && remindKey(current) === key) sendReminder(current);
      }, bounds(a).start.getTime() - REMIND_BEFORE - now),
    );
  });
}

scheduleReminders();
