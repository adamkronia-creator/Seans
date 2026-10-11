import type { LibraryItem } from './library';
import { TASKS } from './taskContent';
import type { TaskSettingsData } from './taskValues';

/*
 * Поиск настроек задания: описание, бланк, пример выполнения. Подключает тексты заданий (taskContent.ts),
 * поэтому нужен только экранам настройки, выполнения и результата; всем остальным хватает taskValues.ts.
 */

export * from './taskValues';

/** Настройки задания, если они у него есть */
export const taskSettings = (task: Pick<LibraryItem, 'id'>): TaskSettingsData | undefined => TASKS[task.id];
