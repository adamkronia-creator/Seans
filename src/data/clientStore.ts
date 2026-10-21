import { useSyncExternalStore } from 'react';
import { CASE_SECTIONS, textToBlocks, textToParagraphs, type CaseSection } from './case';
import { CASE_NOTES, type CaseNote } from './notes';
import { LIBRARY, TASK_LIBRARY } from './library';
import type { PsyTest } from './tests';
import type { AppEvent } from './events';
import { findClientTaskResult } from './clientTaskResults';
import { clientResultId, clientResultPath, recordRef } from './resultLinks';
import { recordsText, type PermanentRule } from './taskValues';

/*
 * Журнал действий по людям: у каждого чата свой (запись помечена чатом, без пометки — Максим, чьи данные заведены с начала).
 * Из журнала собираются «История взаимодействия», вкладки «Тесты», «Задания», «Заметки», «Сведения» и экран «События»,
 * поэтому новое действие появляется везде сразу. Новые действия добавляются в конец журнала функциями ниже (addNote, logStep и т. д.).
 */

export type ActivityState = 'assigned' | 'sent' | 'done';

export interface Session {
  id: string;
  number: number;
  paragraphs: string[];
}

/** Чат, чьи записи без пометки: журнал начинался с Максима */
export const CLIENT_CHAT = 'maxim';

/** Чем кончилось приглашение в роль: принято, отклонено, пришло к вам, работа завершена */
export type InviteResult = 'accepted' | 'declined' | 'received' | 'ended';

/** Чат, которому принадлежит запись */
interface Tagged {
  chat?: string;
}

export type Activity =
  | ({
      id: string;
      kind: 'invite';
      date: string;
      /** Название роли и итог; у старой записи Максима их нет, и текст остаётся прежним */
      role?: string;
      result?: InviteResult;
    } & Tagged)
  | ({ id: string; kind: 'session'; ref: string; date: string } & Tagged)
  | ({ id: string; kind: 'note'; ref: string; date: string } & Tagged)
  | ({
      id: string;
      kind: 'test' | 'task';
      ref: string;
      state: ActivityState;
      date: string;
      time: string;
      /** Постоянное задание (отправлено): клиент выполняет его не один раз, а когда нужно */
      permanent?: PermanentRule;
      /** Запись постоянного задания (выполнено): её номер; каждая запись — отдельное действие журнала */
      record?: number;
    } & Tagged);

/** Чат записи журнала */
export const chatOf = (a: Tagged): string => a.chat ?? CLIENT_CHAT;

/** Действие с тестом или заданием */
type ItemActivity = Extract<Activity, { state: ActivityState }>;

interface ClientData {
  activity: Activity[];
  notes: CaseNote[];
  sessions: Session[];
  /** Сведения кейса: редактируются (иконка, цвет, заголовок, текст) */
  caseSections: CaseSection[];
  /** Комментарии психолога к тестам и заданиям в истории: id записи журнала → текст */
  comments: Record<string, string>;
}

/** Как называется тест в тексте событий и истории */
interface TestMeta {
  name: string;
  /** «опросник депрессивного состояния «PHQ-9»» — после «Вы отправили» / «Максим заполнил» */
  what: string;
  /** Текст выполненного теста с ручными переносами, как в макете */
  doneText?: string;
}

const TEST_META: Record<string, TestMeta> = {
  itt: { name: 'ИТТ', what: 'интегративный тест тревожности «ИТТ»' },
  scl90: {
    name: 'SCL-90',
    what: 'симптоматический опросник «SCL-90»',
    doneText: 'Максим заполнил\nсимптоматический опросник\n«SCL-90»',
  },
  '5pfq': { name: '5PFQ', what: 'пятифакторный опросник личности «5PFQ»' },
  rses: { name: 'RSES', what: 'опросник самоуважения Розенберга «RSES»' },
  gad7: { name: 'GAD-7', what: 'опросник генерализованного тревожного расстройства «GAD-7»' },
  phq9: { name: 'PHQ-9', what: 'опросник депрессивного состояния «PHQ-9»' },
};

