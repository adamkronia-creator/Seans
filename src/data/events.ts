import avatar1 from '../assets/avatars/avatar-1.png';

export type EventType = 'task' | 'survey' | 'invite';

export interface AppEvent {
  id: string;
  name: string;
  avatar: string;
  type: EventType;
  text: string;
  /** Дата в формате ДД.ММ */
  date: string;
  /** Есть ли переход к результату (шеврон справа) */
  link: boolean;
}

const MAXIM = { name: 'Максим Мартынов', avatar: avatar1 };

// Тестовые события, порядок и даты как в макете
export const EVENTS: AppEvent[] = [
  { id: 'e1', ...MAXIM, type: 'task', text: 'Выполнил задание «Если никто не узнает»', date: '27.09', link: true },
  { id: 'e2', ...MAXIM, type: 'task', text: 'Выполнил задание «Фраза, которую я запомнил»', date: '19.09', link: true },
  { id: 'e3', ...MAXIM, type: 'survey', text: 'Прошел опросник «SCL-90»', date: '11.09', link: true },
  { id: 'e4', ...MAXIM, type: 'task', text: 'Выполнил задание «Выбор без правильного ответа»', date: '13.09', link: true },
  { id: 'e5', ...MAXIM, type: 'survey', text: 'Прошел опросник «5PFQ»', date: '09.09', link: true },
  { id: 'e6', ...MAXIM, type: 'task', text: 'Выполнил задание «Что я должен?»', date: '07.09', link: true },
  { id: 'e7', ...MAXIM, type: 'survey', text: 'Прошел опросник «RSES»', date: '07.09', link: true },
  { id: 'e8', ...MAXIM, type: 'survey', text: 'Прошел опросник «GAD-7»', date: '05.09', link: true },
  { id: 'e9', ...MAXIM, type: 'survey', text: 'Прошел опросник «PHQ-9»', date: '04.09', link: true },
  { id: 'e10', ...MAXIM, type: 'invite', text: 'Принял приглашение стать клиентом', date: '03.09', link: false },
];
