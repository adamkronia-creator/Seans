/*
 * Подсчёт GAD-7 и PHQ-9.
 *
 * Номер ответа (с 0) — это и есть балл: «Совсем нет» — 0, «В течение нескольких дней» — 1, «Более чем половину этого
 * времени» — 2, «Почти каждый день» — 3. Итог — сумма баллов: GAD-7 (7 вопросов) — от 0 до 21, PHQ-9 (9 вопросов) — от 0 до 27.
 * Неотвеченные вопросы баллов не дают.
 *
 * В PHQ-9 отдельно смотрят на девятый вопрос (мысли о смерти или самоповреждении): любой ответ, кроме «Совсем нет»,
 * требует уточнить суицидальный риск независимо от общей суммы.
 */

const sum = (answers: ReadonlyArray<number | undefined>) => answers.reduce<number>((total, a) => total + (a ?? 0), 0);

/** GAD-7: сумма баллов, 0–21 */
export const scoreGad7 = (answers: ReadonlyArray<number | undefined>): number => sum(answers);

export interface Phq9Scores {
  /** Сумма баллов, 0–27 */
  total: number;
  /** Ответ на девятый вопрос (0–3); undefined, если на него не ответили */
  suicidal?: number;
}

const PHQ9_SUICIDAL_ITEM = 8; // девятый вопрос, индекс с 0

/** PHQ-9: сумма баллов и ответ на вопрос о мыслях о смерти или самоповреждении */
export const scorePhq9 = (answers: ReadonlyArray<number | undefined>): Phq9Scores => ({
  total: sum(answers),
  suicidal: answers[PHQ9_SUICIDAL_ITEM],
});
