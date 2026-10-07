import { SMOL_ANSWERS } from './testBlank';

/*
 * Подсчёт СМОЛ (Мини-мульт, 71 утверждение; Kincannon, 1968, адаптация В. П. Зайцева):
 * 1. сырой балл шкалы — число ответов, совпавших с ключом («Верно» или «Неверно»);
 * 2. к шкалам Hs, Pd, Pt, Sc и Ma добавляется поправка на K (0,5K, 0,4K, K, K и 0,2K, округление до целого);
 * 3. сырой балл с поправкой переводится в Т-баллы по нормам для мужчин и женщин:
 *    T = 50 + 10 · (X − M) / σ.
 * Ключи, коэффициенты и нормы взяты из открытых публикаций методики; все данные собраны ниже,
 * чтобы их можно было сверить с первоисточником и поправить в одном месте.
 */

export type SmolCode = 'L' | 'F' | 'K' | 'Hs' | 'D' | 'Hy' | 'Pd' | 'Pa' | 'Pt' | 'Sc' | 'Ma';

/** Порядок шкал в заключении: восемь основных, затем контрольные */
export const SMOL_CODES: SmolCode[] = ['Hs', 'D', 'Hy', 'Pd', 'Pa', 'Pt', 'Sc', 'Ma', 'L', 'F', 'K'];

/** Номера утверждений бланка (с 1); за каждое совпадение шкала получает балл: yes — «Верно», no — «Неверно» */
const KEY: Record<SmolCode, { yes: number[]; no: number[] }> = {
  L: { yes: [], no: [5, 11, 24, 47, 53] },
  F: { yes: [9, 12, 15, 19, 30, 38, 48, 49, 58, 59, 64, 71], no: [22, 24, 61] },
  K: { yes: [], no: [11, 23, 31, 33, 34, 36, 40, 41, 43, 51, 56, 61, 65, 67, 69, 70] },
  Hs: { yes: [9, 18, 26, 32, 44, 46, 55, 62, 63], no: [1, 2, 6, 37, 45] },
  D: { yes: [9, 13, 17, 18, 22, 25, 36, 44], no: [1, 3, 6, 11, 28, 37, 40, 42, 60, 61, 65] },
  Hy: { yes: [9, 13, 18, 26, 44, 46, 55, 57, 62], no: [1, 2, 3, 11, 23, 28, 29, 31, 33, 35, 37, 40, 41, 43, 45, 50, 56] },
  Pd: { yes: [7, 10, 13, 14, 15, 16, 22, 27, 52, 58, 71], no: [3, 28, 34, 35, 41, 43, 50, 65] },
  Pa: { yes: [5, 8, 10, 15, 30, 39, 63, 64, 66, 68], no: [28, 29, 31, 67] },
  Pt: { yes: [5, 8, 13, 17, 22, 25, 27, 36, 44, 51, 57, 66, 68], no: [2, 3, 42] },
  Sc: { yes: [5, 7, 8, 10, 13, 14, 15, 16, 17, 26, 30, 38, 39, 46, 57, 63, 64, 66], no: [3, 42] },
  Ma: { yes: [4, 7, 8, 21, 29, 34, 38, 39, 54, 57, 60], no: [43] },
};

/**
 * В публикациях ключа утверждения 26 и 27 стоят наоборот относительно текста бланка: в ключе 26 входит в шкалы
 * Hs, Hy и Sc (телесные жалобы), а 27 — в Pd и Pt (чувство вины). В бланке под 26 — «чувство, будто сделали что-то
 * неправильное», под 27 — «подёргивания в мышцах». Чтобы телесная жалоба попадала в телесные шкалы, номера
 * ключа 26 и 27 меняются местами.
 */
const KEY_TO_BLANK: Record<number, number> = { 26: 27, 27: 26 };
const itemIndex = (n: number) => (KEY_TO_BLANK[n] ?? n) - 1;

