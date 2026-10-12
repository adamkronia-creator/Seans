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
  | { kind: 'factors'; id: string; label: string; hint?: string; addLabel: string; namePlaceholder: string; ownLabel: string }
  /** Оценка от 0 до 10 ползунком (настроение, удовольствие, значимость); под ползунком подписи краёв */
  | { kind: 'scale'; id: string; label: string; hint?: string; low: string; high: string }
  /** Выбор из вариантов: один (список) или несколько (чипсы) */
  | { kind: 'choice'; id: string; label: string; hint?: string; options: string[]; multiple?: boolean }
  /** Список коротких строк, который клиент пополняет: доказательства «за» и «против». Сначала показано `count` строк, добавить можно до `max` */
  | { kind: 'list'; id: string; label: string; hint?: string; placeholder: string; addLabel: string; count: number; max: number }
  /** Повторяющаяся запись из нескольких полей (запись дневника, дело плана, беспокойство): сначала показано `count` записей, добавить можно до `max` */
  | { kind: 'entries'; id: string; title: string; addLabel: string; count: number; max: number; groups: EntryGroup[] };

export type TextField = Extract<TaskField, { kind: 'text' }>;
export type ChoiceField = Extract<TaskField, { kind: 'choice' }>;
export type ListField = Extract<TaskField, { kind: 'list' }>;
export type EntriesField = Extract<TaskField, { kind: 'entries' }>;

/** Группа полей внутри записи: необязательный заголовок («До дела», «После дела») и сами поля */
export interface EntryGroup {
  title?: string;
  fields: TaskField[];
}

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
  /** При выполнении бланк идёт страницами: на каждой номера разделов и, если нужно, 'comment'. Без этого все разделы на одной странице, комментарий отдельной */
  pages?: string[][];
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
  /** Оценки от 0 до 10: id поля → число */
  scale: Record<string, number>;
  /** Выбранные варианты: id поля → номера вариантов (при выборе одного — один номер) */
  choice: Record<string, number[]>;
  /** Списки строк: id поля → строки */
  list: Record<string, string[]>;
  /** Записи: id поля → записи; у каждой те же виды значений, что у всего бланка (поля записи берутся по своим id) */
  entries: Record<string, TaskValues[]>;
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
  /** Формы бланка: первая выбрана по умолчанию (или `defaultForm`); у заданий без разницы между формами их нет */
  forms?: string[];
  defaultForm?: string;
  /** Название выбора формы, если это не «Форма бланка» (у дневника: «Количество записей») */
  formLabel?: string;
  /** Пояснение под вариантами в окне выбора формы */
  formHint?: string;
  /** Форма бланка — число записей, дел или беспокойств: оно же объём задания, а слово после числа берётся из `volume.unit` */
  formCount?: boolean;
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

/** «10 предложений», «3 решения», «1 фраза»: объём задания для клиента; у заданий с числом записей в форме — выбранное число */
export const volumeText = (data: TaskSettingsData, form?: string): string => {
  const n = data.formCount && form ? Number(form) : Number(data.volume.value);
  return `${n} ${plural(n, data.volume.unit)}`;
};

/** Выбранная форма бланка словами: «Женская» или, если форма — число записей, «3 записи» */
export const formText = (data: TaskSettingsData, form: string): string => (data.formCount ? volumeText(data, form) : form);

/** Задания, у которых есть экран настройки, бланк и выполнение (остальные пока только в списке) */
export const TASKS_WITH_SETTINGS = ['should', 'choice', 'phrase', 'secret', 'pie', 'smer', 'worry', 'activation', 'evidence'];
export const hasTaskSettings = (taskId: string): boolean => TASKS_WITH_SETTINGS.includes(taskId);

// ——— Заполненный бланк ———

export const emptyValues = (): TaskValues => ({ text: {}, starter: {}, percent: {}, factors: {}, scale: {}, choice: {}, list: {}, entries: {}, comment: '' });

/** Дополняет частично заполненные значения до полных: у примера и результата не всё задано */
export const fullValues = (partial?: Partial<TaskValues>): TaskValues => ({ ...emptyValues(), ...partial });

