import { useSyncExternalStore } from 'react';
import { smolResult, type ConclusionData } from './conclusions';
import { scoreSmol } from './smolScoring';

/*
 * Самостоятельное прохождение теста («Провести тест» → «Пройти самому»): ответы, время начала
 * и готовое заключение хранятся, пока открыто приложение, чтобы можно было выйти из бланка и вернуться.
 */

export interface SelfResult {
  data: ConclusionData;
  /** Форма бланка, по которой считали (от неё зависят нормы) */
  form: string;
}

export interface SelfRun {
  /** Номер вопроса (с 0) → номер выбранного ответа */
  answers: Record<number, number>;
  /** Время первого ответа: от него считается длительность */
  startedAt?: number;
  /** Последнее завершённое прохождение */
  result?: SelfResult;
}

const EMPTY: SelfRun = { answers: {} };
const runs = new Map<string, SelfRun>();
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getRun = (testId: string): SelfRun => runs.get(testId) ?? EMPTY;

/** Состояние прохождения теста; обновляется при каждом ответе */
export const useSelfRun = (testId: string): SelfRun => useSyncExternalStore(subscribe, () => getRun(testId));

export function answerQuestion(testId: string, question: number, answer: number) {
  const run = getRun(testId);
  runs.set(testId, { ...run, startedAt: run.startedAt ?? Date.now(), answers: { ...run.answers, [question]: answer } });
  emit();
}

/** Сбросить начатое прохождение; готовое заключение остаётся до следующего завершения */
export function resetRun(testId: string) {
  const run = getRun(testId);
  runs.set(testId, { answers: {}, result: run.result });
  emit();
}

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** «18 мин. 43 с.», «4 мин. 12 с.», «45 с.», «1 ч. 5 мин.» */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} ч. ${m} мин.`;
  return m > 0 ? `${m} мин. ${s} с.` : `${s} с.`;
}

/** Общая информация заключения: дата и время прохождения, длительность */
function runInfo(startedAt: number, finishedAt: number): ConclusionData['info'] {
  const start = new Date(startedAt);
  const end = new Date(finishedAt);
  return {
    date: `${pad(start.getDate())}.${pad(start.getMonth() + 1)}.${start.getFullYear()}`,
    time: `${clock(start)}–${clock(end)}`,
    duration: formatDuration(finishedAt - startedAt),
  };
}

/** Тесты, которые уже умеют считать результат; остальным «Пройти самому» пока недоступно */
const SCORERS: Record<string, (answers: number[], form: string, info: ConclusionData['info']) => ConclusionData> = {
  smol: (answers, form, info) => {
    const scores = scoreSmol(answers, form === 'Женская');
    return smolResult(scores.t, info, scores.validity);
  },
};

export const canPassSelf = (testId: string) => testId in SCORERS;

/** Посчитать результат по всем ответам и сохранить заключение. Вернёт false, если ответили не на все вопросы. */
export function finishRun(testId: string, total: number, form: string): boolean {
  const run = getRun(testId);
  const score = SCORERS[testId];
  const answers = Array.from({ length: total }, (_, i) => run.answers[i]);
  if (!score || answers.some((a) => a === undefined)) return false;
  const now = Date.now();
  const data = score(answers, form, runInfo(run.startedAt ?? now, now));
  runs.set(testId, { answers: {}, result: { data, form } });
  emit();
  return true;
}
