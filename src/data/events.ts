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
  /** Куда ведёт событие (hash-маршрут без «#»), например результат пройденного клиентом теста; у остальных пока нет перехода */
  href?: string;
}

// Список событий собирается из журнала действий клиента: см. appEvents в clientStore.ts
