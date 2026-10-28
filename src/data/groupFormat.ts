import { plural } from './taskValues';
import type { InviteLink } from './groups';

/* Подписи времени и ссылок для экранов групп и каналов */

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const pad = (n: number) => String(n).padStart(2, '0');
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** «сегодня в 14:05», «вчера в 09:10», «5 октября в 18:30» (с годом, если он не нынешний) */
export function whenText(at: number, now = Date.now()): string {
  const d = new Date(at);
  const today = new Date(now);
  const diff = Math.round((dayStart(today) - dayStart(d)) / 86_400_000);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (diff === 0) return `сегодня в ${time}`;
  if (diff === 1) return `вчера в ${time}`;
  const year = d.getFullYear() === today.getFullYear() ? '' : ` ${d.getFullYear()}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${year} в ${time}`;
}

/** Дата без времени: «сегодня», «вчера», «5 октября» */
export function dayText(at: number, now = Date.now()): string {
  const d = new Date(at);
  const today = new Date(now);
  const diff = Math.round((dayStart(today) - dayStart(d)) / 86_400_000);
  if (diff === 0) return 'сегодня';
  if (diff === 1) return 'вчера';
  const year = d.getFullYear() === today.getFullYear() ? '' : ` ${d.getFullYear()}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${year}`;
}

/** Сколько осталось до срока: «ещё 6 дн.», «ещё 3 ч», «ещё 12 мин»; прошёл — «срок истёк» */
export function leftText(at: number, now = Date.now()): string {
  const ms = at - now;
  if (ms <= 0) return 'срок истёк';
  const min = Math.ceil(ms / 60_000);
  if (min < 60) return `ещё ${min} мин`;
  const hours = Math.ceil(min / 60);
  if (hours < 24) return `ещё ${hours} ч`;
  return `ещё ${Math.ceil(hours / 24)} дн.`;
}

/** Сроки действия ссылки при создании: часы от «сейчас» (0 — без срока) */
export const LINK_TERMS: Array<{ hours: number; label: string }> = [
  { hours: 0, label: 'Без срока' },
  { hours: 1, label: '1 час' },
  { hours: 24, label: '1 день' },
  { hours: 24 * 7, label: '1 неделя' },
  { hours: 24 * 30, label: '1 месяц' },
];

/** Лимиты вступлений по ссылке (0 — без лимита) */
export const LINK_LIMITS: Array<{ value: number; label: string }> = [
  { value: 0, label: 'Без ограничений' },
  { value: 1, label: '1 человек' },
  { value: 10, label: '10 человек' },
  { value: 50, label: '50 человек' },
  { value: 100, label: '100 человек' },
];

const JOINED: [string, string, string] = ['Приглашён', 'Приглашено', 'Приглашено'];
const PEOPLE: [string, string, string] = ['человек', 'человека', 'человек'];

/** Название ссылки в списке: своё, а без него — «Основная ссылка» или конец кода */
export function linkTitle(l: InviteLink): string {
  return l.name || (l.primary ? 'Основная ссылка' : `Ссылка …${l.code.slice(-4)}`);
}

/** Что известно о ссылке: сколько вступило, до какого срока, какой лимит, по заявкам ли */
export function linkNote(l: InviteLink): string {
  if (l.revoked) return l.joined ? `Отозвана, приглашено: ${l.joined}` : 'Отозвана';
  const parts: string[] = [l.joined ? `${plural(l.joined, JOINED)} ${l.joined} ${plural(l.joined, PEOPLE)}` : 'Пока никого не пригласили'];
  if (l.expiresAt) parts.push(leftText(l.expiresAt));
  if (l.limit) parts.push(`лимит ${l.limit}`);
  if (l.needApproval) parts.push('по заявкам');
  return parts.join(', ');
}
