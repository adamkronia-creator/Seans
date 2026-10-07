import { SMOL_INTERPRETATION } from './smolInterpretation';

/*
 * Примеры заключений: условный результат клиента (мужская форма), по которому показаны все шкалы
 * и расшифровка диапазонов, как увидит психолог. Структура общая для всех тестов.
 */

export type LevelTone = 'green' | 'yellow' | 'orange' | 'red';

/** Диапазон баллов шкалы: границы, подписи и цвет */
export interface ConclusionLevel {
  key: string;
  from: number;
  to: number;
  /** Подпись диапазона в заголовке расшифровки: «40 — 69» */
  range: string;
  /** Подпись в легенде диаграммы и в чипе расшифровки */
  legend: string;
  chip: string;
  tone: LevelTone;
  /** «…что» + verdictPre + выделенное verdict + verdictPost */
  verdictPre: string;
  verdict: string;
  verdictPost: string;
}

export interface ConclusionScale {
  code: string;
  name: string;
  group: 'main' | 'extra';
  score: number;
  /** Максимум шкалы */
  max: number;
  /** Делится ли шкала на диапазоны (иначе только баллы) */
  leveled: boolean;
  /** Что измеряет шкала (продолжение после «—») */
  about: string;
}

export interface ConclusionData {
  /** Возраст есть не всегда: при самостоятельном прохождении его не спрашивают, строка тогда скрыта */
  info: { date: string; time: string; duration: string; age?: string };
  /** Показывать ли общие диаграммы основных и дополнительных шкал и метки «Шкала …» */
  overview: boolean;
  /** Максимум шкал с диапазонами */
  max: number;
  levels: ConclusionLevel[];
  /** Подписи оси диаграммы */
  ticks: number[];
  scales: ConclusionScale[];
  /** Расшифровка: код шкалы → ключ диапазона → абзацы */
  interpretation: Record<string, Record<string, string[]>>;
  /** Диаграмма-профиль основных шкал (пики) */
  profile?: boolean;
  /** Вывод по контрольным шкалам: согласованность ответов и возможность интерпретации */
  validity?: { ok: boolean; text: string };
}

export const levelOf = (data: ConclusionData, score: number): ConclusionLevel =>
  data.levels.find((l) => score >= l.from && score <= l.to) ?? data.levels[data.levels.length - 1];

const SMOL: ConclusionData = {
  overview: true,
  info: { date: '25.05.2026', time: '20:28–20:46', duration: '18 мин. 43 с.', age: '23 года' },
  max: 110,
  ticks: [0, 40, 70, 110],
  levels: [
    { key: 'low', from: 0, to: 39, range: '0 — 39', legend: 'Низкий', chip: 'Низкий', tone: 'yellow', verdictPre: 'является ', verdict: 'низким', verdictPost: ' показателем' },
    { key: 'mid', from: 40, to: 69, range: '40 — 69', legend: 'Средний', chip: 'Нормативный', tone: 'green', verdictPre: 'является ', verdict: 'средним нормативным', verdictPost: ' показателем' },
    { key: 'high', from: 70, to: 110, range: '70 — 110', legend: 'Высокий', chip: 'Высокий', tone: 'red', verdictPre: 'является ', verdict: 'высоким', verdictPost: ' показателем, выходящим за рамки нормативного диапазона' },
  ],
  scales: [
    { code: 'Hs', name: 'Ипохондрия', group: 'main', max: 110, leveled: true, score: 55, about: 'оценивает озабоченность человека своим физическим здоровьем и склонность выражать тревогу и напряжение через телесные ощущения.' },
    { code: 'D', name: 'Депрессия', group: 'main', max: 110, leveled: true, score: 71, about: 'отражает склонность к снижению настроения, неуверенности, самокритике, сомнениям и пессимистичной оценке себя и ситуации.' },
    { code: 'Hy', name: 'Истерия', group: 'main', max: 110, leveled: true, score: 63, about: 'оценивает эмоциональную лабильность, стремление получать внимание и склонность выражать психологическое напряжение через эмоциональные и телесные реакции.' },
    { code: 'Pd', name: 'Психопатия', group: 'main', max: 110, leveled: true, score: 79, about: 'отражает импульсивность, стремление к независимости, низкую терпимость к ограничениям и склонность действовать вопреки правилам.' },
    { code: 'Pa', name: 'Паранойяльность', group: 'main', max: 110, leveled: true, score: 69, about: 'оценивает ригидность убеждений, настороженность, чувствительность к критике и склонность отстаивать собственную позицию.' },
    { code: 'Pt', name: 'Психастения', group: 'main', max: 110, leveled: true, score: 65, about: 'отражает тревожность, сомнительность, нерешительность, стремление к контролю и склонность многократно обдумывать решения.' },
    { code: 'Sc', name: 'Шизоидность', group: 'main', max: 110, leveled: true, score: 38, about: 'оценивает индивидуалистичность, потребность в психологической дистанции, склонность к уединению и погружению в собственные интересы.' },
    { code: 'Ma', name: 'Гипомания', group: 'main', max: 110, leveled: true, score: 73, about: 'отражает повышенный жизненный тонус, активность, оптимизм, общительность, стремление к новым впечатлениям и быструю смену интересов.' },
    { code: 'L', name: 'Ложь', group: 'extra', max: 110, leveled: true, score: 55, about: 'оценивает стремление представить себя в социально одобряемом свете, отрицать недостатки и давать чрезмерно благоприятную самооценку.' },
    { code: 'F', name: 'Достоверность', group: 'extra', max: 110, leveled: true, score: 71, about: 'оценивает необычность ответов и выраженность психологического напряжения; помогает выявлять особенности состояния и достоверности профиля.' },
    { code: 'K', name: 'Коррекция', group: 'extra', max: 110, leveled: true, score: 63, about: 'отражает стремление контролировать самопрезентацию, скрывать трудности и защищать положительный образ себя при прохождении теста.' },
  ],
  interpretation: SMOL_INTERPRETATION,
  profile: true,
  validity: { ok: true, text: 'Ответы согласованы — профиль можно интерпретировать.' },
};

