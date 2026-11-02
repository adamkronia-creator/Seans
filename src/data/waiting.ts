import { plural } from './taskValues';

/*
 * Сколько тест или задание ждут ответа клиента: для карточек отправленных во вкладках чата.
 * Даты в журнале клиента записаны как «дд.мм.гггг».
 */

/** «дд.мм.гггг» → дата в полночь по местному времени; не дата — undefined */
function parse(date: string): Date | undefined {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(date);
  if (!m) return undefined;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Сколько суток прошло от даты до `now` по календарю; будущая или неверная дата — 0 */
export function daysSince(date: string, now: Date = new Date()): number {
  const from = parse(date);
  if (!from) return 0;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Округление: в сутки со сдвигом часов 23 или 25 часов
  return Math.max(0, Math.round((today.getTime() - from.getTime()) / 86_400_000));
}

/** Как долго ждёт ответа: «Сегодня», «1 день», «24 дня», «30 дней» */
export function waitingText(date: string, now?: Date): string {
  const n = daysSince(date, now);
  return n === 0 ? 'Сегодня' : `${n} ${plural(n, ['день', 'дня', 'дней'])}`;
}
