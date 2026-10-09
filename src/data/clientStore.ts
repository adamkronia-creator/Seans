import { useSyncExternalStore } from 'react';
import { CASE_SECTIONS, type CaseSection } from './case';
import { CASE_FILES, fileKind, fileMeta, type CaseFile } from './files';
import { CASE_NOTES, type CaseNote } from './notes';
import { LIBRARY, TASK_LIBRARY } from './library';
import type { PsyTest } from './tests';
import type { AppEvent } from './events';
import { clientResultPath } from './resultLinks';
import avatar1 from '../assets/avatars/avatar-1.png';

/*
 * Единый источник правды по клиенту (пока только Максим): журнал действий.
 * Из него собираются «История взаимодействия», вкладки «Тесты», «Задания»,
 * «Кейс → Заметки» и экран «События», поэтому новое действие появляется везде сразу.
 * Новые действия добавляются в конец журнала функциями ниже (addNote, sendTest и т. д.).
 */

export type ActivityState = 'assigned' | 'sent' | 'done';

export interface Session {
  id: string;
  number: number;
  paragraphs: string[];
}

export type Activity =
  | { id: string; kind: 'invite'; date: string }
  | { id: string; kind: 'session'; ref: string; date: string }
  | { id: string; kind: 'note'; ref: string; date: string }
  | { id: string; kind: 'test' | 'task'; ref: string; state: ActivityState; date: string; time: string };

