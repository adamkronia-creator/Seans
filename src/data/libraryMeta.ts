import type { LibraryItem, LibraryTest } from './library';
import { plural } from './taskValues';
import { testSettings } from './testSettings';
import { topicsOf } from './topics';

/*
 * Сведения о тестах и заданиях для поиска, фильтров и сравнения: что материал оценивает, как долго длится, какой у него результат.
 *
 * У тестов длительность, число вопросов, возраст, формы и шкалы берутся из настроек теста (testSettings.ts), у заданий тексты
 * лежат в тяжёлом taskContent.ts, который список не подключает, поэтому их краткие сведения записаны здесь, а соответствие
 * проверяет scripts/test-library.mjs. Что материал оценивает (области) и к какому подходу относится — решение автора каталога.
 *
 * Новый материал попадает в поиск сам: название, описание и темы уже есть. Чтобы он появился ещё и в фильтрах, нужна запись
 * в TEST_META или TASK_META; без неё его можно найти по словам, а в фильтрах он стоит в пункте «Не указано».
 */

export type Kind = 'test' | 'task';

export interface Option {
  id: string;
  label: string;
  /** Понятия поиска, которые подразумевает пункт (см. libraryConcepts.ts) */
  concepts?: string[];
}

export interface FacetDef {
  id: string;
  label: string;
  options: Option[];
  /** Пункты строятся из данных (возраст): каждое найденное значение — свой пункт */
  dynamic?: boolean;
  labelOf?: (value: string) => string;
}

/** Строка сравнения: текст и, если это число, оно же для полоски */
export interface Fact {
  text: string;
  value?: number;
}

/** Пункт «Не указано»: у материала нет сведений для этого фильтра */
export const NONE = 'none';

// ——— Пункты фильтров ———

export const TEST_DOMAINS: Option[] = [
  { id: 'depression', label: 'Депрессия', concepts: ['depression'] },
  { id: 'anxiety', label: 'Тревога', concepts: ['anxiety'] },
  { id: 'suicide', label: 'Суицидальный риск', concepts: ['suicide'] },
  { id: 'personality', label: 'Личность и характер', concepts: ['personality'] },
  { id: 'selfesteem', label: 'Самооценка', concepts: ['selfesteem'] },
  { id: 'symptoms', label: 'Общая симптоматика', concepts: ['symptoms'] },
];

export const TASK_DOMAINS: Option[] = [
  { id: 'anxiety', label: 'Тревога', concepts: ['anxiety'] },
  { id: 'mood', label: 'Депрессия и выгорание', concepts: ['depression', 'burnout', 'activity'] },
  { id: 'guilt', label: 'Вина и ответственность', concepts: ['guilt'] },
  { id: 'thoughts', label: 'Мысли и убеждения', concepts: ['thoughts'] },
  { id: 'values', label: 'Ценности и желания', concepts: ['values'] },
];

export const APPROACHES: Option[] = [
  { id: 'cbt', label: 'КПТ' },
  { id: 'act', label: 'ACT' },
  { id: 'schema', label: 'Схема-терапия' },
  { id: 'psychodynamic', label: 'Психодинамика' },
];

export const TEST_RESULTS: Option[] = [
  { id: 'score', label: 'Общий балл' },
  { id: 'profile', label: 'Профиль по шкалам' },
];

export const TASK_SHAPES: Option[] = [
  { id: 'short', label: 'Короткий ответ' },
  { id: 'steps', label: 'Пошаговое' },
  { id: 'diary', label: 'Дневник' },
];

export const TIMES: Option[] = [
  { id: 'fast', label: 'До 5 минут' },
  { id: 'mid', label: '5–15 минут' },
  { id: 'long', label: 'Больше 15 минут' },
];

/** До 5 минут / до 15 / дольше: по верхней границе времени */
const timeOf = (minutes?: [number, number]): string[] => (minutes ? [minutes[1] <= 5 ? 'fast' : minutes[1] <= 15 ? 'mid' : 'long'] : []);

const ageLabel = (value: string) => `От ${value} лет`;

