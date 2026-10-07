import { BHS_ANSWERS } from './testBlank';

/*
 * Подсчёт опросников А. Бека.
 *
 * BDI (21 пункт): у каждого пункта четыре варианта по возрастанию выраженности, они дают 0, 1, 2 и 3 балла;
 * общая сумма — от 0 до 63. Подшкалы: когнитивно-аффективная — пункты 1–13 (до 39 баллов) и соматическая —
 * пункты 14–21 (до 24 баллов).
 *
 * BHS (20 утверждений): ответы «Совсем верно» и «Скорее верно» считаются согласием с утверждением, «Скорее неверно»
 * и «Совсем неверно» — несогласием. Балл (1) даёт согласие с утверждением о безнадёжности и несогласие с утверждением
 * о надежде; сумма — от 0 до 20. Границы уровней (0–3, 4–8, 9–14, 15–20) заданы для такого подсчёта.
 */

export interface BdiScores {
  /** Общая сумма: шкала «Депрессия», 0–63 */
  total: number;
  /** Когнитивно-аффективные проявления: пункты 1–13, 0–39 */
  cognitive: number;
  /** Соматические проявления: пункты 14–21, 0–24 */
  somatic: number;
}

const BDI_COGNITIVE_ITEMS = 13;

/** Подсчёт BDI: индекс ответа на пункт i (от 0) — это и есть его балл; неотвеченные пункты баллов не дают */
export function scoreBdi(answers: ReadonlyArray<number | undefined>): BdiScores {
  const points = (from: number, to: number) => {
    let sum = 0;
    for (let i = from; i < to; i++) sum += answers[i] ?? 0;
    return sum;
  };
  const cognitive = points(0, BDI_COGNITIVE_ITEMS);
  const somatic = points(BDI_COGNITIVE_ITEMS, 21);
  return { total: cognitive + somatic, cognitive, somatic };
}

/**
 * Номера утверждений бланка BHS (с 1). Согласие с утверждением о безнадёжности («Будущее представляется мне мрачным»)
 * и несогласие с утверждением о надежде («Я смотрю в будущее с надеждой и оптимизмом») дают по баллу.
 * Утверждения 7 и 8 стоят в бланке в порядке, обратном оригиналу, поэтому ключ составлен по смыслу утверждений.
 */
const BHS_KEY = {
  agree: [2, 4, 8, 9, 11, 12, 14, 16, 17, 18, 20],
  disagree: [1, 3, 5, 6, 7, 10, 13, 15, 19],
};

/** С какого варианта ответ считается согласием: «Скорее верно» и «Совсем верно» */
const BHS_AGREE_FROM = BHS_ANSWERS.indexOf('Скорее верно');

/** Подсчёт BHS: сумма баллов безнадёжности, 0–20 */
export function scoreBhs(answers: ReadonlyArray<number | undefined>): number {
  const agrees = (n: number) => (answers[n - 1] ?? -1) >= BHS_AGREE_FROM;
  const disagrees = (n: number) => {
    const a = answers[n - 1];
    return a !== undefined && a < BHS_AGREE_FROM;
  };
  return BHS_KEY.agree.filter(agrees).length + BHS_KEY.disagree.filter(disagrees).length;
}
