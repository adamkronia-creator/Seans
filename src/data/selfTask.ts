import { useSyncExternalStore } from 'react';
import { receiveMessage } from './chatStore';
import { findClientTaskResult } from './clientTaskResults';
import { TASK_LIBRARY } from './library';
import { FAVORITES_CHAT, formatDuration } from './selfTest';
import { emptyValues, type PermanentRule, type TaskValues } from './taskValues';

/*
 * Самостоятельное выполнение задания («Пройти или отправить» → «Пройти», а также задание, отправленное себе).
 * Пока задание не завершено, написанное и время начала лежат в «прохождении»: можно выйти из бланка и вернуться.
 * Завершённое задание становится «результатом»: он виден в «Избранное» → «Задания», а в чат «Избранное»
 * приходит сообщение с кнопкой к результату. Всё хранится, пока открыто приложение.
 */

/** Общие сведения о выполнении: дата, время и сколько заняло */
export interface TaskInfo {
  date: string;
  /** «чч:мм–чч:мм» */
  time: string;
  duration: string;
  /** Возраст клиента, если он известен (у результатов клиентов) */
  age?: string;
}

interface TaskResult {
  id: string;
  taskId: string;
  /** Форма бланка, по которой выполняли задание */
  form: string;
  info: TaskInfo;
  /** Дата для карточки в «Задания»: «дд.мм» */
  date: string;
  /** Заполненный бланк */
  values: TaskValues;
  /** Постоянное задание: номер карточки-назначения в чате, к которой относится запись, и номер самой записи */
  assignment?: string;
  record?: number;
}

interface TaskRun {
  values: TaskValues;
  /** Время первого ответа: от него считается длительность */
  startedAt?: number;
}

const EMPTY: TaskRun = { values: emptyValues() };
const runs = new Map<string, TaskRun>();
/** Завершённые выполнения, новые сверху */
let results: TaskResult[] = [];
let nextResultId = 1;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getTaskRun = (taskId: string): TaskRun => runs.get(taskId) ?? EMPTY;

/** Состояние выполнения задания; обновляется при каждой правке */
export const useTaskRun = (taskId: string): TaskRun => useSyncExternalStore(subscribe, () => getTaskRun(taskId));

/** Все результаты самостоятельных выполнений, новые сверху */
export const useTaskResults = (): TaskResult[] => useSyncExternalStore(subscribe, () => results);

/** Один результат по номеру; undefined, если такого нет (например, после перезагрузки страницы) */
export const useTaskResult = (id: string): TaskResult | undefined => useSyncExternalStore(subscribe, () => results.find((r) => r.id === id));

const recordsOf = (assignment: string): number => results.filter((r) => r.assignment === assignment).length;

/** Сколько записей уже сделано по постоянному заданию (карточка-назначение в чате «Избранное»); без номера — 0 */
export const useAssignmentRecords = (assignment: string): number => useSyncExternalStore(subscribe, () => (assignment ? recordsOf(assignment) : 0));

/** Номер собственного результата по виду («t1», «t2»…): у результатов тестов номера «r1», у результатов клиентов «<чат>-<задание>» */
const isSelfTaskId = (id: string): boolean => /^t\d+$/.test(id);

/** Номер относится к результату задания: собственному или клиента (остальные номера — результаты тестов) */
export const isTaskResultId = (id: string): boolean => isSelfTaskId(id) || findClientTaskResult(id) !== undefined;

/** Изменить заполненное: время начала ставится при первой правке */
export function editTaskRun(taskId: string, change: (values: TaskValues) => TaskValues) {
  const run = getTaskRun(taskId);
  runs.set(taskId, { startedAt: run.startedAt ?? Date.now(), values: change(run.values) });
  emit();
}

/** Сбросить начатое выполнение; готовые результаты остаются */
export function resetTaskRun(taskId: string) {
  runs.delete(taskId);
  emit();
}

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function runInfo(startedAt: number, finishedAt: number): TaskInfo {
  const start = new Date(startedAt);
  return {
    date: `${pad(start.getDate())}.${pad(start.getMonth() + 1)}.${start.getFullYear()}`,
    time: `${clock(start)}–${clock(new Date(finishedAt))}`,
    duration: formatDuration(finishedAt - startedAt),
  };
}

const titleOf = (taskId: string) => TASK_LIBRARY.find((t) => t.id === taskId)?.title ?? 'Задание';

/**
 * Сохранить выполненное задание вместе с написанным: бланк сохраняется всегда. В «Избранное» приходит сообщение с кнопкой
 * к результату. У постоянного задания (`assignment` — карточка-назначение в чате) результат становится очередной записью.
 */
export function finishTaskRun(taskId: string, form: string, assignment?: string): TaskResult {
  const run = getTaskRun(taskId);
  const now = Date.now();
  const startedAt = run.startedAt ?? now;
  const day = new Date(startedAt);
  const record = assignment ? recordsOf(assignment) + 1 : undefined;
  const result: TaskResult = {
    id: `t${nextResultId++}`,
    taskId,
    form,
    info: runInfo(startedAt, now),
    date: `${pad(day.getDate())}.${pad(day.getMonth() + 1)}`,
    values: run.values,
    ...(assignment && record ? { assignment, record } : {}),
  };
  results = [result, ...results];
  runs.delete(taskId);
  emit();

  receiveMessage(FAVORITES_CHAT, {
    text: record ? `Вы добавили запись ${record} в задание «${titleOf(taskId)}»` : `Вы выполнили задание «${titleOf(taskId)}»`,
    task: taskId,
    testKind: 'passed',
    ...(record ? { record } : {}),
    buttons: [{ label: 'Посмотреть', href: `/chat/${FAVORITES_CHAT}/result/${result.id}` }],
  });
  return result;
}

/** Задание, отправленное себе: кнопка «Пройти» в чате открывает его так, как увидит клиент, с теми настройками, с какими оно ушло */
interface TaskPassRequest {
  taskId: string;
  form: string;
  comment: boolean;
  state: boolean;
  deadline: string;
  /** Сообщение клиенту без строки про срок */
  message: string;
  /** Постоянное задание: правило и карточка-назначение, к которой добавится запись */
  permanent?: PermanentRule;
  assignment?: string;
}
let pendingPass: TaskPassRequest | null = null;
export const requestTaskPass = (request: TaskPassRequest) => {
  pendingPass = request;
  // Клиент начинает с чистого листа: черновик собственного выполнения этого задания ему не показывают
  resetTaskRun(request.taskId);
};
export function takeTaskPass(taskId: string) {
  const request = pendingPass?.taskId === taskId ? pendingPass : null;
  pendingPass = null;
  return request;
}