export const FACETS: Record<Kind, FacetDef[]> = {
  test: [
    { id: 'domain', label: 'Что оценивает', options: TEST_DOMAINS },
    { id: 'time', label: 'Время прохождения', options: TIMES },
    { id: 'result', label: 'Результат', options: TEST_RESULTS },
    { id: 'age', label: 'Возраст клиента', options: [], dynamic: true, labelOf: ageLabel },
  ],
  task: [
    { id: 'domain', label: 'С чем работает', options: TASK_DOMAINS },
    { id: 'approach', label: 'Подход', options: APPROACHES },
    { id: 'shape', label: 'Формат', options: TASK_SHAPES },
    { id: 'time', label: 'Время выполнения', options: TIMES },
    { id: 'age', label: 'Возраст клиента', options: [], dynamic: true, labelOf: ageLabel },
  ],
};

// ——— Записанное вручную ———

interface TestMeta {
  domains: string[];
  /** Другие названия: по ним ищут, но в карточке их нет */
  aliases: string[];
}

const TEST_META: Record<string, TestMeta> = {
  smol: { domains: ['personality', 'symptoms'], aliases: ['СМИЛ', 'MMPI', 'ММПИ', 'Мини-мульт', 'Миннесотский опросник', 'Зайцев'] },
  bhs: { domains: ['depression', 'suicide'], aliases: ['Шкала безнадежности', 'Бек', 'Hopelessness Scale'] },
  sq: { domains: ['personality'], aliases: ['Леонгард', 'Шмишек', 'Акцентуации характера', 'Акцентуированные личности'] },
  itt: { domains: ['anxiety'], aliases: ['Бехтерев', 'Экспресс-диагностика тревожности'] },
  bdi: { domains: ['depression'], aliases: ['BDI-I', 'Шкала Бека', 'Бек', 'Beck Depression Inventory', 'Инвентарь депрессии'] },
  ito: { domains: ['personality'], aliases: ['Собчик', 'Индивидуально-типологический опросник'] },
  ocr: { domains: ['suicide'], aliases: ['OSR', 'OCR', 'Шмелев', 'Разуваева'] },
  phq9: { domains: ['depression'], aliases: ['PHQ9', 'Patient Health Questionnaire', 'Скрининг депрессии'] },
  gad7: { domains: ['anxiety'], aliases: ['GAD7', 'Generalized Anxiety Disorder', 'ГТР', 'Скрининг тревоги'] },
  rses: { domains: ['selfesteem'], aliases: ['Розенберг', 'Rosenberg', 'Самоуважение'] },
  '5pfq': { domains: ['personality'], aliases: ['Big Five', 'Большая пятерка', 'Пять факторов', 'FFM'] },
  scl90: { domains: ['symptoms'], aliases: ['SCL90', 'SCL-90-R', 'Дерогатис', 'Derogatis', 'Симптоматический опросник'] },
};

interface TaskMeta {
  domains: string[];
  approaches: string[];
  /** short — один короткий ответ; steps — несколько шагов с оценками; diary — повторяющиеся записи */
  shape: 'short' | 'steps' | 'diary';
  /** Сколько занимает у клиента всего; у заданий «на запись» — для типичного числа записей */
  minutes: [number, number];
  /** Время так, как оно написано в настройках задания */
  duration: string;
  discussion: string;
  ageFrom: number;
  /** Типичный объём: сколько и как это называется */
  volume: [number, [string, string, string]];
  aliases: string[];
}

