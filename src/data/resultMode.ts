/** Что клиент увидит на экране сразу после прохождения теста */
export type ResultMode = 'thanks' | 'score' | 'full';

export const RESULT_MODES: { id: ResultMode; title: string; hint: string; value: string }[] = [
  { id: 'thanks', title: 'Только благодарность', hint: 'Результат обсудите вместе на встрече', value: 'Только благодарность' },
  { id: 'score', title: 'Только баллы', hint: 'Баллы по шкалам без расшифровки', value: 'Только баллы' },
  { id: 'full', title: 'Полное заключение', hint: 'Баллы, уровни и расшифровка по каждой шкале', value: 'Полное заключение' },
];

/** Пояснение под выбором: почему по умолчанию клиенту не показывают баллы */
export const RESULT_NOTE = 'По умолчанию результат обсуждается на встрече: сумма баллов без контекста легко читается неверно';

/** Короткая строка на стартовом экране клиента: что он увидит после теста */
export const RESULT_FACT: Record<ResultMode, string> = {
  thanks: 'Результат обсудите на встрече',
  score: 'После теста увидите свои баллы',
  full: 'После теста увидите заключение',
};

/** Название слепого теста, когда номера нет (старые сообщения): ничего не говорит о методике */
export const BLIND_FALLBACK_TITLE = 'Тест';

/** Название слепого теста для клиента: «Тест №» и день, месяц, год и время отправки подряд, например «Тест №131020261007» */
export function blindTitle(at: Date = new Date()) {
  const two = (n: number) => String(n).padStart(2, '0');
  return `Тест №${two(at.getDate())}${two(at.getMonth() + 1)}${at.getFullYear()}${two(at.getHours())}${two(at.getMinutes())}`;
}
