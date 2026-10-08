import { useSyncExternalStore } from 'react';
import { receiveMessage } from './chatStore';
import { scoreBdi, scoreBhs } from './beckScoring';
import { bdiResult, bhsResult, ittResult, osrResult, smolResult, type ConclusionData } from './conclusions';
import { scoreItt } from './ittScoring';
import { LIBRARY } from './library';
import { scoreOsr } from './osrScoring';
import { scoreSmol } from './smolScoring';

/*
 * Самостоятельное прохождение теста («Провести тест» → «Пройти самому»).
 * Пока тест не завершён, ответы и время начала лежат в «прохождении» (можно выйти из бланка и вернуться).
 * Завершённый тест становится «результатом»: он виден в «Избранное» → «Тесты», а в чат «Избранное»
 * приходит сообщение с кнопкой к результату. Всё хранится, пока открыто приложение.
 */

/** Чат, куда приходят результаты самостоятельных прохождений */
export const FAVORITES_CHAT = 'favorites';

export interface SelfResult {
  id: string;
  testId: string;
  data: ConclusionData;
  /** Форма бланка, по которой считали (от неё зависят нормы) */
  form: string;
  /** Дата прохождения для карточки в «Тесты»: «дд.мм» */
  date: string;
  /** Номер вопроса (с 0) → номер выбранного ответа; есть, только если при прохождении была включена «Сохранить бланк» */
  answers?: Record<number, number>;
}

export interface SelfRun {
  /** Номер вопроса (с 0) → номер выбранного ответа */
  answers: Record<number, number>;
  /** Время первого ответа: от него считается длительность */
  startedAt?: number;
}

const EMPTY: SelfRun = { answers: {} };
const runs = new Map<string, SelfRun>();
/** Завершённые прохождения, новые сверху */
let results: SelfResult[] = [];
let nextResultId = 1;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getRun = (testId: string): SelfRun => runs.get(testId) ?? EMPTY;

/** Состояние прохождения теста; обновляется при каждом ответе */
export const useSelfRun = (testId: string): SelfRun => useSyncExternalStore(subscribe, () => getRun(testId));

/** Все результаты самостоятельных прохождений, новые сверху */
export const useSelfResults = (): SelfResult[] => useSyncExternalStore(subscribe, () => results);

/** Один результат по id; undefined, если такого нет (например, после перезагрузки страницы) */
export const useSelfResult = (id: string): SelfResult | undefined =>
  useSyncExternalStore(subscribe, () => results.find((r) => r.id === id));

export function answerQuestion(testId: string, question: number, answer: number) {
  const run = getRun(testId);
  runs.set(testId, { startedAt: run.startedAt ?? Date.now(), answers: { ...run.answers, [question]: answer } });
  emit();
}

/** Сбросить начатое прохождение; готовые результаты остаются */
export function resetRun(testId: string) {
  runs.delete(testId);
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
  bdi: (answers, _form, info) => bdiResult(scoreBdi(answers), info),
  bhs: (answers, _form, info) => bhsResult(scoreBhs(answers), info),
  // Мужская форма — нормы для взрослых и юношей, женская — для девушек
  itt: (answers, form, info) => ittResult(scoreItt(answers, form === 'Женская'), info),
  ocr: (answers, _form, info) => osrResult(scoreOsr(answers), info),
};

export const canPassSelf = (testId: string) => testId in SCORERS;

/** Подсказки под выбором формы бланка: тесты, где форма меняет подсчёт (нормы), и чем именно */
const FORM_HINT: Record<string, string> = {
  smol: 'От формы бланка зависит перевод баллов в Т-баллы.',
  itt: 'От формы бланка зависят нормы для перевода баллов в стэны: мужская — для взрослых и юношей, женская — для девушек.',
};

/** Тесты, где форма бланка меняет подсчёт (нормы для мужчин и женщин): для них форму выбирают в начале прохождения */
export const formAffectsScore = (testId: string) => testId in FORM_HINT;

export const formHint = (testId: string): string => FORM_HINT[testId] ?? '';

/** Текст сообщения в «Избранном» о пройденном тесте */
const PASSED_TEXT: Record<string, string> = {
  smol: 'Вы прошли сокращенный многофакторный опросник для исследования личности «СМОЛ»',
  bdi: 'Вы прошли шкалу депрессии А. Бека «BDI»',
  bhs: 'Вы прошли шкалу безнадежности А. Бека «BHS»',
  itt: 'Вы прошли интегративный тест тревожности «ИТТ»',
  ocr: 'Вы прошли опросник суицидального риска «ОСР»',
};

const passedText = (testId: string) =>
  PASSED_TEXT[testId] ?? `Вы прошли тест «${LIBRARY.find((t) => t.id === testId)?.title ?? testId}»`;

/**
 * Посчитать результат по всем ответам и сохранить его. Если включено «Сохранить бланк», вместе с результатом
 * сохраняются ответы (по ним в заключении открывается бланк). В «Избранное» приходит сообщение с кнопкой к результату.
 * Вернёт undefined, если ответили не на все вопросы.
 */
export function finishRun(testId: string, total: number, form: string, saveBlank: boolean): SelfResult | undefined {
  const run = getRun(testId);
  const score = SCORERS[testId];
  const answers = Array.from({ length: total }, (_, i) => run.answers[i]);
  if (!score || answers.some((a) => a === undefined)) return undefined;

  const now = Date.now();
  const day = new Date(run.startedAt ?? now);
  const result: SelfResult = {
    id: `r${nextResultId++}`,
    testId,
    data: score(answers, form, runInfo(run.startedAt ?? now, now)),
    form,
    date: `${pad(day.getDate())}.${pad(day.getMonth() + 1)}`,
    ...(saveBlank ? { answers: { ...run.answers } } : {}),
  };
  results = [result, ...results];
  runs.delete(testId);
  emit();

  receiveMessage(FAVORITES_CHAT, {
    text: passedText(testId),
    buttons: [{ label: 'Посмотреть заключение теста', href: `/chat/${FAVORITES_CHAT}/result/${result.id}` }],
  });
  return result;
}
