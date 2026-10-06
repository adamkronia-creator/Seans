import { SMOL_INTERPRETATION, type ScaleLevel } from './smolInterpretation';

/*
 * Пример заключения по тесту СМОЛ: условный результат клиента (23 года, мужская форма),
 * по которому показаны все шкалы и расшифровка диапазонов, как увидит психолог.
 */

export type { ScaleLevel };

export interface ConclusionScale {
  code: string;
  name: string;
  group: 'main' | 'extra';
  score: number;
  /** Что измеряет шкала (продолжение после «—») */
  about: string;
}

export const SMOL_MAX = 110;

/** Диапазоны: границы, подписи и цвет (низкий — жёлтый, средний — зелёный, высокий — красный) */
export const LEVELS: Record<ScaleLevel, { range: string; legend: string; chip: string; verdict: string; tone: 'yellow' | 'green' | 'red' }> = {
  low: { range: '0 — 39', legend: 'Низкий', chip: 'Низкий', verdict: 'низким', tone: 'yellow' },
  mid: { range: '40 — 69', legend: 'Средний', chip: 'Нормативный', verdict: 'средним нормативным', tone: 'green' },
  high: { range: '70 — 110', legend: 'Высокий', chip: 'Высокий', verdict: 'высоким', tone: 'red' },
};

export const LEVEL_ORDER: ScaleLevel[] = ['low', 'mid', 'high'];

export const levelOf = (score: number): ScaleLevel => (score < 40 ? 'low' : score < 70 ? 'mid' : 'high');

/** Расшифровка диапазона: личность, эмоции, поведение */
export const interpretation = (code: string, level: ScaleLevel) => SMOL_INTERPRETATION[code][level];

export const SMOL_CONCLUSION = {
  info: { date: '25.05.2026', time: '20:28–20:46', duration: '18 мин. 43 с.', age: '23 года' },
  scales: [
    { code: 'Hs', name: 'Ипохондрия', group: 'main', score: 55, about: 'оценивает озабоченность человека своим физическим здоровьем, которая появляется при соматизации тревоги и напряжения.' },
    { code: 'D', name: 'Депрессия', group: 'main', score: 71, about: 'оценивает уровень сниженного настроения, пессимизма и неуверенности в собственных силах.' },
    { code: 'Hy', name: 'Истерия', group: 'main', score: 63, about: 'оценивает эмоциональную реактивность, потребность во внимании и склонность реагировать на стресс демонстративно или через телесные проявления.' },
    { code: 'Pd', name: 'Психопатия', group: 'main', score: 79, about: 'оценивает степень независимости, импульсивности и готовности нарушать социальные нормы и ограничения.' },
    { code: 'Pa', name: 'Паранойяльность', group: 'main', score: 69, about: 'оценивает подозрительность, ригидность взглядов и чувствительность к критике и несправедливости.' },
    { code: 'Pt', name: 'Психастения', group: 'main', score: 65, about: 'оценивает уровень тревожности, нерешительности и склонность к навязчивым сомнениям и перепроверке.' },
    { code: 'Sc', name: 'Шизоидность', group: 'main', score: 38, about: 'оценивает отстраненность от окружающих, потребность в психологической дистанции и особенности эмоционального контакта.' },
    { code: 'Ma', name: 'Гипомания', group: 'main', score: 73, about: 'оценивает уровень активности, энергичности и эмоционального подъема.' },
    { code: 'L', name: 'Ложь', group: 'extra', score: 55, about: 'контрольная шкала, оценивает стремление представить себя в социально желательном свете.' },
    { code: 'F', name: 'Достоверность', group: 'extra', score: 71, about: 'контрольная шкала, оценивает достоверность результатов: необычность ответов и возможное преувеличение проблем.' },
    { code: 'K', name: 'Коррекция', group: 'extra', score: 63, about: 'контрольная шкала, оценивает степень психологической защиты и склонность скрывать или смягчать собственные трудности.' },
  ] satisfies ConclusionScale[],
};
