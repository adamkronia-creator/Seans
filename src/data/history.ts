import { CASE_NOTES } from './notes';

/** Одно событие в истории взаимодействия с клиентом (тестовые данные Максима, порядок и даты как в макете) */
export type HistoryEvent =
  | { id: string; kind: 'session'; number: number; date: string; paragraphs: string[] }
  | { id: string; kind: 'note'; title: string; date: string; paragraphs: string[] }
  | { id: string; kind: 'test' | 'task'; state: 'sent' | 'done'; title: string; date: string; text: string };

export type HistoryFilter = 'all' | 'session' | 'test' | 'task' | 'note';

const note = (id: string): HistoryEvent => {
  const n = CASE_NOTES.find((item) => item.id === id)!;
  return {
    id: `note-${id}`,
    kind: 'note',
    title: `Заметка: ${n.title}`,
    date: n.updated,
    paragraphs: n.paragraphs,
  };
};

const test = (
  name: string,
  what: string,
  state: 'sent' | 'done',
  date: string,
): HistoryEvent => ({
  id: `test-${name}-${state}`,
  kind: 'test',
  state,
  title: name,
  date,
  text: `${state === 'sent' ? 'Вы отправили' : 'Максим заполнил'} ${what}`,
});

const task = (name: string, state: 'sent' | 'done', date: string): HistoryEvent => ({
  id: `task-${name}-${state}`,
  kind: 'task',
  state,
  title: `«${name}»`,
  date,
  text: `${state === 'sent' ? 'Вы назначили' : 'Максим выполнил'} психологическое задание «${name}»`,
});

const PHQ9 = 'опросник депрессивного состояния «PHQ-9»';
const GAD7 = 'опросник генерализованного тревожного расстройства «GAD-7»';
const RSES = 'опросник самоуважения Розенберга «RSES»';
const PFQ5 = 'пятифакторный опросник личности «5PFQ»';
const SCL90 = 'симптоматический опросник «SCL-90»';

export const HISTORY: HistoryEvent[] = [
  {
    id: 's1',
    kind: 'session',
    number: 1,
    date: '03.09.2026',
    paragraphs: [
      'Первичное обращение.',
      'Основные темы: тревога, необходимость соответствовать ожиданиям, страх ошибиться.',
      'Пациент ожидает от аналитика четкого объяснения происходящего.',
    ],
  },
  note('n1'),
  test('PHQ-9', PHQ9, 'sent', '04.09.2026 18:42'),
  test('PHQ-9', PHQ9, 'done', '04.09.2026 21:22'),
  test('GAD-7', GAD7, 'sent', '05.09.2026 10:08'),
  test('GAD-7', GAD7, 'done', '05.09.2026 19:08'),
  task('Что я должен?', 'sent', '06.09.2026 18:26'),
  test('RSES', RSES, 'sent', '07.09.2026 09:31'),
  test('RSES', RSES, 'done', '07.09.2026 20:51'),
  task('Что я должен?', 'done', '07.09.2026 22:14'),
  test('5PFQ', PFQ5, 'sent', '09.09.2026 12:15'),
  test('5PFQ', PFQ5, 'done', '09.09.2026 22:14'),
  {
    id: 's2',
    kind: 'session',
    number: 2,
    date: '10.09.2026',
    paragraphs: [
      'Обсуждение отношений с матерью и прошлого опыта достижений.',
      'Появляется повторяющаяся формула «не разочаровать».',
    ],
  },
  note('n2'),
  test('SCL-90', SCL90, 'sent', '11.09.2026 11:04'),
  // в макете переносы в этом тексте заданы вручную
  { ...test('SCL-90', SCL90, 'done', '11.09.2026 20:53'), text: 'Максим заполнил\nсимптоматический опросник\n«SCL-90»' } as HistoryEvent,
  task('Выбор без правильного ответа', 'sent', '12.09.2026 17:40'),
  note('n3'),
  task('Выбор без правильного ответа', 'done', '13.09.2026 23:06'),
  {
    id: 's3',
    kind: 'session',
    number: 3,
    date: '17.09.2026',
    paragraphs: [
      'Разбор истории романтических отношений.',
      'Выявляется повторяющаяся последовательность: сближение → соответствие ожиданиям → ощущение давления → дистанцирование → сожаление.',
    ],
  },
  note('n4'),
  task('Фраза, которую я запомнил', 'sent', '18.09.2026 16:12'),
  task('Фраза, которую я запомнил', 'done', '19.09.2026 21:38'),
  note('n5'),
  {
    id: 's4',
    kind: 'session',
    number: 4,
    date: '17.09.2026', // в макете именно так
    paragraphs: [
      'Обсуждение реакции пациента на молчание и отсутствие прямых рекомендаций.',
      'Усиление материала переноса.',
      'Появляется вопрос о собственной позиции субъекта.',
    ],
  },
  note('n6'),
  task('Если никто не узнает', 'sent', '26.09.2026 15:05'),
  task('Если никто не узнает', 'done', '27.09.2026 20:57'),
  note('n7'),
  {
    id: 's5',
    kind: 'session',
    number: 5,
    date: '01.10.2026',
    paragraphs: [
      'Пациент сообщает о рабочей ситуации, в которой впервые сознательно отказался от необходимости получить одобрение руководителя.',
      'При этом испытывал выраженный дискомфорт и сомнения.',
    ],
  },
  {
    id: 's6',
    kind: 'session',
    number: 6,
    date: '08.10.2026',
    paragraphs: [
      'Исследование фразы «я не понимаю, кто я, если не стараюсь быть правильным».',
      'Работа с повторяющимися означающими «правильный», «хороший», «достаточный».',
      'Запрос смещается от устранения тревоги к исследованию собственного желания.',
    ],
  },
];

/** Сколько раз событие данного вида встречается: чипсы считают сами тесты и задания, а не их отправки и завершения */
export function countOf(filter: HistoryFilter): number {
  if (filter === 'all') return HISTORY.length;
  if (filter === 'test' || filter === 'task') {
    const titles = HISTORY.flatMap((e) => (e.kind === filter ? [e.title] : []));
    return new Set(titles).size;
  }
  return HISTORY.filter((e) => e.kind === filter).length;
}