const YES = SMOL_ANSWERS.indexOf('Верно');
const NO = SMOL_ANSWERS.indexOf('Неверно');

/** Доля K, добавляемая к сырому баллу шкалы */
const K_SHARE: Partial<Record<SmolCode, number>> = { Hs: 0.5, Pd: 0.4, Pt: 1, Sc: 1, Ma: 0.2 };

/** Нормы [M, σ] сырых баллов (для Hs, Pd, Pt, Sc и Ma — с поправкой на K) */
const NORMS: Record<SmolCode, { male: [number, number]; female: [number, number] }> = {
  L: { male: [1.48, 1.23], female: [1.51, 1.19] },
  F: { male: [3.1, 2.3], female: [2.64, 1.71] },
  K: { male: [7.68, 3.42], female: [7.72, 2.64] },
  Hs: { male: [7.24, 3], female: [8.47, 2.92] },
  D: { male: [7.02, 2.68], female: [7.96, 3] },
  Hy: { male: [9.73, 2.91], female: [11.53, 3.38] },
  Pd: { male: [10.39, 2.13], female: [9.76, 1.9] },
  Pa: { male: [4.03, 1.74], female: [4.77, 2] },
  Pt: { male: [13.57, 2.51], female: [14.48, 2.27] },
  Sc: { male: [13.68, 2.83], female: [13.52, 2.8] },
  Ma: { male: [6.23, 1.55], female: [6.35, 1.91] },
};

/** Шкала Т в заключении идёт от 0 до 110 */
const T_MAX = 110;

/** Границы достоверности профиля (Т-баллы): выше них ответы считаются сомнительными */
const VALIDITY_LIMITS: { code: 'L' | 'F' | 'K'; limit: number; reason: string }[] = [
  { code: 'L', limit: 70, reason: 'L выше 70 — склонность давать социально желательные ответы' },
  { code: 'F', limit: 80, reason: 'F выше 80 — ответы могли быть случайными или сильно преувеличивать трудности' },
  { code: 'K', limit: 70, reason: 'K выше 70 — выраженная защитная установка' },
];

export interface SmolScores {
  /** Сырые баллы по ключу */
  raw: Record<SmolCode, number>;
  /** Сырые баллы с поправкой на K */
  corrected: Record<SmolCode, number>;
  /** Т-баллы */
  t: Record<SmolCode, number>;
  /** Вывод по контрольным шкалам: согласованность ответов и возможность интерпретации */
  validity: { ok: boolean; text: string };
}

/**
 * Подсчёт по ответам: индекс ответа на утверждение i (от 0) — 0 «Верно» или 1 «Неверно», как в бланке.
 * Неотвеченные утверждения баллов не дают.
 */
export function scoreSmol(answers: ReadonlyArray<number | undefined>, female: boolean): SmolScores {
  const raw = {} as Record<SmolCode, number>;
  const corrected = {} as Record<SmolCode, number>;
  const t = {} as Record<SmolCode, number>;

  for (const code of SMOL_CODES) {
    const { yes, no } = KEY[code];
    raw[code] =
      yes.filter((n) => answers[itemIndex(n)] === YES).length + no.filter((n) => answers[itemIndex(n)] === NO).length;
  }
  for (const code of SMOL_CODES) {
    corrected[code] = raw[code] + Math.round((K_SHARE[code] ?? 0) * raw.K);
    const [m, sigma] = NORMS[code][female ? 'female' : 'male'];
    t[code] = Math.min(T_MAX, Math.max(0, Math.round(50 + (10 * (corrected[code] - m)) / sigma)));
  }

  const issues = VALIDITY_LIMITS.filter(({ code, limit }) => t[code] > limit).map(({ reason }) => reason);
  const validity = issues.length
    ? { ok: false, text: `Профиль требует осторожной интерпретации: ${issues.join('; ')}.` }
    : { ok: true, text: 'Ответы согласованы — профиль можно интерпретировать.' };

  return { raw, corrected, t, validity };
}