/** Доля самого клиента: то, что осталось до 100 после всех остальных */
export const ownShare = (factors: PieFactor[] = []): number => Math.max(0, 100 - factors.reduce((sum, f) => sum + f.percent, 0));

/** Начало предложения, выбранное для поля */
export const starterOf = (field: Extract<TaskField, { kind: 'sentence' }>, values: TaskValues): number => values.starter[field.id] ?? field.defaultStarter;

/** Записи поля: написанные или, пока ничего не тронули, нужное число пустых */
export const entriesOf = (field: EntriesField, values: TaskValues): TaskValues[] => values.entries[field.id] ?? Array.from({ length: field.count }, emptyValues);

/** Строки списка: написанные или нужное число пустых */
export const listOf = (field: ListField, values: TaskValues): string[] => values.list[field.id] ?? Array.from({ length: field.count }, () => '');

/** Поля одной записи: из всех групп подряд */
export const entryFields = (field: EntriesField): TaskField[] => field.groups.flatMap((g) => g.fields);

export const fieldsOf = (sections: TaskSection[]): TaskField[] => sections.flatMap((s) => s.fields);

/** Поле заполнено: есть текст, оценка, выбранный вариант, строка списка, фактор с названием или заполненное поле записи */
export function isFilled(field: TaskField, values: TaskValues): boolean {
  switch (field.kind) {
    case 'sentence':
    case 'text':
      return (values.text[field.id] ?? '').trim() !== '';
    case 'percent':
      return values.percent[field.id] !== undefined;
    case 'factors':
      return (values.factors[field.id] ?? []).some((f) => f.name.trim() !== '');
    case 'scale':
      return values.scale[field.id] !== undefined;
    case 'choice':
      return (values.choice[field.id] ?? []).length > 0;
    case 'list':
      return (values.list[field.id] ?? []).some((line) => line.trim() !== '');
    case 'entries':
      return entriesOf(field, values).some((entry) => entryFilled(field, entry));
  }
}

/** В значениях есть хоть что-то написанное или отмеченное (для записей, поля которых заранее не известны) */
export const valuesFilled = (v: TaskValues): boolean =>
  Object.values(v.text).some((t) => t.trim() !== '') ||
  Object.keys(v.percent).length > 0 ||
  Object.keys(v.scale).length > 0 ||
  Object.values(v.choice).some((c) => c.length > 0) ||
  Object.values(v.list).some((l) => l.some((t) => t.trim() !== ''));

/** В записи заполнено хотя бы одно поле */
export const entryFilled = (field: EntriesField, entry: TaskValues): boolean => entryFields(field).some((f) => isFilled(f, entry));

/** Заполненные записи поля: пустые в просмотре и в итогах не показываются */
export const filledEntries = (field: EntriesField, values: TaskValues): TaskValues[] => entriesOf(field, values).filter((entry) => entryFilled(field, entry));

/** Сколько заполнено и сколько всего: у записи каждое её поле считается отдельно, так что число полей растёт с записями */
function tally(field: TaskField, values: TaskValues): { done: number; total: number } {
  if (field.kind !== 'entries') return { done: isFilled(field, values) ? 1 : 0, total: 1 };
  return entriesOf(field, values).reduce(
    (sum, entry) => {
      for (const inner of entryFields(field)) {
        const t = tally(inner, entry);
        sum.done += t.done;
        sum.total += t.total;
      }
      return sum;
    },
    { done: 0, total: 0 },
  );
}

/** Сколько полей бланка заполнено (комментарий и состояние не считаются: их можно не писать) */
export function progressOf(sections: TaskSection[], values: TaskValues): { done: number; total: number } {
  return fieldsOf(sections).reduce(
    (sum, field) => {
      const t = tally(field, values);
      return { done: sum.done + t.done, total: sum.total + t.total };
    },
    { done: 0, total: 0 },
  );
}

/** Значения для формы: у заданий без форм ключ пустой */
export const exampleValues = (data: TaskSettingsData, form: string): TaskValues =>
  fullValues(data.example.values[form] ?? Object.values(data.example.values)[0]);