const TASK_META: Record<string, TaskMeta> = {
  evidence: {
    domains: ['thoughts'],
    approaches: ['cbt'],
    shape: 'steps',
    minutes: [15, 20],
    duration: '15–20 мин',
    discussion: '10–15 мин',
    ageFrom: 16,
    volume: [1, ['мысль', 'мысли', 'мыслей']],
    aliases: ['Судебный процесс', 'Проверка мыслей', 'Когнитивная реструктуризация', 'Доказательства за и против'],
  },
  pie: {
    domains: ['guilt'],
    approaches: ['cbt'],
    shape: 'steps',
    minutes: [10, 15],
    duration: '10–15 мин',
    discussion: '10–15 мин',
    ageFrom: 16,
    volume: [1, ['событие', 'события', 'событий']],
    aliases: ['Круг ответственности', 'Responsibility pie', 'Пирог вины'],
  },
  smer: {
    domains: ['thoughts'],
    approaches: ['cbt'],
    shape: 'diary',
    minutes: [15, 21],
    duration: '5–7 мин на запись',
    discussion: '10–15 мин',
    ageFrom: 16,
    volume: [3, ['запись', 'записи', 'записей']],
    aliases: ['Ситуация мысль эмоция реакция', 'Дневник мыслей', 'Дневник эмоций'],
  },
  activation: {
    domains: ['mood'],
    approaches: ['cbt'],
    shape: 'diary',
    minutes: [9, 15],
    duration: '3–5 мин на дело',
    discussion: '10–15 мин',
    ageFrom: 16,
    volume: [3, ['дело', 'дела', 'дел']],
    aliases: ['Планирование дел', 'Расписание активности', 'Behavioral activation', 'План приятных дел'],
  },
  worry: {
    domains: ['anxiety'],
    approaches: ['cbt'],
    shape: 'diary',
    minutes: [9, 15],
    duration: '3–5 мин на беспокойство',
    discussion: '10–15 мин',
    ageFrom: 16,
    volume: [3, ['беспокойство', 'беспокойства', 'беспокойств']],
    aliases: ['Время для беспокойства', 'Worry time', 'Откладывание тревоги'],
  },
  should: {
    domains: ['thoughts'],
    approaches: ['cbt'],
    shape: 'short',
    minutes: [5, 10],
    duration: '5–10 мин',
    discussion: '5–10 мин',
    ageFrom: 16,
    volume: [10, ['предложение', 'предложения', 'предложений']],
    aliases: ['Долженствования', 'Я должен', 'Эллис'],
  },
  choice: {
    domains: ['values'],
    approaches: ['act'],
    shape: 'short',
    minutes: [5, 10],
    duration: '5–10 мин',
    discussion: '5–10 мин',
    ageFrom: 16,
    volume: [3, ['решение', 'решения', 'решений']],
    aliases: ['Принятие решений', 'Неопределенность', 'Прояснение ценностей'],
  },
  phrase: {
    domains: ['thoughts'],
    approaches: ['schema', 'psychodynamic'],
    shape: 'short',
    minutes: [5, 10],
    duration: '5–10 мин',
    discussion: '5–15 мин',
    ageFrom: 16,
    volume: [1, ['фраза', 'фразы', 'фраз']],
    aliases: ['Детские фразы', 'Родительские послания', 'Ранние убеждения'],
  },
  secret: {
    domains: ['values'],
    approaches: ['act'],
    shape: 'short',
    minutes: [3, 5],
    duration: '3–5 мин',
    discussion: '5–10 мин',
    ageFrom: 16,
    volume: [1, ['вопрос', 'вопроса', 'вопросов']],
    aliases: ['Если бы никто не узнал', 'Тайные желания', 'Свобода выбора'],
  },
};

// ——— Сведения о материале ———

export interface Described {
  /** Значения фильтров: идентификатор фильтра → идентификаторы пунктов; пусто — не указано */
  facets: Record<string, string[]>;
  /** Строка под описанием в карточке: у теста «71 вопрос», «15–20 мин», «16+»; у задания «Дневник», «КПТ», «5–7 мин на запись» */
  line: string[];
  /** Строки сравнения */
  facts: Record<string, Fact>;
  /** Сколько времени занимает: для сортировки по длительности */
  minutes?: [number, number];
  aliases: string[];
  topics: string[];
  scales: string[];
  /** Подписи областей, подходов и формата для поиска и сравнения */
  domains: string[];
  approaches: string[];
  format?: string;
  /** Понятия, которые материал называет явно (области) */
  concepts: string[];
}

const labelOf = (list: Option[], ids: string[]) => ids.map((id) => list.find((o) => o.id === id)?.label).filter((l): l is string => !!l);

function conceptsOf(list: Option[], ids: string[]): string[] {
  return [...new Set(ids.flatMap((id) => list.find((o) => o.id === id)?.concepts ?? []))];
}

/** «15–20 мин.» → [15, 20]; «5 мин.» → [5, 5] */
export function parseMinutes(text?: string): [number, number] | undefined {
  const m = text?.match(/(\d+)(?:\s*[–—-]\s*(\d+))?/);
  return m ? [Number(m[1]), Number(m[2] ?? m[1])] : undefined;
}

/** «16+» → 16 */
export function parseAge(text?: string): number | undefined {
  const m = text?.match(/(\d+)\s*\+/);
  return m ? Number(m[1]) : undefined;
}

const noDot = (text?: string) => text?.replace(/\.$/, '');