const SESSIONS: Session[] = [
  {
    id: 's1',
    number: 1,
    paragraphs: [
      'Первичное обращение.',
      'Основные темы: тревога, необходимость соответствовать ожиданиям, страх ошибиться.',
      'Пациент ожидает от аналитика четкого объяснения происходящего.',
    ],
  },
  {
    id: 's2',
    number: 2,
    paragraphs: [
      'Обсуждение отношений с матерью и прошлого опыта достижений.',
      'Появляется повторяющаяся формула «не разочаровать».',
    ],
  },
  {
    id: 's3',
    number: 3,
    paragraphs: [
      'Разбор истории романтических отношений.',
      'Выявляется повторяющаяся последовательность: сближение → соответствие ожиданиям → ощущение давления → дистанцирование → сожаление.',
    ],
  },
  {
    id: 's4',
    number: 4,
    paragraphs: [
      'Обсуждение реакции пациента на молчание и отсутствие прямых рекомендаций.',
      'Усиление материала переноса.',
      'Появляется вопрос о собственной позиции субъекта.',
    ],
  },
  {
    id: 's5',
    number: 5,
    paragraphs: [
      'Пациент сообщает о рабочей ситуации, в которой впервые сознательно отказался от необходимости получить одобрение руководителя.',
      'При этом испытывал выраженный дискомфорт и сомнения.',
    ],
  },
  {
    id: 's6',
    number: 6,
    paragraphs: [
      'Исследование фразы «я не понимаю, кто я, если не стараюсь быть правильным».',
      'Работа с повторяющимися означающими «правильный», «хороший», «достаточный».',
      'Запрос смещается от устранения тревоги к исследованию собственного желания.',
    ],
  },
];

let seq = 0;
const nextId = () => `a${++seq}`;
const t = (kind: 'test' | 'task', ref: string, state: ActivityState, date: string, time: string, extra: { permanent?: PermanentRule; record?: number } = {}): Activity => ({
  id: nextId(),
  kind,
  ref,
  state,
  date,
  time,
  ...extra,
});
const s = (ref: string, date: string): Activity => ({ id: nextId(), kind: 'session', ref, date });
const n = (ref: string, date: string): Activity => ({ id: nextId(), kind: 'note', ref, date });

// Порядок и даты как в макете «История взаимодействия»; последние три записи (09.10) — из вкладок «Тесты» и «Задания»
const SEED: Activity[] = [
  { id: nextId(), kind: 'invite', date: '03.09.2026' },
  s('s1', '03.09.2026'),
  n('n1', '03.09.2026'),
  t('test', 'phq9', 'sent', '04.09.2026', '18:42'),
  t('test', 'phq9', 'done', '04.09.2026', '21:22'),
  t('test', 'gad7', 'sent', '05.09.2026', '10:08'),
  t('test', 'gad7', 'done', '05.09.2026', '19:08'),
  t('task', 'should', 'assigned', '06.09.2026', '18:26'),
  t('test', 'rses', 'sent', '07.09.2026', '09:31'),
  t('test', 'rses', 'done', '07.09.2026', '20:51'),
  t('task', 'should', 'done', '07.09.2026', '22:14'),
  t('test', '5pfq', 'sent', '09.09.2026', '12:15'),
  t('test', '5pfq', 'done', '09.09.2026', '22:14'),
  s('s2', '10.09.2026'),
  n('n2', '10.09.2026'),
  t('test', 'scl90', 'sent', '11.09.2026', '11:04'),
  t('test', 'scl90', 'done', '11.09.2026', '20:53'),
  t('task', 'choice', 'assigned', '12.09.2026', '17:40'),
  n('n3', '12.09.2026'),
  t('task', 'choice', 'done', '13.09.2026', '23:06'),
  s('s3', '17.09.2026'),
  n('n4', '17.09.2026'),
  t('task', 'phrase', 'assigned', '18.09.2026', '16:12'),
  t('task', 'phrase', 'done', '19.09.2026', '21:38'),
  n('n5', '19.09.2026'),
  s('s4', '17.09.2026'), // в макете именно так
  n('n6', '24.09.2026'),
  t('task', 'secret', 'assigned', '26.09.2026', '15:05'),
  t('task', 'secret', 'done', '27.09.2026', '20:57'),
  n('n7', '27.09.2026'),
  s('s5', '01.10.2026'),
  // Постоянное задание: дневник СМЭР, всего десять записей; две уже сделаны (их результаты — в clientTaskResults.ts)
  t('task', 'smer', 'sent', '05.10.2026', '18:20', { permanent: { limit: 10 } }),
  t('task', 'smer', 'done', '06.10.2026', '22:40', { record: 1 }),
  t('task', 'smer', 'done', '07.10.2026', '21:15', { record: 2 }),
  s('s6', '08.10.2026'),
  // Есть во вкладках «Тесты» и «Задания» (09.10), в макете истории их нет; время придумано
  t('test', 'itt', 'sent', '09.10.2026', '09:30'),
  t('task', 'pie', 'sent', '09.10.2026', '09:40'),
  t('task', 'evidence', 'assigned', '09.10.2026', '09:50'),
  // Вера работает с сентября, ей достаточно записи о роли; Олег прислал приглашение сегодня, ответ ждёт вас в его чате
  { id: nextId(), kind: 'invite', chat: 'vera', date: '12.09.2026', role: 'Клиент', result: 'accepted' },
  { id: nextId(), kind: 'invite', chat: 'oleg', date: nowStamp().date, role: 'Клиент', result: 'received' },
];

