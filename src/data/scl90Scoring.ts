/*
 * SCL-90: девять шкал и семь дополнительных пунктов. Ответ — число от 0 до 4, оно совпадает с номером варианта.
 * Балл шкалы — среднее по её пунктам; GSI — сумма всех 90 ответов, делённая на 90;
 * PST — число ответов, отличных от нуля; PSDI — сумма всех ответов, делённая на PST. Всё округляется до сотых.
 * Ключ — классический ключ Л. Деррогатиса (SCL-90-R).
 */

/** Номера пунктов (с единицы) по шкалам, в порядке шкал в заключении */
export const SCL90_KEYS: { code: string; items: number[] }[] = [
  { code: 'Сом', items: [1, 4, 12, 27, 40, 42, 48, 49, 52, 53, 56, 58] },
  { code: 'ОК', items: [3, 9, 10, 28, 38, 45, 46, 51, 55, 65] },
  { code: 'МС', items: [6, 21, 34, 36, 37, 41, 61, 69, 73] },
  { code: 'Деп', items: [5, 14, 15, 20, 22, 26, 29, 30, 31, 32, 54, 71, 79] },
  { code: 'Тр', items: [2, 17, 23, 33, 39, 57, 72, 78, 80, 86] },
  { code: 'Вр', items: [11, 24, 63, 67, 74, 81] },
  { code: 'Фоб', items: [13, 25, 47, 50, 70, 75, 82] },
  { code: 'Пар', items: [8, 18, 43, 68, 76, 83] },
  { code: 'Пси', items: [7, 16, 35, 62, 77, 84, 85, 87, 88, 90] },
];
// Дополнительные пункты 19, 44, 59, 60, 64, 66 и 89 не входят ни в одну шкалу: они учитываются только в GSI, PST и PSDI.

export interface Scl90Scores {
  gsi: number;
  psdi: number;
  pst: number;
  /** Баллы девяти шкал в порядке `SCL90_KEYS` */
  scales: number[];
  /** Ответ на пункт 15 («Мысли о том, чтобы покончить с собой»), если он отличен от нуля */
  suicidal?: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** `answers[i]` — ответ (0–4) на пункт i + 1 */
export function scoreScl90(answers: number[]): Scl90Scores {
  const total = answers.reduce((sum, a) => sum + a, 0);
  const pst = answers.filter((a) => a > 0).length;
  return {
    gsi: round2(total / answers.length),
    psdi: pst > 0 ? round2(total / pst) : 0,
    pst,
    scales: SCL90_KEYS.map(({ items }) => round2(items.reduce((sum, n) => sum + answers[n - 1], 0) / items.length)),
    suicidal: answers[14] > 0 ? answers[14] : undefined,
  };
}