function describeTest(item: LibraryItem): Described {
  const meta = TEST_META[item.id];
  const s = testSettings(item as LibraryTest);
  const minutes = parseMinutes(s.duration);
  const ageFrom = parseAge(s.age);
  const scales = [...(s.scales?.main ?? []), ...(s.scales?.extra ?? [])];
  const mainCount = s.scales?.main.length ?? 0;
  const result = mainCount === 0 ? [] : [mainCount === 1 ? 'score' : 'profile'];
  const domains = meta?.domains ?? [];
  const questions = s.questions !== undefined ? `${s.questions} ${plural(s.questions, ['вопрос', 'вопроса', 'вопросов'])}` : undefined;
  const duration = noDot(s.duration);

  const facts: Record<string, Fact> = {};
  if (domains.length) facts.domain = { text: labelOf(TEST_DOMAINS, domains).join(', ') };
  if (duration && minutes) facts.time = { text: duration, value: minutes[1] };
  if (questions) facts.size = { text: questions, value: s.questions };
  if (scales.length) facts.scales = { text: String(scales.length), value: scales.length };
  if (result.length) facts.result = { text: labelOf(TEST_RESULTS, result)[0] };
  if (ageFrom) facts.age = { text: `${ageFrom}+` };
  if (s.forms?.length) facts.forms = { text: s.forms.join(', ') };

  return {
    facets: { domain: domains, time: timeOf(minutes), result, age: ageFrom ? [String(ageFrom)] : [] },
    line: [questions, duration, s.age].filter((p): p is string => !!p),
    facts,
    minutes,
    aliases: meta?.aliases ?? [],
    topics: topicsOf(item.id),
    scales,
    domains: labelOf(TEST_DOMAINS, domains),
    approaches: [],
    format: result.length ? labelOf(TEST_RESULTS, result)[0] : undefined,
    concepts: conceptsOf(TEST_DOMAINS, domains),
  };
}

function describeTask(item: LibraryItem): Described {
  const meta = TASK_META[item.id];
  if (!meta) {
    return { facets: { domain: [], approach: [], shape: [], time: [], age: [] }, line: [], facts: {}, aliases: [], topics: topicsOf(item.id), scales: [], domains: [], approaches: [], concepts: [] };
  }
  const [count, forms] = meta.volume;
  const volume = `${count} ${plural(count, forms)}`;
  const approaches = labelOf(APPROACHES, meta.approaches);
  const shape = labelOf(TASK_SHAPES, [meta.shape])[0];
  return {
    facets: { domain: meta.domains, approach: meta.approaches, shape: [meta.shape], time: timeOf(meta.minutes), age: [String(meta.ageFrom)] },
    line: [shape, approaches[0], meta.duration].filter((p): p is string => !!p),
    facts: {
      domain: { text: labelOf(TASK_DOMAINS, meta.domains).join(', ') },
      approach: { text: approaches.join(', ') },
      shape: { text: shape },
      time: { text: meta.duration, value: meta.minutes[1] },
      size: { text: volume },
      discussion: { text: meta.discussion },
      age: { text: `${meta.ageFrom}+` },
    },
    minutes: meta.minutes,
    aliases: meta.aliases,
    topics: topicsOf(item.id),
    scales: [],
    domains: labelOf(TASK_DOMAINS, meta.domains),
    approaches,
    format: shape,
    concepts: conceptsOf(TASK_DOMAINS, meta.domains),
  };
}

export function describe(kind: Kind, item: LibraryItem): Described {
  return kind === 'test' ? describeTest(item) : describeTask(item);
}

/** Строки сравнения: что показать, в каком порядке, где числа рисуются полоской */
export const COMPARE_ROWS: Record<Kind, { id: string; label: string; bar?: boolean }[]> = {
  test: [
    { id: 'domain', label: 'Что оценивает' },
    { id: 'time', label: 'Время', bar: true },
    { id: 'size', label: 'Вопросов', bar: true },
    { id: 'scales', label: 'Шкал', bar: true },
    { id: 'result', label: 'Результат' },
    { id: 'age', label: 'Возраст' },
    { id: 'forms', label: 'Формы бланка' },
  ],
  task: [
    { id: 'domain', label: 'С чем работает' },
    { id: 'approach', label: 'Подход' },
    { id: 'shape', label: 'Формат' },
    { id: 'time', label: 'Время', bar: true },
    { id: 'size', label: 'Объём' },
    { id: 'discussion', label: 'Обсуждение с клиентом' },
    { id: 'age', label: 'Возраст' },
  ],
};