let data: ClientData = {
  activity: SEED,
  notes: CASE_NOTES,
  sessions: SESSIONS,
  caseSections: CASE_SECTIONS,
  comments: {},
};
const listeners = new Set<() => void>();

function update(next: Partial<ClientData>) {
  data = { ...data, ...next };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Данные клиента Максима; компонент перерисуется, когда добавится новое действие */
export function useClientData(): ClientData {
  return useSyncExternalStore(subscribe, () => data);
}

/** Текущие данные без подписки: для действий, которым нужно прочитать значение в момент вызова */
export const readClientData = (): ClientData => data;

/** Пометка чата для новой записи: у Максима её нет (записи без пометки — его) */
const tag = (chatId: string): Tagged => (chatId === CLIENT_CHAT ? {} : { chat: chatId });

export function nowStamp() {
  // pad внутри: функцию вызывает начальный журнал (SEED) при загрузке модуля, раньше, чем объявлены константы ниже
  const pad = (v: number) => String(v).padStart(2, '0');
  const d = new Date();
  return {
    date: `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

// ——— Действия: каждое дописывает запись в журнал ———

/**
 * Название записи, набранной в поле внизу вкладки, и её текст. Название — первая строка (до 48 знаков, по границе слова);
 * если строка поместилась целиком, в тексте остаётся только остальное, иначе текст остаётся полным, чтобы ничего не потерять.
 * Если текста нет — название «Заметка» или «Сведения».
 */
const splitTitle = (text: string, fallback: string) => {
  const lines = text.split('\n');
  const at = lines.findIndex((x) => x.trim());
  if (at < 0) return { title: fallback, body: '' };
  const line = lines[at].trim();
  if (line.length <= 48) return { title: line, body: lines.slice(at + 1).join('\n').trim() };
  const cut = line.slice(0, 48);
  const space = cut.lastIndexOf(' ');
  return { title: `${(space > 24 ? cut.slice(0, space) : cut).replace(/[\s.,;:—-]+$/, '')}…`, body: text.trim() };
};

/**
 * Новая заметка из текста, набранного в поле внизу вкладки «Заметки». Название — «Заметка от дд/мм/гггг», набранный текст целиком — в заметке (дата — и в «Последнем обновлении»).
 * Заметка попадает и в журнал чата, то есть в его «Историю взаимодействия» (если роль её открывает).
 */
export function addNote(chatId: string, text: string): string | null {
  if (!textToParagraphs(text).some((p) => p.trim())) return null;
  // Название заметки — дата записи («Заметка от 20/10/2026»), весь набранный текст — её содержимое
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const title = `Заметка от ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  const paragraphs = textToParagraphs(text);
  const { date } = nowStamp();
  const note: CaseNote = {
    id: `n${data.notes.length + 1}-${Date.now()}`,
    title,
    paragraphs,
    icon: 'pin',
    tone: 'purple',
    updated: date,
    ...(chatId === CLIENT_CHAT ? {} : { chatId }),
  };
  update({
    notes: [...data.notes, note],
    activity: [...data.activity, { id: nextId(), kind: 'note' as const, ref: note.id, date, ...tag(chatId) }],
  });
  return note.id;
}

/** Новое сведение из текста, набранного в поле внизу вкладки «Сведения»: название — первая строка текста, остальное внутри */
export function addSection(chatId: string, text: string): string | null {
  if (textToBlocks(text).length === 0 || !text.trim()) return null;
  const { title, body } = splitTitle(text, 'Сведения');
  const blocks = body ? textToBlocks(body) : [];
  const { date } = nowStamp();
  const section: CaseSection = {
    id: `c${data.caseSections.length + 1}-${Date.now()}`,
    title,
    icon: 'info',
    tone: 'blue',
    blocks,
    updated: date,
    ...(chatId === CLIENT_CHAT ? {} : { chatId }),
  };
  update({ caseSections: [...data.caseSections, section] });
  return section.id;
}

/** Меняет сведения кейса; у текстовых разделов обновляется дата */
export function updateSection(id: string, patch: Partial<Omit<CaseSection, 'id'>>) {
  const { date } = nowStamp();
  update({
    caseSections: data.caseSections.map((x) =>
      x.id === id ? { ...x, ...patch, ...(x.blocks ? { updated: date } : {}) } : x,
    ),
  });
}

/** Меняет заметку; дата обновления ставится сегодняшняя */
export function updateNote(id: string, patch: Partial<Omit<CaseNote, 'id' | 'updated'>>) {
  const { date } = nowStamp();
  update({ notes: data.notes.map((x) => (x.id === id ? { ...x, ...patch, updated: date } : x)) });
}

/** Текст блока сеанса в истории; пустой массив — блок остаётся только с названием и датой */
export function updateSessionText(id: string, paragraphs: string[]) {
  update({ sessions: data.sessions.map((x) => (x.id === id ? { ...x, paragraphs } : x)) });
}

/** Комментарий к записи журнала (тест, задание); пустая строка удаляет комментарий */
export function setComment(activityId: string, text: string) {
  const comments = { ...data.comments };
  if (text) comments[activityId] = text;
  else delete comments[activityId];
  update({ comments });
}

/** Тест или задание в чате: назначено / отправлено / выполнено; у постоянного задания — правило или номер записи */
export function logStep(chatId: string, kind: 'test' | 'task', ref: string, state: ActivityState, extra: { permanent?: PermanentRule; record?: number } = {}) {
  const { date, time } = nowStamp();
  update({ activity: [...data.activity, { id: nextId(), kind, ref, state, date, time, ...extra, ...tag(chatId) }] });
}

/** Роль в чате: приглашение принято или отклонено, пришло к вам, работа завершена. Запись видна в «Истории» и в «Событиях» */
export function logInvite(chatId: string, role: string, result: InviteResult) {
  const { date } = nowStamp();
  update({ activity: [...data.activity, { id: nextId(), kind: 'invite', date, role, result, ...tag(chatId) }] });
}

// ——— Выборки для экранов ———

export type HistoryEvent =
  | { id: string; kind: 'invite'; date: string; title: string; text: string }
  | { id: string; kind: 'session'; ref: string; number: number; date: string; paragraphs: string[] }
  | { id: string; kind: 'note'; ref: string; title: string; date: string; paragraphs: string[] }
  | {
      id: string;
      kind: 'test' | 'task';
      state: ActivityState;
      /** Тест или задание из библиотеки */
      ref: string;
      title: string;
      date: string;
      text: string;
      /** Комментарий психолога под текстом события */
      comment?: string;
      /** Номер записи, если это запись постоянного задания: по ней находится результат */
      record?: number;
    };

export type HistoryFilter = 'all' | 'session' | 'test' | 'task' | 'note';

/** Записи журнала одного чата, в порядке журнала */
const ofChat = (d: ClientData, chatId: string): Activity[] => d.activity.filter((a) => chatOf(a) === chatId);

// Каталог тестов и заданий — библиотеки приложения; статус и дата берутся из журнала чата
const catalog = (kind: 'test' | 'task') => (kind === 'test' ? LIBRARY : TASK_LIBRARY);
const itemName = (kind: 'test' | 'task', ref: string) =>
  kind === 'test'
    ? (TEST_META[ref]?.name ?? (({ abbr, title }) => abbr ?? title)(LIBRARY.find((x) => x.id === ref)!))
    : TASK_LIBRARY.find((x) => x.id === ref)!.title;

/**
 * Текст события. У Максима он написан от его имени («Максим заполнил…»), у остальных — безлично: пол собеседника приложению не известен,
 * а «заполнил(а)» в журнале читается плохо
 */
function activityText({ kind, ref, state, permanent, record, chat }: ItemActivity): string {
  const maxim = chatOf({ chat }) === CLIENT_CHAT;
  if (kind === 'test') {
    const meta = TEST_META[ref];
    const what = meta?.what ?? `опросник «${itemName('test', ref)}»`;
    if (state === 'done') return maxim ? (meta?.doneText ?? `Максим заполнил ${what}`) : `Заполнен ${what}`;
    return `Вы отправили ${what}`;
  }
  const name = itemName('task', ref);
  if (state === 'done') {
    if (record) return maxim ? `Максим добавил запись ${record} в психологическое задание «${name}»` : `Добавлена запись ${record} в психологическое задание «${name}»`;
    return maxim ? `Максим выполнил психологическое задание «${name}»` : `Выполнено психологическое задание «${name}»`;
  }
  if (state === 'sent') {
    return permanent
      ? `Вы отправили постоянное психологическое задание «${name}»${permanent.limit ? ` (всего записей: ${permanent.limit})` : ''}`
      : `Вы отправили психологическое задание «${name}»`;
  }
  return `Вы назначили психологическое задание «${name}»`;
}

/** Запись о роли в «Истории»: у старой записи Максима прежний текст, у новых — название роли и итог */
function inviteEvent(a: Extract<Activity, { kind: 'invite' }>): Extract<HistoryEvent, { kind: 'invite' }> {
  if (!a.role || !a.result) return { id: a.id, kind: 'invite', date: a.date, title: 'Новый клиент', text: 'Максим принял приглашение стать клиентом.' };
  const text = {
    accepted: 'Приглашение принято, работа началась.',
    declined: 'Приглашение отклонено.',
    received: 'Приглашение получено.',
    ended: 'Работа завершена. История и ответы остаются.',
  }[a.result];
  return { id: a.id, kind: 'invite', date: a.date, title: `Роль «${a.role}»`, text };
}

export function historyEvents(d: ClientData, chatId: string): HistoryEvent[] {
  return ofChat(d, chatId).map((a): HistoryEvent => {
    switch (a.kind) {
      case 'invite':
        return inviteEvent(a);
      case 'session': {
        const session = d.sessions.find((x) => x.id === a.ref)!;
        return {
          id: a.id,
          kind: 'session',
          ref: session.id,
          number: session.number,
          date: a.date,
          paragraphs: session.paragraphs,
        };
      }
      case 'note': {
        const note = d.notes.find((x) => x.id === a.ref)!;
        return {
          id: a.id,
          kind: 'note',
          ref: note.id,
          title: note.title.startsWith('Заметка') ? note.title : `Заметка: ${note.title}`,
          date: a.date,
          paragraphs: note.paragraphs,
        };
      }
      default: {
        const name = itemName(a.kind, a.ref);
        return {
          id: a.id,
          kind: a.kind,
          state: a.state,
          ref: a.ref,
          title: `«${name}»`,
          date: `${a.date} ${a.time}`,
          text: activityText(a),
          comment: d.comments[a.id],
          ...(a.record ? { record: a.record } : {}),
        };
      }
    }
  });
}

/** Сколько элементов у фильтра: тесты и задания считаются по отдельным тестам/заданиям, а не по их отправкам и выполнениям */
export function countOf(d: ClientData, filter: HistoryFilter, chatId: string): number {
  const mine = ofChat(d, chatId);
  if (filter === 'all') return mine.length;
  if (filter === 'test' || filter === 'task') {
    return new Set(mine.flatMap((a) => (a.kind === filter ? [a.ref] : []))).size;
  }
  return mine.filter((a) => a.kind === filter).length;
}

export function doneCount(d: ClientData, kind: 'test' | 'task', chatId: string): number {
  return new Set(ofChat(d, chatId).flatMap((a) => (a.kind === kind && a.state === 'done' ? [a.ref] : []))).size;
}

/**
 * Тесты и задания в том виде, как их показывают вкладки: статус и дата — по последнему действию.
 * Постоянное задание, пока записи не набраны, стоит в своём разделе («Записей: 2 из 10»), а каждая запись клиента
 * — отдельная завершённая карточка («Запись 2»): её id — номер результата записи (см. recordRef).
 */
export function itemsWithStatus(d: ClientData, kind: 'test' | 'task', chatId: string): PsyTest[] {
  const journal = ofChat(d, chatId);
  const items: { item: PsyTest; index: number }[] = [];
  catalog(kind).forEach(({ categories: _c, ...base }) => {
    const item = { ...base, status: 'sent' as const, date: '' };
    let last = -1;
    const records: number[] = [];
    journal.forEach((a, i) => {
      if (a.kind !== kind || a.ref !== item.id) return;
      if (a.record !== undefined) records.push(i);
      else last = i;
    });
    records.forEach((i) => {
      const a = journal[i] as ItemActivity;
      items.push({ item: { ...item, id: recordRef(item.id, a.record!), description: `Запись ${a.record}`, status: 'done', date: a.date.slice(0, 5) }, index: i });
    });
    if (last < 0) return;
    const a = journal[last] as ItemActivity;
    if (a.permanent) {
      // Записи этого назначения — те, что сделаны после него
      const mine = records.filter((i) => i > last);
      // Набрано всё, что назначено: осталась история записей
      if (a.permanent.limit && mine.length >= a.permanent.limit) return;
      const newest = Math.max(last, ...mine);
      items.push({
        item: { ...item, status: 'permanent', date: journal[newest].date.slice(0, 5), description: recordsText(mine.length, a.permanent.limit) },
        index: newest,
      });
      return;
    }
    // «Назначенное» и «постоянное» задание — одно и то же: оба стоят в разделе «Постоянные»
    items.push({ item: { ...item, status: a.state === 'assigned' ? 'permanent' : a.state, date: a.date.slice(0, 5) }, index: last });
  });
  // Свежие действия выше
  return items.sort((x, y) => y.index - x.index).map((x) => x.item);
}

/** Тесты или задания, которые психолог недавно присылал (или человек прошёл): id, свежие первыми. Без чата — по всем чатам */
export function recentIds(d: ClientData, kind: 'test' | 'task', limit = 5, chatId?: string): string[] {
  const journal = chatId ? ofChat(d, chatId) : d.activity;
  const seen: string[] = [];
  for (let i = journal.length - 1; i >= 0; i--) {
    const a = journal[i];
    if (a.kind === kind && !seen.includes(a.ref)) seen.push(a.ref);
  }
  return seen.slice(0, limit);
}

/** По какому номеру искать результат: у записи постоянного задания он свой, у остальных — номер теста или задания */
const resultRef = (a: ItemActivity): string => (a.record ? recordRef(a.ref, a.record) : a.ref);

/** Кто стоит за записью журнала на экране «События» */
export type EventPerson = { name: string; avatar?: string };

const INVITE_EVENT_TEXT: Record<InviteResult, (role: string) => string> = {
  accepted: (role) => `Приглашение принято: роль «${role}»`,
  declined: (role) => `Приглашение отклонено: роль «${role}»`,
  received: (role) => `Предлагает роль «${role}»`,
  ended: (role) => `Работа завершена: роль «${role}»`,
};

/**
 * Экран «События»: действия людей (приглашения и ответы на них, пройденные опросники и задания), новые сверху.
 * Имя и фото берёт у чата `who`; записи тех, кого в списке уже нет, пропускаются.
 */
export function appEvents(d: ClientData, who: (chatId: string) => EventPerson | undefined): AppEvent[] {
  const out: AppEvent[] = [];
  d.activity.forEach((a) => {
    const chat = chatOf(a);
    const person = who(chat);
    if (!person) return;
    if (a.kind === 'invite') {
      // Старая запись Максима без роли: приглашение принято, перехода нет. Остальные ведут в чат, где приглашение лежит карточкой
      if (!a.role || !a.result) out.push({ id: a.id, ...person, type: 'invite', text: 'Принял приглашение стать клиентом', date: a.date.slice(0, 5), link: false });
      else out.push({ id: a.id, ...person, type: 'invite', text: INVITE_EVENT_TEXT[a.result](a.role), date: a.date.slice(0, 5), link: true, href: `/chat/${chat}` });
    } else if ((a.kind === 'test' || a.kind === 'task') && a.state === 'done') {
      out.push({
        id: a.id,
        ...person,
        type: a.kind === 'test' ? 'survey' : 'task',
        // У Максима текст от мужского лица, у остальных безличный: пол человека приложению не известен
        text:
          a.kind === 'test'
            ? chat === CLIENT_CHAT
              ? `Прошёл опросник «${itemName('test', a.ref)}»`
              : `Опросник «${itemName('test', a.ref)}» пройден`
            : a.record
              ? chat === CLIENT_CHAT
                ? `Добавил запись ${a.record} в задание «${itemName('task', a.ref)}»`
                : `Запись ${a.record} в задании «${itemName('task', a.ref)}»`
              : chat === CLIENT_CHAT
                ? `Выполнил задание «${itemName('task', a.ref)}»`
                : `Задание «${itemName('task', a.ref)}» выполнено`,
        date: a.date.slice(0, 5),
        link: true,
        // Пройденный тест или выполненное задание ведёт к результату клиента (у задания он есть не у всех)
        ...(a.kind === 'test' || findClientTaskResult(clientResultId(chat, resultRef(a))) ? { href: clientResultPath(chat, resultRef(a)) } : {}),
      });
    }
  });
  return out.reverse();
}
