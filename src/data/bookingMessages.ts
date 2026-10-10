import type { Appointment, ProposalInput, Slot } from './appointments';
import { sendMessage } from './chatStore';
import { dayLong, durationLabel, fromMinutes, toMinutes } from '../utils/ruDate';

/*
 * Оповещения о записи на прием в диалоге с клиентом: когда вы предлагаете время, переносите, отказываетесь или отменяете
 * прием, клиенту в чат уходит карточка в стиле присланного теста — подпись, заголовок, текст и кнопка, которая открывает
 * раздел «Запись на прием». Ответы клиента не имитируются.
 */

const day = (slot: Slot, now: Date) => dayLong(slot.date, now).toLowerCase();

/** «18:00–18:50» или «с 15:00 до 19:00» */
function when(slot: Slot, duration: number): string {
  return slot.kind === 'exact'
    ? `${slot.start}–${fromMinutes(toMinutes(slot.start) + duration)}`
    : `с ${slot.from} до ${slot.to}`;
}

const sentence = (slot: Slot, duration: number, now: Date) =>
  slot.kind === 'exact'
    ? `${day(slot, now)}, ${when(slot, duration)} (${durationLabel(duration)})`
    : `${day(slot, now)}, ${when(slot, duration)}: выберите удобное начало, прием ${durationLabel(duration)}`;

function notice(chatId: string, title: string, text: string) {
  sendMessage(chatId, text, undefined, {
    booking: { title },
    buttons: [{ label: 'Открыть запись на прием', href: 'section:booking' }],
  });
}

const withReason = (text: string, reason?: string) => (reason?.trim() ? `${text}\nПричина: ${reason.trim()}` : text);

/** Вы предложили время (или другое время в ответ) */
export function noticeProposal(chatId: string, input: ProposalInput, kind: 'new' | 'counter', replaced?: Appointment) {
  const now = new Date();
  const comment = input.comment?.trim() ? `\n${input.comment.trim()}` : '';
  if (replaced) {
    notice(
      chatId,
      'Перенос приема',
      `Предлагаю перенести прием с ${day(replaced.slot, now)}, ${when(replaced.slot, replaced.duration)} на ${sentence(input.slot, input.duration, now)}.${comment}`,
    );
  } else if (kind === 'counter') {
    notice(chatId, 'Другое время', `Предлагаю другое время: ${sentence(input.slot, input.duration, now)}.${comment}`);
  } else {
    notice(chatId, 'Предложение времени', `Предлагаю время для приема: ${sentence(input.slot, input.duration, now)}.${comment}`);
  }
}

/** Вы отказались от предложения клиента */
export function noticeDecline(a: Appointment, reason?: string) {
  const now = new Date();
  const what = a.replaces ? 'перенос приема на' : 'прием на';
  notice(a.chatId, 'Отказ', withReason(`К сожалению, не могу согласиться на ${what} ${day(a.slot, now)}, ${when(a.slot, a.duration)}.`, reason));
}

/** Вы отменили подтвержденный прием */
export function noticeCancel(a: Appointment, reason?: string) {
  const now = new Date();
  notice(a.chatId, 'Отмена приема', withReason(`Отменяю прием ${day(a.slot, now)}, ${when(a.slot, a.duration)}.`, reason));
}

/** Вы приняли предложение клиента: прием подтвержден (или перенесен) */
export function noticeAccept(a: Appointment, slot: Slot) {
  const now = new Date();
  const text = `${day(slot, now)}, ${when(slot, a.duration)} (${durationLabel(a.duration)})`;
  notice(
    a.chatId,
    a.replaces ? 'Перенос подтвержден' : 'Прием подтвержден',
    a.replaces ? `Принимаю перенос. Ждем вас: ${text}.` : `Подтверждаю прием: ${text}.`,
  );
}

/** Вы отозвали свое предложение */
export function noticeWithdraw(a: Appointment) {
  const now = new Date();
  const what = a.replaces ? 'перенос приема на' : 'время';
  notice(a.chatId, 'Предложение отозвано', `Отзываю свое предложение: ${what} ${day(a.slot, now)}, ${when(a.slot, a.duration)}. Прошу не учитывать его.`);
}

/** Напоминание о подтвержденном приеме: кто и когда ждет, адрес */
export function noticeReminder(a: Appointment, address: string) {
  const now = new Date();
  const where = address.trim() ? ` Адрес: ${address.trim()}.` : '';
  notice(a.chatId, 'Напоминание о приеме', `Напоминаю о приеме: ${day(a.slot, now)}, ${when(a.slot, a.duration)}.${where}`);
}
