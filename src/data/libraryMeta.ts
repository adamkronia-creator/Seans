import type { LibraryItem, LibraryTest } from './library';
import { testSettings } from './testSettings';
import { topicsOf } from './topics';

/*
 * Сведения о тестах и заданиях для поиска и фильтров: что материал оценивает, как долго длится, какой у него результат.
 *
 * У тестов длительность, возраст и шкалы берутся из настроек теста (testSettings.ts), у заданий тексты
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
  { id: 'profile', label: 'Профиль шкал' },
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
    { id: 'result', label: 'Итог тестирования', options: TEST_RESULTS },
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

export interface TaskMeta {
  domains: string[];
  approaches: string[];
  /** short — один короткий ответ; steps — несколько шагов с оценками; diary — повторяющиеся записи */
  shape: 'short' | 'steps' | 'diary';
  /** Сколько занимает у клиента всего; у заданий «на запись» — для типичного числа записей */
  minutes: [number, number];
  /** Время так, как оно написано в настройках задания */
  duration: string;
  ageFrom: number;
  aliases: string[];
}

export const TASK_META: Record<string, TaskMeta> = {
  evidence: {
    domains: ['thoughts'],
    approaches: ['cbt'],
    shape: 'steps',
    minutes: [15, 20],
    duration: '15–20 мин',
    ageFrom: 16,
    aliases: ['Судебный процесс', 'Проверка мыслей', 'Когнитивная реструктуризация', 'Доказательства за и против'],
  },
  pie: {
    domains: ['guilt'],
    approaches: ['cbt'],
    shape: 'steps',
    minutes: [10, 15],
    duration: '10–15 мин',
    ageFrom: 16,
    aliases: ['Круг ответственности', 'Responsibility pie', 'Пирог вины'],
  },
  smer: {
    domains: ['thoughts'],
    approaches: ['cbt'],
    shape: 'diary',
    minutes: [15, 21],
    duration: '5–7 мин на запись',
    ageFrom: 16,
    aliases: ['Ситуация мысль эмоция реакция', 'Дневник мыслей', 'Дневник эмоций'],
  },
  activation: {
    domains: ['mood'],
    approaches: ['cbt'],
    shape: 'diary',
    minutes: [9, 15],
    duration: '3–5 мин на дело',
    ageFrom: 16,
    aliases: ['Планирование дел', 'Расписание активности', 'Behavioral activation', 'План приятных дел'],
  },
  worry: {
    domains: ['anxiety'],
    approaches: ['cbt'],
    shape: 'diary',
    minutes: [9, 15],
    duration: '3–5 мин на беспокойство',
    ageFrom: 16,
    aliases: ['Время для беспокойства', 'Worry time', 'Откладывание тревоги'],
  },
  should: {
    domains: ['thoughts'],
    approaches: ['cbt'],
    shape: 'short',
    minutes: [5, 10],
    duration: '5–10 мин',
    ageFrom: 16,
    aliases: ['Долженствования', 'Я должен', 'Эллис'],
  },
  choice: {
    domains: ['values'],
    approaches: ['act'],
    shape: 'short',
    minutes: [5, 10],
    duration: '5–10 мин',
    ageFrom: 16,
    aliases: ['Принятие решений', 'Неопределенность', 'Прояснение ценностей'],
  },
  phrase: {
    domains: ['thoughts'],
    approaches: ['schema', 'psychodynamic'],
    shape: 'short',
    minutes: [5, 10],
    duration: '5–10 мин',
    ageFrom: 16,
    aliases: ['Детские фразы', 'Родительские послания', 'Ранние убеждения'],
  },
  secret: {
    domains: ['values'],
    approaches: ['act'],
    shape: 'short',
    minutes: [3, 5],
    duration: '3–5 мин',
    ageFrom: 16,
    aliases: ['Если бы никто не узнал', 'Тайные желания', 'Свобода выбора'],
  },
};

// ——— Сведения о материале ———

export interface Described {
  /** Значения фильтров: идентификатор фильтра → идентификаторы пунктов; пусто — не указано */
  facets: Record<string, string[]>;
  /** Строка под описанием в карточке; сейчас пустая и у тестов, и у заданий: формат, подход, время и вопросы в карточках не пишутся (они в настройках и фильтрах) */
  line: string[];
  /** Сколько времени занимает: для сортировки по длительности */
  minutes?: [number, number];
  aliases: string[];
  topics: string[];
  scales: string[];
  /** Подписи областей, подходов и формата для поиска */
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

function describeTest(item: LibraryItem): Described {
  const meta = TEST_META[item.id];
  const s = testSettings(item as LibraryTest);
  const minutes = parseMinutes(s.duration);
  const ageFrom = parseAge(s.age);
  const scales = [...(s.scales?.main ?? []), ...(s.scales?.extra ?? [])];
  const mainCount = s.scales?.main.length ?? 0;
  const result = mainCount === 0 ? [] : [mainCount === 1 ? 'score' : 'profile'];
  const domains = meta?.domains ?? [];

  return {
    facets: { domain: domains, time: timeOf(minutes), result, age: ageFrom ? [String(ageFrom)] : [] },
    line: [],
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
    return { facets: { domain: [], approach: [], shape: [], time: [], age: [] }, line: [], aliases: [], topics: topicsOf(item.id), scales: [], domains: [], approaches: [], concepts: [] };
  }
  const approaches = labelOf(APPROACHES, meta.approaches);
  const shape = labelOf(TASK_SHAPES, [meta.shape])[0];
  return {
    facets: { domain: meta.domains, approach: meta.approaches, shape: [meta.shape], time: timeOf(meta.minutes), age: [String(meta.ageFrom)] },
    line: [],
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
