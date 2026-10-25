import type { Status } from './groups';

/*
 * Статус доступности: эмодзи и короткий текст у имени («Принимаю новых клиентов», «В отпуске до 3 ноября»).
 * У статуса есть срок, по его окончании статус сам исчезает; без срока он держится, пока человек его не уберёт.
 */

export interface StatusPreset {
  id: string;
  emoji: string;
  text: string;
}

export const STATUS_PRESETS: StatusPreset[] = [
  { id: 'open', emoji: '🟢', text: 'Принимаю новых клиентов' },
  { id: 'waitlist', emoji: '⏳', text: 'Лист ожидания' },
  { id: 'full', emoji: '⛔', text: 'Мест нет' },
  { id: 'vacation', emoji: '🌴', text: 'В отпуске' },
  { id: 'quiet', emoji: '🔕', text: 'Не беспокоить' },
];

const DAY = 86_400_000;

export interface StatusTerm {
  id: string;
  label: string;
  /** На сколько миллисекунд; без значения — без срока */
  ms?: number;
}

export const STATUS_TERMS: StatusTerm[] = [
  { id: 'day', label: 'Сутки', ms: DAY },
  { id: 'three', label: '3 дня', ms: 3 * DAY },
  { id: 'week', label: 'Неделя', ms: 7 * DAY },
  { id: 'month', label: 'Месяц', ms: 30 * DAY },
  { id: 'none', label: 'Без срока' },
];

/** Эмодзи для своего статуса, если подходящего нет среди готовых */
export const STATUS_EMOJIS = ['💬', '☕', '📚', '🎧', '🧘', '🏠', '✈️', '🌙'];

export const STATUS_TEXT_MAX = 40;

/** Статус, пока не вышел срок; иначе его как будто нет */
export function liveStatus(status: Status | undefined, now: number): Status | undefined {
  return status && (status.until === undefined || status.until > now) ? status : undefined;
}

/** «до 25 октября» */
export function untilLabel(until: number): string {
  return `до ${new Date(until).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`;
}

/** Статус одной строкой: «🟢 Принимаю новых клиентов», со сроком — «🌴 В отпуске · до 3 ноября» */
export function statusLine(status: Status): string {
  return `${status.emoji} ${status.text}${status.until ? ` · ${untilLabel(status.until)}` : ''}`;
}

/** Статусы тестовых людей (придуманы) */
export function seedStatuses(now: number): Record<string, Status> {
  return {
    vladislav: { emoji: '🟢', text: 'Принимаю новых клиентов' },
    irina: { emoji: '⏳', text: 'Лист ожидания' },
    sergey: { emoji: '🌴', text: 'В отпуске', until: now + 9 * DAY },
    anton: { emoji: '⛔', text: 'Мест нет' },
  };
}
