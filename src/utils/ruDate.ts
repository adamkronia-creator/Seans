/*
 * Даты и время для записи на прием. Дата хранится строкой «2026-10-15», время — «18:00» (местное время устройства):
 * так значения не зависят от часового пояса и их удобно класть в поля выбора. Названия дней и месяцев свои, без Intl:
 * результат один и тот же в любом браузере.
 */

const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

const pad = (n: number) => String(n).padStart(2, '0');
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Полночь указанного дня по местному времени */
export function parseDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function addDays(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
  return r;
}

/** «18:30» → 1110 минут от полуночи */
export const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

export const fromMinutes = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** Момент: день и время на нём */
export function at(key: string, time: string): Date {
  const d = parseDate(key);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, toMinutes(time));
}

/** Разница в календарных днях: 0 — тот же день, 1 — завтра */
export const daysBetween = (from: Date, to: Date) =>
  Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);

/** «Четверг, 15 октября»; год добавляется, если день не в этом году */
export function dayLong(key: string, now = new Date()): string {
  const d = parseDate(key);
  const year = d.getFullYear() === now.getFullYear() ? '' : ` ${d.getFullYear()}`;
  return `${capital(WEEKDAYS[d.getDay()])}, ${d.getDate()} ${MONTHS[d.getMonth()]}${year}`;
}

/** «чт, 15 окт» */
export function dayShort(key: string, now = new Date()): string {
  const d = parseDate(key);
  const year = d.getFullYear() === now.getFullYear() ? '' : ` ${d.getFullYear()}`;
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${year}`;
}

export const weekdayShort = (d: Date) => WEEKDAYS_SHORT[d.getDay()];
export const monthShort = (d: Date) => MONTHS_SHORT[d.getMonth()];

/** Склонение по числу: plural(2, 'день', 'дня', 'дней') → «дня» */
export function plural(n: number, one: string, few: string, many: string): string {
  const mod100 = Math.abs(n) % 100;
  const mod10 = mod100 % 10;
  if (mod100 > 10 && mod100 < 20) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

/** «сегодня», «завтра», «через 6 дней» */
export function untilDay(key: string, now = new Date()): string {
  const n = daysBetween(now, parseDate(key));
  if (n <= 0) return 'сегодня';
  if (n === 1) return 'завтра';
  return `через ${n} ${plural(n, 'день', 'дня', 'дней')}`;
}

/** Время от-до: «18:00–18:50» */
export const timeSpan = (from: string, to: string) => `${from}–${to}`;

/** Длительность: «50 мин», «1 ч 30 мин» */
export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}
