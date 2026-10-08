/*
 * Подсчёт интегративного теста тревожности (ИТТ; А. П. Бизюк, Л. И. Вассерман, Б. В. Иовлев).
 *
 * Тест состоит из двух частей по 15 утверждений: «Сейчас, в данный момент» (ситуационная тревожность, СТ-С) и «В последнее время»
 * (личностная тревожность, СТ-Л). Ответ на утверждение — от 0 до 3 баллов (номер варианта в бланке).
 *
 * Общий показатель части — сумма 15 ответов (0–45); он переводится в стэн (1–9) по таблице нормы.
 *
 * Пять компонентов считаются по утверждениям части: у каждого утверждения свой диагностический коэффициент для ответов 1, 2 и 3
 * (ответ 0 даёт 0). Сумма коэффициентов компонента переводится в стэн по таблице нормы. Нормы заданы отдельно для группы
 * «взрослые и юноши» и для девушек; в приложении мужская форма бланка считается по первой, женская — по второй.
 *
 * Стэны 1–3 — низкий уровень, 4–6 — нормативный, 7–9 — высокий.
 */

type Component = 'emotional' | 'asthenic' | 'phobic' | 'outlook' | 'social';

/** Утверждение части (с 1): компонент и коэффициенты для ответов 1, 2, 3 */
const ITEMS: Record<number, { component: Component; k: [number, number, number] }> = {
  1: { component: 'emotional', k: [25, 49, 74] },
  2: { component: 'emotional', k: [24, 49, 73] },
  3: { component: 'outlook', k: [37, 74, 110] },
  4: { component: 'emotional', k: [27, 53, 80] },
  5: { component: 'outlook', k: [32, 65, 98] },
  6: { component: 'emotional', k: [24, 49, 73] },
  7: { component: 'phobic', k: [37, 74, 111] },
  8: { component: 'asthenic', k: [30, 61, 91] },
  9: { component: 'phobic', k: [28, 56, 85] },
  10: { component: 'social', k: [57, 114, 171] },
  11: { component: 'social', k: [43, 86, 129] },
  12: { component: 'phobic', k: [29, 58, 87] },
  13: { component: 'asthenic', k: [41, 81, 122] },
  14: { component: 'asthenic', k: [29, 58, 87] },
  15: { component: 'outlook', k: [31, 61, 92] },
};

/** Верхние границы стэнов 1–8: значение не больше границы — этот стэн, больше последней — стэн 9 */
type Limits = readonly number[];

interface Norms {
  /** Взрослые и юноши */
  adult: Limits;
  /** Девушки */
  girl: Limits;
}

const TOTAL_NORMS: Norms = {
  adult: [6, 8, 9, 11, 14, 18, 22, 26],
  girl: [6, 8, 10, 12, 16, 21, 25, 30],
};

const COMPONENT_NORMS: Record<Component, Norms> = {
  emotional: {
    adult: [34, 48, 62, 76, 100, 137, 173, 209],
    girl: [42, 58, 75, 92, 117, 150, 183, 217],
  },
  asthenic: {
    adult: [26, 36, 47, 57, 82, 122, 161, 201],
    girl: [31, 44, 57, 70, 95, 132, 169, 206],
  },
  phobic: {
    adult: [13, 19, 24, 29, 54, 99, 144, 188],
    girl: [16, 23, 29, 36, 61, 104, 148, 191],
  },
  outlook: {
    adult: [44, 62, 80, 97, 122, 155, 187, 219],
    girl: [53, 75, 97, 118, 143, 172, 200, 228],
  },
  social: {
    adult: [50, 70, 90, 110, 135, 165, 195, 225],
    girl: [60, 85, 109, 134, 159, 184, 210, 235],
  },
};

const stanine = (value: number, limits: Limits): number => {
  const i = limits.findIndex((limit) => value <= limit);
  return i < 0 ? limits.length + 1 : i + 1;
};

const PART = 15;

export interface IttScores {
  /** Ситуационная тревожность (СТ-С), стэн 1–9 */
  situational: number;
  /** Личностная тревожность (СТ-Л), стэн 1–9 */
  personal: number;
  /** Компоненты ситуационной тревожности (стэны 1–9): ЭД-С, АСТ-С, ФОБ-С, ОП-С, СЗ-С */
  components: number[];
}

/**
 * Подсчёт ИТТ. `answers` — 30 ответов подряд (0–3): первые 15 — «сейчас», следующие 15 — «в последнее время».
 * `girl` — нормы для девушек; иначе нормы для взрослых и юношей. Неотвеченные пункты баллов не дают.
 */
export function scoreItt(answers: ReadonlyArray<number | undefined>, girl: boolean): IttScores {
  const group: keyof Norms = girl ? 'girl' : 'adult';
  const answer = (part: number, n: number) => answers[part * PART + n - 1] ?? 0;
  const total = (part: number) => {
    let sum = 0;
    for (let n = 1; n <= PART; n++) sum += answer(part, n);
    return sum;
  };

  // Компоненты — по первой части («сейчас»): в заключении они заданы как ЭД-С, АСТ-С, ФОБ-С, ОП-С, СЗ-С
  const sums: Record<Component, number> = { emotional: 0, asthenic: 0, phobic: 0, outlook: 0, social: 0 };
  for (let n = 1; n <= PART; n++) {
    const a = answer(0, n);
    if (a > 0) sums[ITEMS[n].component] += ITEMS[n].k[a - 1];
  }
  const order: Component[] = ['emotional', 'asthenic', 'phobic', 'outlook', 'social'];

  return {
    situational: stanine(total(0), TOTAL_NORMS[group]),
    personal: stanine(total(1), TOTAL_NORMS[group]),
    components: order.map((c) => stanine(sums[c], COMPONENT_NORMS[c][group])),
  };
}