interface ClientData {
  activity: Activity[];
  notes: CaseNote[];
  sessions: Session[];
  /** Сведения кейса: редактируются (иконка, цвет, заголовок, текст) */
  caseSections: CaseSection[];
  /** Комментарии психолога к тестам и заданиям в истории: id записи журнала → текст */
  comments: Record<string, string>;
  /** Файлы кейса по клиентам: id чата → файлы, новые сверху */
  files: Record<string, CaseFile[]>;
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
const t = (kind: 'test' | 'task', ref: string, state: ActivityState, date: string, time: string): Activity => ({
  id: nextId(),
  kind,
  ref,
  state,
  date,
  time,
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
  s('s6', '08.10.2026'),
  // Есть во вкладках «Тесты» и «Задания» (09.10), в макете истории их нет; время придумано
  t('test', 'itt', 'sent', '09.10.2026', '09:30'),
  t('task', 'pie', 'sent', '09.10.2026', '09:40'),
  t('task', 'smer', 'assigned', '09.10.2026', '09:50'),
];

let data: ClientData = {
  activity: SEED,
  notes: CASE_NOTES,
  sessions: SESSIONS,
  caseSections: CASE_SECTIONS,
  comments: {},
  files: { maxim: CASE_FILES },
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

const pad = (v: number) => String(v).padStart(2, '0');
export function nowStamp() {
  const d = new Date();
  return {
    date: `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

// ——— Действия: каждое дописывает запись в журнал ———

export function addNote(title: string, paragraphs: string[]) {
  const { date } = nowStamp();
  const note: CaseNote = {
    id: `n${data.notes.length + 1}-${Date.now()}`,
    title,
    paragraphs,
    icon: 'pin',
    tone: 'purple',
    updated: date,
  };
  update({
    notes: [...data.notes, note],
    activity: [...data.activity, { id: nextId(), kind: 'note', ref: note.id, date }],
  });
}

export function addSession(paragraphs: string[]) {
  const { date } = nowStamp();
  const session: Session = { id: `s${data.sessions.length + 1}-${Date.now()}`, number: data.sessions.length + 1, paragraphs };
  update({
    sessions: [...data.sessions, session],
    activity: [...data.activity, { id: nextId(), kind: 'session', ref: session.id, date }],
  });
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

/** Прикрепляет выбранные файлы к кейсу клиента; новые идут первыми */
export function attachFiles(clientId: string, picked: File[]) {
  const { date } = nowStamp();
  const added: CaseFile[] = picked.map((f, i) => {
    const kind = fileKind(f);
    return {
      id: `f-${Date.now()}-${i}`,
      name: f.name,
      kind,
      meta: fileMeta(kind, f.size),
      date: date.slice(0, 5),
      url: URL.createObjectURL(f),
    };
  });
  update({ files: { ...data.files, [clientId]: [...added.reverse(), ...(data.files[clientId] ?? [])] } });
}

/** Тест или задание: назначено / отправлено / выполнено */
export function logStep(kind: 'test' | 'task', ref: string, state: ActivityState) {
  const { date, time } = nowStamp();
  update({ activity: [...data.activity, { id: nextId(), kind, ref, state, date, time }] });
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
    };

export type HistoryFilter = 'all' | 'session' | 'test' | 'task' | 'note';

// Каталог тестов и заданий — библиотеки приложения; статус и дата берутся из журнала клиента
const catalog = (kind: 'test' | 'task') => (kind === 'test' ? LIBRARY : TASK_LIBRARY);
const itemName = (kind: 'test' | 'task', ref: string) =>
  kind === 'test'
    ? (TEST_META[ref]?.name ?? LIBRARY.find((x) => x.id === ref)!.title.split(':')[0])
    : TASK_LIBRARY.find((x) => x.id === ref)!.title;

function activityText(kind: 'test' | 'task', ref: string, state: ActivityState): string {
  if (kind === 'test') {
    const meta = TEST_META[ref];
    const what = meta?.what ?? `опросник «${itemName('test', ref)}»`;
    if (state === 'done') return meta?.doneText ?? `Максим заполнил ${what}`;
    return `Вы отправили ${what}`;
  }
  const name = itemName('task', ref);
  if (state === 'done') return `Максим выполнил психологическое задание «${name}»`;
  if (state === 'sent') return `Вы отправили психологическое задание «${name}»`;
  return `Вы назначили психологическое задание «${name}»`;
}

export function historyEvents(d: ClientData): HistoryEvent[] {
  return d.activity.map((a): HistoryEvent => {
    switch (a.kind) {
      case 'invite':
        return {
          id: a.id,
          kind: 'invite',
          date: a.date,
          title: 'Новый клиент',
          text: 'Максим принял приглашение стать клиентом.',
        };
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
          title: `Заметка: ${note.title}`,
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
          title: a.kind === 'test' ? name : `«${name}»`,
          date: `${a.date} ${a.time}`,
          text: activityText(a.kind, a.ref, a.state),
          comment: d.comments[a.id],
        };
      }
    }
  });
}

/** Сколько элементов у фильтра: тесты и задания считаются по отдельным тестам/заданиям, а не по их отправкам и выполнениям */
export function countOf(d: ClientData, filter: HistoryFilter): number {
  if (filter === 'all') return d.activity.length;
  if (filter === 'test' || filter === 'task') {
    return new Set(d.activity.flatMap((a) => (a.kind === filter ? [a.ref] : []))).size;
  }
  return d.activity.filter((a) => a.kind === filter).length;
}

export function doneCount(d: ClientData, kind: 'test' | 'task'): number {
  return new Set(d.activity.flatMap((a) => (a.kind === kind && a.state === 'done' ? [a.ref] : []))).size;
}

/** Тесты и задания в том виде, как их показывают вкладки: статус и дата — по последнему действию */
export function itemsWithStatus(d: ClientData, kind: 'test' | 'task'): PsyTest[] {
  const items: { item: PsyTest; index: number }[] = [];
  catalog(kind).forEach(({ categories: _c, ...base }) => {
    const item = { ...base, status: 'sent' as const, date: '' };
    let last = -1;
    d.activity.forEach((a, i) => {
      if (a.kind === kind && a.ref === item.id) last = i;
    });
    if (last < 0) return;
    const a = d.activity[last] as Extract<Activity, { state: ActivityState }>;
    items.push({ item: { ...item, status: a.state, date: a.date.slice(0, 5) }, index: last });
  });
  // Свежие действия выше
  return items.sort((x, y) => y.index - x.index).map((x) => x.item);
}

/** Тесты или задания, которые психолог недавно присылал клиенту (или клиент прошёл): id, свежие первыми */
export function recentIds(d: ClientData, kind: 'test' | 'task', limit = 5): string[] {
  const seen: string[] = [];
  for (let i = d.activity.length - 1; i >= 0; i--) {
    const a = d.activity[i];
    if (a.kind === kind && !seen.includes(a.ref)) seen.push(a.ref);
  }
  return seen.slice(0, limit);
}

/** Экран «События»: действия самого клиента (приглашение, пройденные опросники и задания), новые сверху */
export function appEvents(d: ClientData): AppEvent[] {
  const maxim = { name: 'Максим Мартынов', avatar: avatar1 };
  const out: AppEvent[] = [];
  d.activity.forEach((a) => {
    if (a.kind === 'invite') {
      out.push({ id: a.id, ...maxim, type: 'invite', text: 'Принял приглашение стать клиентом', date: a.date.slice(0, 5), link: false });
    } else if ((a.kind === 'test' || a.kind === 'task') && a.state === 'done') {
      out.push({
        id: a.id,
        ...maxim,
        type: a.kind === 'test' ? 'survey' : 'task',
        text:
          a.kind === 'test'
            ? `Прошел опросник «${itemName('test', a.ref)}»`
            : `Выполнил задание «${itemName('task', a.ref)}»`,
        date: a.date.slice(0, 5),
        link: true,
        // Пройденный тест ведёт к результату клиента; у заданий экрана результата пока нет
        ...(a.kind === 'test' ? { href: clientResultPath('maxim', a.ref) } : {}),
      });
    }
  });
  return out.reverse();
}
