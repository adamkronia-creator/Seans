/*
 * Текст для поиска по-русски, без библиотек: слова, основа слова, расстояние между словами и раскладка клавиатуры.
 * Работает и в браузере, и в Node (на нём этот файл проверяет scripts/test-library.mjs).
 */

const VOWELS = 'аеиоуыэюя';

/** Нижний регистр, «ё» как «е»; всё, кроме букв и цифр (знаки, дефисы, скобки), — пробел */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/g, ' ')
    .trim();
}

/** Слова строки: уже нормализованные */
export function words(text: string): string[] {
  const n = normalize(text);
  return n ? n.split(' ') : [];
}

const LATIN = /^[a-z]+$/;
const DIGITS = /^\d+$/;
const MIXED = /^(?:[a-z]+\d+|\d+[a-z]+)$/;

/**
 * Слова для индекса: как в тексте, а названия методик ещё и в обеих записях:
 * «PHQ-9» находят и как «phq9», и как «phq 9»; «5PFQ» — и целиком, и по частям.
 */
export function indexWords(text: string): string[] {
  const list = words(text);
  const out = [...list];
  list.forEach((w, i) => {
    if (MIXED.test(w)) out.push(...(w.match(/[a-z]+|\d+/g) ?? []));
    const next = list[i + 1];
    if (next && ((LATIN.test(w) && DIGITS.test(next)) || (DIGITS.test(w) && LATIN.test(next)))) out.push(w + next);
  });
  return out;
}

export const isNumber = (w: string) => DIGITS.test(w);

// ——— Основа слова: упрощённый «Snowball» для русского ———
// Окончания и суффиксы срезаются по порядку, как в стеммере Портера для русского, так что «тревожность», «тревожности»
// и «тревожный» сходятся в одну основу. Слова чужих языков и числа не меняются.

const longestFirst = (list: string[]) => [...list].sort((a, b) => b.length - a.length);

// После «а» или «я»
const PERFECTIVE_1 = longestFirst(['вшись', 'вши', 'в']);
const PERFECTIVE_2 = longestFirst(['ившись', 'ывшись', 'ивши', 'ывши', 'ив', 'ыв']);
const ADJECTIVE = longestFirst(['ее', 'ие', 'ые', 'ое', 'ими', 'ыми', 'ей', 'ий', 'ый', 'ой', 'ем', 'им', 'ым', 'ом', 'его', 'ого', 'ему', 'ому', 'их', 'ых', 'ую', 'юю', 'ая', 'яя', 'ою', 'ею']);
// После «а» или «я»
const PARTICIPLE_1 = longestFirst(['ем', 'нн', 'вш', 'ющ', 'щ']);
const PARTICIPLE_2 = longestFirst(['ивш', 'ывш', 'ующ']);
const REFLEXIVE = ['ся', 'сь'];
// После «а» или «я»
const VERB_1 = longestFirst(['ла', 'на', 'ете', 'йте', 'ли', 'й', 'л', 'ем', 'н', 'ло', 'но', 'ет', 'ют', 'ны', 'ть', 'ешь', 'нно']);
const VERB_2 = longestFirst(['ила', 'ыла', 'ена', 'ейте', 'уйте', 'ите', 'или', 'ыли', 'ей', 'уй', 'ил', 'ыл', 'им', 'ым', 'ен', 'ило', 'ыло', 'ено', 'ят', 'ует', 'уют', 'ит', 'ыт', 'ены', 'ить', 'ыть', 'ишь', 'ую', 'ю']);
const NOUN = longestFirst(['а', 'ев', 'ов', 'ие', 'ье', 'е', 'иями', 'ями', 'ами', 'еи', 'ии', 'и', 'ией', 'ей', 'ой', 'ий', 'й', 'иям', 'ям', 'ием', 'ем', 'ам', 'ом', 'о', 'у', 'ах', 'иях', 'ях', 'ы', 'ь', 'ию', 'ью', 'ю', 'ия', 'ья', 'я']);
const SUPERLATIVE = longestFirst(['ейше', 'ейш']);
const DERIVATIONAL = longestFirst(['ость', 'ост']);

/** Самое длинное окончание из списка, которое целиком лежит в области [from, конец]; afterAYa — только после «а» или «я» */
function ending(w: string, from: number, list: string[], afterAYa = false): string | null {
  for (const s of list) {
    const start = w.length - s.length;
    if (start < from || !w.endsWith(s)) continue;
    if (afterAYa && !(start - 1 >= from && (w[start - 1] === 'а' || w[start - 1] === 'я'))) continue;
    return s;
  }
  return null;
}

