import type { ConclusionData } from './conclusions';
import { clientResultId } from './resultLinks';
import { conclusionFromAnswers } from './selfTest';

/*
 * Результаты тестов, которые прошли клиенты (пока только Максим). Психолог открывает их кнопкой «Посмотреть»
 * в сообщении о пройденном тесте, карточкой на вкладке «Тесты» и записью в «Событиях».
 * Заключение считается по ответам клиента теми же подсчётами, что и самостоятельное прохождение психолога,
 * поэтому выглядит так же и содержит ту же кнопку к бланку со всеми ответами.
 */

export interface ClientResult {
  /** «<чат>-<тест>»: см. clientResultId */
  id: string;
  chatId: string;
  testId: string;
  /** Заключение; нет у теста, для которого ещё не заведены бланк и подсчёт */
  data?: ConclusionData;
  /** Форма бланка, по которой клиент проходил тест (от неё зависят нормы) */
  form: string;
  /** Номер вопроса (с 0) → номер выбранного ответа: по ним открывается бланк клиента */
  answers?: Record<number, number>;
}

/** Прохождение клиента: какой тест и как он его прошёл */
interface ClientRun {
  chatId: string;
  testId: string;
  /** Форма бланка, по которой клиент проходил тест (от неё зависят нормы) */
  form: string;
  /** Ответы и сведения о прохождении; нет у теста, для которого в приложении ещё нет бланка и подсчёта */
  pass?: {
    /** Номера выбранных ответов по порядку вопросов */
    answers: number[];
    date: string;
    /** «чч:мм–чч:мм»: от первого ответа до «Завершить тест»; конец совпадает со временем сообщения «заполнил» в чате */
    time: string;
    duration: string;
  };
}

/** Возраст клиента на момент прохождения: Максим родился 14.03.1997, тесты пройдены в сентябре 2026 */
const AGE: Record<string, string> = { maxim: '29 лет' };

/*
 * Ответы Максима подобраны под его кейс (тревога, ориентация на ожидания других, строгость к себе):
 *  PHQ-9 — 8 баллов, лёгкая депрессия, мысли о смерти (9-й вопрос) не отмечены;
 *  GAD-7 — 12 баллов, средняя тревожность;
 *  5PFQ — интроверсия, высокие привязанность и самоконтроль, эмоциональная неустойчивость, экспрессивность в норме;
 *  SCL-90 — GSI 1,28 (выше нормы 1,1), PSDI 1,74, PST 66; сильнее всего межличностная сензитивность, тревожность и обсессивность;
 *  RSES — результата пока нет: бланка и подсчёта этой шкалы в приложении ещё нет.
 */
const RUNS: ClientRun[] = [
  {
    chatId: 'maxim',
    testId: 'phq9',
    form: 'Мужская',
    pass: { answers: [1, 1, 1, 2, 0, 2, 1, 0, 0], date: '04.09.2026', time: '21:19–21:22', duration: '2 мин. 47 с.' },
  },
  {
    chatId: 'maxim',
    testId: 'gad7',
    form: '',
    pass: { answers: [2, 2, 2, 2, 1, 2, 1], date: '05.09.2026', time: '19:05–19:08', duration: '2 мин. 22 с.' },
  },
  { chatId: 'maxim', testId: 'rses', form: '' },
  {
    chatId: 'maxim',
    testId: '5pfq',
    form: 'Мужская',
    pass: {
      answers: [
        2, 0, 1, 0, 3, 3, 1, 0, 2, 2, 1, 1, 2, 0, 1, 2, 0, 2, 0, 1, 3, 2, 0, 1, 1, 4, 1, 2, 2, 3, 2, 1, 1, 1, 2, 2, 2, 1,
        3, 2, 3, 3, 0, 2, 3, 4, 2, 3, 0, 1, 3, 1, 1, 1, 1, 2, 0, 1, 0, 2, 4, 2, 2, 1, 4, 2, 1, 0, 3, 2, 4, 2, 2, 1, 2,
      ],
      date: '09.09.2026',
      time: '21:51–22:14',
      duration: '22 мин. 36 с.',
    },
  },
  {
    chatId: 'maxim',
    testId: 'scl90',
    form: 'Единая',
    pass: {
      answers: [
        1, 1, 3, 0, 0, 2, 0, 0, 3, 3, 1, 1, 0, 2, 0, 0, 2, 2, 0, 2, 4, 2, 1, 0, 0, 2, 2, 1, 3, 1, 1, 1, 3, 3, 0, 1, 2, 3,
        1, 0, 1, 2, 1, 2, 2, 1, 1, 0, 1, 0, 2, 1, 0, 1, 1, 1, 3, 1, 0, 1, 2, 1, 2, 1, 0, 2, 2, 2, 2, 0, 2, 1, 2, 2, 1, 3,
        0, 2, 2, 0, 0, 1, 1, 0, 2, 3, 0, 0, 2, 1,
      ],
      date: '11.09.2026',
      time: '20:39–20:53',
      duration: '13 мин. 48 с.',
    },
  },
];

function build({ chatId, testId, form, pass }: ClientRun): ClientResult {
  const base = { id: clientResultId(chatId, testId), chatId, testId, form };
  if (!pass) return base;
  const age = AGE[chatId];
  const info = { date: pass.date, time: pass.time, duration: pass.duration, ...(age ? { age } : {}) };
  const data = conclusionFromAnswers(testId, pass.answers, form, info);
  return {
    ...base,
    ...(data ? { data } : {}),
    answers: Object.fromEntries(pass.answers.map((answer, i) => [i, answer])),
  };
}

const RESULTS: ClientResult[] = RUNS.map(build);

/** Результат клиента по его номеру; undefined, если такого нет */
export const findClientResult = (id: string): ClientResult | undefined => RESULTS.find((r) => r.id === id);