const BDI: ConclusionData = {
  overview: false,
  info: { date: '25.05.2026', time: '19:12–19:16', duration: '4 мин. 12 с.', age: '23 года' },
  max: 63,
  ticks: [0, 10, 19, 30, 63],
  levels: [
    { key: 'none', from: 0, to: 9, range: '0 — 9', legend: 'Нет симптомов', chip: 'Нет симптомов', tone: 'green', verdictPre: 'соответствует уровню: ', verdict: 'отсутствие депрессивных симптомов', verdictPost: '' },
    { key: 'mild', from: 10, to: 18, range: '10 — 18', legend: 'Легкая', chip: 'Легкая депрессия', tone: 'yellow', verdictPre: 'соответствует уровню: ', verdict: 'легкая депрессия', verdictPost: '' },
    { key: 'moderate', from: 19, to: 29, range: '19 — 29', legend: 'Средняя', chip: 'Средняя депрессия', tone: 'orange', verdictPre: 'соответствует уровню: ', verdict: 'средняя депрессия', verdictPost: '' },
    { key: 'severe', from: 30, to: 63, range: '30 — 63', legend: 'Тяжелая', chip: 'Тяжелая депрессия', tone: 'red', verdictPre: 'соответствует уровню: ', verdict: 'тяжелая депрессия', verdictPost: '' },
  ],
  scales: [
    { code: 'D', name: 'Депрессия', group: 'main', score: 22, max: 63, leveled: true, about: 'оценивает общую выраженность депрессивной симптоматики на момент обследования: сниженное настроение, пессимизм, чувство вины, снижение активности и соматические проявления.' },
    { code: 'КА', name: 'Когнитивно-аффективные проявления', group: 'extra', score: 14, max: 39, leveled: false, about: 'оценивает когнитивные и эмоциональные проявления депрессии: сниженное настроение, пессимизм, чувство вины и неудачи, самокритику и неудовлетворенность собой.' },
    { code: 'С', name: 'Соматические проявления', group: 'extra', score: 8, max: 24, leveled: false, about: 'оценивает телесные проявления депрессии: утомляемость, нарушения сна и аппетита, снижение работоспособности и интереса к жизни.' },
  ],
  interpretation: {
    D: {
      none: [
        'Выраженных депрессивных симптомов не выявлено. Настроение, интерес к деятельности, сон и аппетит находятся в пределах обычных колебаний.',
        'Показатель не указывает на необходимость специального вмешательства; при изменении состояния тест можно повторить для сравнения.',
      ],
      mild: [
        'Отмечаются отдельные симптомы сниженного настроения, повышенной утомляемости или снижения интереса, которые могут быть связаны с текущим стрессом или переутомлением.',
        'Рекомендуется наблюдение за динамикой состояния и обсуждение выявленных симптомов с клиентом.',
      ],
      moderate: [
        'Депрессивные симптомы выражены заметно: сниженное настроение, самокритика, снижение активности и работоспособности, нарушения сна и аппетита.',
        'Состояние может ощутимо влиять на повседневное функционирование клиента и требует внимания в рамках терапевтической работы.',
      ],
      severe: [
        'Депрессивная симптоматика выражена значительно: устойчиво подавленное настроение, чувство вины и неполноценности, выраженное снижение активности, соматические нарушения.',
        'Показатель требует уточнения состояния клиента, оценки рисков, в том числе суицидальных мыслей, и обсуждения дальнейшей помощи.',
      ],
    },
  },
};

