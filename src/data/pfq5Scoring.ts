/*
 * 5PFQ (А. Б. Хромов): 75 пар утверждений, пять факторов; каждый фактор состоит из пяти шкал по три пункта.
 * Пункт n относится к фактору (n − 1) mod 5 и к шкале ⌊(n − 1) / 15⌋ этого фактора.
 * Отмеченный вариант −2, −1, 0, 1, 2 (номер 0–4) даёт 5, 4, 3, 2, 1 балла: верхнее утверждение пары — полюс высоких значений.
 * Шкала — сумма трёх пунктов (3–15), фактор — сумма пяти шкал (15–75).
 */

export interface Pfq5Scores {
  /** Баллы пяти факторов: Эк/Ин, Пр/Об, Ск/Им, ЭУ/ЭН, Эксп/Практ. */
  factors: number[];
  /** Баллы пяти шкал каждого фактора: scales[фактор][шкала] */
  scales: number[][];
}

/** `answers[i]` — номер варианта (0–4) в паре i + 1 */
export function scorePfq5(answers: number[]): Pfq5Scores {
  const scales = Array.from({ length: 5 }, () => Array<number>(5).fill(0));
  answers.forEach((answer, i) => {
    scales[i % 5][Math.floor(i / 15)] += 5 - answer;
  });
  return { factors: scales.map((row) => row.reduce((sum, v) => sum + v, 0)), scales };
}
