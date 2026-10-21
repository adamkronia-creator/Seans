export type EventType = 'task' | 'survey' | 'invite';

export interface AppEvent {
  id: string;
  name: string;
  /** Фото человека; у контакта без фото на его месте буквы имени */
  avatar?: string;
  type: EventType;
  text: string;
  /** Дата в формате ДД.ММ */
  date: string;
  /** Есть ли переход к результату (шеврон справа) */
  link: boolean;
  /** Куда ведёт событие (hash-маршрут без «#»), например результат пройденного клиентом теста; у остальных пока нет перехода */
  href?: string;
}

// Список событий собирается из журнала действий (по всем чатам): см. appEvents в clientStore.ts
