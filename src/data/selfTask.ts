import { useSyncExternalStore } from 'react';
import { receiveMessage } from './chatStore';
import { findClientTaskResult } from './clientTaskResults';
import { TASK_LIBRARY } from './library';
import { FAVORITES_CHAT, formatDuration } from './selfTest';
import { emptyValues, type TaskValues } from './taskValues';

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

export interface TaskResult {
  id: string;
  taskId: string;
  /** Форма бланка, по которой выполняли задание */
  form: string;
  info: TaskInfo;
  /** Дата для карточки в «Задания»: «дд.мм» */
  date: string;
  /** Заполненный бланк; нет, если при выполнении была выключена «Сохранить бланк» */
  values?: TaskValues;
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

export const getTaskRun = (taskId: string): TaskRun => runs.get(taskId) ?? EMPTY;

/** Состояние выполнения задания; обновляется при каждой правке */
export const useTaskRun = (taskId: string): TaskRun => useSyncExternalStore(subscribe, () => getTaskRun(taskId));

/** Все результаты самостоятельных выполнений, новые сверху */
export const useTaskResults = (): TaskResult[] => useSyncExternalStore(subscribe, () => results);

/** Один результат по номеру; undefined, если такого нет (например, после перезагрузки страницы) */
export const useTaskResult = (id: string): TaskResult | undefined => useSyncExternalStore(subscribe, () => results.find((r) => r.id === id));

/** Номер собственного результата по виду («t1», «t2»…): у результатов тестов номера «r1», у результатов клиентов «<чат>-<задание>» */
export const isSelfTaskId = (id: string): boolean => /^t\d+$/.test(id);

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
 * Сохранить выполненное задание. Если включено «Сохранить бланк», вместе с результатом сохраняется то, что написано
 * (без него у результата только сведения о выполнении). В «Избранное» приходит сообщение с кнопкой к результату.
 */
export function finishTaskRun(taskId: string, form: string, saveBlank: boolean): TaskResult {
  const run = getTaskRun(taskId);
  const now = Date.now();
  const startedAt = run.startedAt ?? now;
  const day = new Date(startedAt);
  const result: TaskResult = {
    id: `t${nextResultId++}`,
    taskId,
    form,
    info: runInfo(startedAt, now),
    date: `${pad(day.getDate())}.${pad(day.getMonth() + 1)}`,
    ...(saveBlank ? { values: run.values } : {}),
  };
  results = [result, ...results];
  runs.delete(taskId);
  emit();

  receiveMessage(FAVORITES_CHAT, {
    text: `Вы выполнили задание «${titleOf(taskId)}»`,
    task: taskId,
    testKind: 'passed',
    buttons: [{ label: 'Посмотреть', href: `/chat/${FAVORITES_CHAT}/result/${result.id}` }],
  });
  return result;
}

/** Задание, отправленное себе: кнопка «Пройти» в чате открывает его так, как увидит клиент, с теми настройками, с какими оно ушло */
export interface TaskPassRequest {
  taskId: string;
  form: string;
  comment: boolean;
  state: boolean;
  saveBlank: boolean;
  deadline: string;
  /** Сообщение клиенту без строки про срок */
  message: string;
}
let pendingPass: TaskPassRequest | null = null;
export const requestTaskPass = (request: TaskPassRequest) => {
  pendingPass = request;
};
export function takeTaskPass(taskId: string) {
  const request = pendingPass?.taskId === taskId ? pendingPass : null;
  pendingPass = null;
  return request;
}