const longer = (a: string | null, b: string | null) => (a && b ? (a.length >= b.length ? a : b) : (a ?? b));

/** Начало области R2: после второго «гласная + согласная» с начала слова */
function regionR2(word: string): number {
  const isVowel = (c: string) => VOWELS.includes(c);
  const region = (from: number) => {
    for (let i = from; i < word.length - 1; i++) if (isVowel(word[i]) && !isVowel(word[i + 1])) return i + 2;
    return word.length;
  };
  return region(region(0));
}

const stems = new Map<string, string>();

/** Основа слова: «тревожности» → «тревожн». Для не русских слов и чисел — само слово */
export function stem(word: string): string {
  if (word.length < 3 || !/^[а-я]+$/.test(word)) return word;
  const cached = stems.get(word);
  if (cached !== undefined) return cached;
  let rv = -1;
  for (let i = 0; i < word.length; i++) {
    if (VOWELS.includes(word[i])) {
      rv = i + 1;
      break;
    }
  }
  let w = word;
  if (rv >= 0 && rv < word.length) {
    const r2 = regionR2(word);
    // Шаг 1: деепричастие; иначе (возвратное) + прилагательное с причастием, глагол или существительное
    const gerund = longer(ending(w, rv, PERFECTIVE_1, true), ending(w, rv, PERFECTIVE_2));
    if (gerund) w = w.slice(0, -gerund.length);
    else {
      const reflexive = ending(w, rv, REFLEXIVE);
      if (reflexive) w = w.slice(0, -reflexive.length);
      const adjective = ending(w, rv, ADJECTIVE);
      if (adjective) {
        w = w.slice(0, -adjective.length);
        const participle = longer(ending(w, rv, PARTICIPLE_1, true), ending(w, rv, PARTICIPLE_2));
        if (participle) w = w.slice(0, -participle.length);
      } else {
        const verb = longer(ending(w, rv, VERB_1, true), ending(w, rv, VERB_2));
        if (verb) w = w.slice(0, -verb.length);
        else {
          const noun = ending(w, rv, NOUN);
          if (noun) w = w.slice(0, -noun.length);
        }
      }
    }
    // Шаг 2: «и» на конце
    if (w.endsWith('и') && w.length - 1 >= rv) w = w.slice(0, -1);
    // Шаг 3: «ость» / «ост» в области R2
    const derivational = ending(w, r2, DERIVATIONAL);
    if (derivational) w = w.slice(0, -derivational.length);
    // Шаг 4: «нн» → «н»; превосходная степень; мягкий знак
    if (w.endsWith('нн')) w = w.slice(0, -1);
    else {
      const superlative = ending(w, rv, SUPERLATIVE);
      if (superlative) {
        w = w.slice(0, -superlative.length);
        if (w.endsWith('нн')) w = w.slice(0, -1);
      } else if (w.endsWith('ь') && w.length - 1 >= rv) w = w.slice(0, -1);
    }
  }
  stems.set(word, w);
  return w;
}

/** Длина общего начала двух слов */
export function commonPrefix(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i;
}

/** Расстояние Дамерау — Левенштейна (замена, вставка, удаление, перестановка соседних букв); больше max — max + 1 */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const n = a.length;
  const m = b.length;
  let older: number[] | null = null;
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (older && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, older[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    older = prev;
    prev = cur;
  }
  return Math.min(prev[m], max + 1);
}

// ——— Раскладка: «nhtdj;yjcnm» → «тревожность» ———

const RU_KEYS = 'йцукенгшщзхъфывапролджэячсмитьбю';
const EN_KEYS = "qwertyuiop[]asdfghjkl;'zxcvbnm,.";

/** Набранное не на той раскладке: русские буквы превращает в латинские клавиши, остальное — в русские. Если менять нечего, вернёт то же самое */
export function swapLayout(text: string): string {
  const lower = text.toLowerCase();
  const toLatin = /[а-яё]/.test(lower);
  const from = toLatin ? RU_KEYS : EN_KEYS;
  const to = toLatin ? EN_KEYS : RU_KEYS;
  let out = '';
  for (const ch of lower) {
    const i = from.indexOf(ch);
    out += i >= 0 ? to[i] : ch;
  }
  return out;
}
