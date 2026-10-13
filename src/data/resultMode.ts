/** Что клиент увидит на экране сразу после прохождения теста */
export type ResultMode = 'thanks' | 'score' | 'full';

export const RESULT_MODES: { id: ResultMode; title: string; value: string }[] = [
  { id: 'thanks', title: 'Только благодарность', value: 'Только благодарность' },
  { id: 'score', title: 'Только баллы', value: 'Только баллы' },
  { id: 'full', title: 'Полное заключение', value: 'Полное заключение' },
];

/** Название слепого теста, когда номера нет (старые сообщения): ничего не говорит о методике */
export const BLIND_FALLBACK_TITLE = 'Тест';

/** Название слепого теста для клиента: «Тест №» и день, месяц, год и время отправки подряд, например «Тест №131020261007» */
export function blindTitle(at: Date = new Date()) {
  const two = (n: number) => String(n).padStart(2, '0');
  return `Тест №${two(at.getDate())}${two(at.getMonth() + 1)}${at.getFullYear()}${two(at.getHours())}${two(at.getMinutes())}`;
}
