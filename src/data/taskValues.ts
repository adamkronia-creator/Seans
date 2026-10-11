/*
 * Виды данных заданий и всё, что с ними считается: бланк, заполненные значения, прогресс, доли «пирога».
 * Тексты самих заданий (описание, бланк, пример) лежат в taskContent.ts, поиск настроек — в taskSettings.ts: так тяжёлые
 * тексты не попадают в основной файл приложения, а чат, «Избранное» и вкладка «Задания» берут нужное отсюда.
 */

/** Происхождение задания: откуда оно взялось и кто предложил */
export interface TaskOrigin {
  /** Направления и подходы, к которым оно относится: показываются метками */
  fields: string[];
  /** «Научная основа»; пустая строка между абзацами */
  basis: string;
  /** «Авторство»: что известно о том, кто предложил именно это задание */
  author: string;
}

/** Одно поле бланка */
export type TaskField =
  /** Предложение: начало на выбор («Я должен…») и продолжение, которое пишет клиент */
  | { kind: 'sentence'; id: string; starters: string[]; defaultStarter: number }
  /** Свободный текст */
  | { kind: 'text'; id: string; label?: string; hint?: string; placeholder?: string; rows?: number }
  /** Оценка в процентах ползунком */
  | { kind: 'percent'; id: string; label: string; hint?: string }
  /** Доли ответственности: у каждого фактора название и процент, остаток до 100 — доля самого клиента */
  | { kind: 'factors'; id: string; label: string; hint?: string; addLabel: string; namePlaceholder: string; ownLabel: string };

/** Раздел бланка: карточка с заголовком и полями */
export interface TaskSection {
  id: string;
  title: string;
  /** Пояснение под заголовком, перед полями */
  hint?: string;
  fields: TaskField[];
}

export interface TaskBlankData {
  /** Инструкция клиенту: абзацы; у заданий с формами начала фраз зависят от формы */
  rules: (form: string) => string[];
  /** Разделы бланка; у задания с формами формулировки зависят от формы («Я должен» / «Я должна») */
  sections: (form: string) => TaskSection[];
  /** Шкала «Как вы себя чувствуете?»: от худшего к лучшему */
  state: string[];
  /** Подсказка над полем комментария */
  commentHint: string;
}

export interface PieFactor {
  name: string;
  percent: number;
}

/** Всё, что заполнено в бланке: ответы клиента, примера выполнения или собственного прохождения */
export interface TaskValues {
  /** Текст полей: id поля → написанное (у предложений — продолжение) */
  text: Record<string, string>;
  /** Выбранное начало предложения: id поля → номер начала; без записи действует начало по умолчанию */
  starter: Record<string, number>;
  /** Оценки в процентах: id поля → 0…100 */
  percent: Record<string, number>;
  /** Доли ответственности: id поля → факторы */
  factors: Record<string, PieFactor[]>;
  comment: string;
  /** Номер выбранного состояния */
  state?: number;
}

export interface TaskExample {
  /** Заполненный бланк по формам (у заданий без форм — один ключ ''); комментарий и состояние тоже здесь */
  values: Record<string, Partial<TaskValues>>;
  /** Что можно отметить психологу при разборе примера */
  notes: string[];
}

/** Строка итога в результате: «Оценка до задания» — «90%» */
export interface TaskSummaryRow {
  label: string;
  value: string;
}

export interface TaskSettingsData {
  /** Описание задания; пустая строка между абзацами */
  intro: string;
  /** Начало описания, выделенное полужирным */
  lead?: string;
  /** «Цель задания» */
  goal: string;
  /** «Анализ материалов»; пустая строка между абзацами */
  analysis: string;
  origin: TaskOrigin;
  /** Что считается в бланке: «Количество предложений» — 10; `unit` — слово в трёх формах («предложение», «предложения», «предложений») */
  volume: { label: string; value: string; unit: [string, string, string] };
  /** Сколько занимает выполнение и обсуждение */
  duration: string;
  discussion: string;
  age: string;
  /** Формы бланка: первая выбрана по умолчанию; у заданий без разницы между формами их нет */
  forms?: string[];
  /** Сообщение клиенту по умолчанию */
  message: string;
  /** Бланк: инструкция, разделы с полями, шкала состояния */
  blank: TaskBlankData;
  /** Итог по ответам, который считается сам и показан в результате рядом со сведениями о выполнении */
  summary?: (values: TaskValues) => TaskSummaryRow[];
  /** Пример выполнения */
  example: TaskExample;
}

export const TASK_MESSAGE_LIMIT = 500;

/** Сроки выполнения, которые можно задать клиенту */
export const TASK_DEADLINES = ['Без срока', 'Сутки', '3 дня', 'Неделя'];

/** Слово после числа: 1 предложение, 3 предложения, 10 предложений */
export function plural(n: number, [one, few, many]: [string, string, string]): string {
  const last = n % 10;
  if (n % 100 >= 11 && n % 100 <= 14) return many;
  if (last === 1) return one;
  return last >= 2 && last <= 4 ? few : many;
}

/** «10 предложений», «3 решения», «1 фраза»: объём задания для клиента */
export const volumeText = (data: TaskSettingsData): string => `${data.volume.value} ${plural(Number(data.volume.value), data.volume.unit)}`;

/** Задания, у которых есть экран настройки, бланк и выполнение (остальные пока только в списке) */
export const TASKS_WITH_SETTINGS = ['should', 'choice', 'phrase', 'secret', 'pie'];
export const hasTaskSettings = (taskId: string): boolean => TASKS_WITH_SETTINGS.includes(taskId);

// ——— Заполненный бланк ———

export const emptyValues = (): TaskValues => ({ text: {}, starter: {}, percent: {}, factors: {}, comment: '' });

/** Дополняет частично заполненные значения до полных: у примера и результата не всё задано */
export const fullValues = (partial?: Partial<TaskValues>): TaskValues => ({ ...emptyValues(), ...partial });

/** Доля самого клиента: то, что осталось до 100 после всех остальных */
export const ownShare = (factors: PieFactor[] = []): number => Math.max(0, 100 - factors.reduce((sum, f) => sum + f.percent, 0));

/** Начало предложения, выбранное для поля */
export const starterOf = (field: Extract<TaskField, { kind: 'sentence' }>, values: TaskValues): number => values.starter[field.id] ?? field.defaultStarter;

export const fieldsOf = (sections: TaskSection[]): TaskField[] => sections.flatMap((s) => s.fields);

/** Поле заполнено: есть текст, оценка или хотя бы один фактор с названием */
export function isFilled(field: TaskField, values: TaskValues): boolean {
  switch (field.kind) {
    case 'sentence':
    case 'text':
      return (values.text[field.id] ?? '').trim() !== '';
    case 'percent':
      return values.percent[field.id] !== undefined;
    case 'factors':
      return (values.factors[field.id] ?? []).some((f) => f.name.trim() !== '');
  }
}

/** Сколько полей бланка заполнено (комментарий и состояние не считаются: их можно не писать) */
export function progressOf(sections: TaskSection[], values: TaskValues): { done: number; total: number } {
  const fields = fieldsOf(sections);
  return { done: fields.filter((f) => isFilled(f, values)).length, total: fields.length };
}

/** Значения для формы: у заданий без форм ключ пустой */
export const exampleValues = (data: TaskSettingsData, form: string): TaskValues =>
  fullValues(data.example.values[form] ?? Object.values(data.example.values)[0]);