const BHS: ConclusionData = {
  overview: false,
  info: { date: '25.05.2026', time: '19:12–19:16', duration: '3 мин. 40 с.', age: '23 года' },
  max: 20,
  ticks: [0, 4, 9, 15, 20],
  levels: [
    { key: 'min', from: 0, to: 3, range: '0 — 3', legend: 'Минимальная', chip: 'Минимальная безнадежность', tone: 'green', verdictPre: 'соответствует уровню: ', verdict: 'минимальная безнадежность', verdictPost: '' },
    { key: 'mild', from: 4, to: 8, range: '4 — 8', legend: 'Легкая', chip: 'Легкая безнадежность', tone: 'yellow', verdictPre: 'соответствует уровню: ', verdict: 'легкая безнадежность', verdictPost: '' },
    { key: 'moderate', from: 9, to: 14, range: '9 — 14', legend: 'Умеренная', chip: 'Умеренная безнадежность', tone: 'orange', verdictPre: 'соответствует уровню: ', verdict: 'умеренная безнадежность', verdictPost: '' },
    { key: 'severe', from: 15, to: 20, range: '15 — 20', legend: 'Тяжелая', chip: 'Тяжелая безнадежность', tone: 'red', verdictPre: 'соответствует уровню: ', verdict: 'тяжелая безнадежность', verdictPost: '' },
  ],
  scales: [
    { code: 'H', name: 'Безнадежность', group: 'main', score: 11, max: 20, leveled: true, about: 'оценивает негативные ожидания относительно будущего, пессимизм, утрату надежды и убежденность в невозможности положительных изменений.' },
  ],
  interpretation: {
    H: {
      min: ['Негативные ожидания относительно будущего выражены минимально или отсутствуют. Человек в целом сохраняет надежду, способность видеть положительные возможности и строить планы.'],
      mild: ['Отмечается умеренное снижение оптимизма и отдельные негативные ожидания относительно будущего. Надежда и ориентация на достижение целей в целом сохраняются.'],
      moderate: ['Выражены негативные представления о будущем, снижение уверенности в возможности положительных изменений и трудности в формировании позитивных планов. Такой уровень требует внимательной клинической оценки.'],
      severe: ['Негативные ожидания относительно будущего выражены значительно. Характерны ощущение бесперспективности, убежденность в отсутствии положительных изменений и существенное снижение надежды. Необходима профессиональная оценка состояния.'],
    },
  },
};

/** Заключение по результату прохождения: баллы вместо условных, остальное (диапазоны, расшифровки) то же, что в примере */
function withScores(base: ConclusionData, scores: Record<string, number>, info: ConclusionData['info'], validity?: ConclusionData['validity']): ConclusionData {
  return { ...base, info, validity, scales: base.scales.map((s) => ({ ...s, score: scores[s.code] })) };
}

/** СМОЛ: Т-баллы по шкалам и вывод по контрольным шкалам */
export function smolResult(scores: Record<string, number>, info: ConclusionData['info'], validity: ConclusionData['validity']): ConclusionData {
  return withScores(SMOL, scores, info, validity);
}

/** BDI: общая сумма (шкала «Депрессия») и две подшкалы */
export function bdiResult(score: { total: number; cognitive: number; somatic: number }, info: ConclusionData['info']): ConclusionData {
  const [main, cognitive, somatic] = BDI.scales;
  return withScores(BDI, { [main.code]: score.total, [cognitive.code]: score.cognitive, [somatic.code]: score.somatic }, info);
}

/** BHS: сумма баллов безнадёжности */
export function bhsResult(score: number, info: ConclusionData['info']): ConclusionData {
  return withScores(BHS, { [BHS.scales[0].code]: score }, info);
}

/** Пример заключения для теста из библиотеки; у остальных тестов пока нет */
export function conclusionFor(testId: string): ConclusionData | undefined {
  return testId === 'smol' ? SMOL : testId === 'bdi' ? BDI : testId === 'bhs' ? BHS : undefined;
}
