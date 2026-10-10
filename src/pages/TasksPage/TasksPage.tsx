import {
  TASK_CATEGORIES,
  TASK_LIBRARY,
  toggleTaskFavorite,
  useTaskFavorites,
} from '../../data/library';
import { taskSettings } from '../../data/taskSettings';
import { navigate } from '../../router';
import { LibraryPage } from '../LibraryPage/LibraryPage';

/** Раздел «Задания»: библиотека всех заданий приложения */
export function TasksPage() {
  return (
    <LibraryPage
      kind="task"
      title="Задания"
      searchPlaceholder="Поиск по заданиям"
      items={TASK_LIBRARY}
      categories={TASK_CATEGORIES}
      favorites={useTaskFavorites()}
      onToggleFavorite={toggleTaskFavorite}
      // Настройки пока есть не у всех заданий: остальные карточки без перехода
      onOpen={(t) => taskSettings(t) && navigate(`/tasks/${t.id}`)}
      labels={{ all: 'Все задания', filters: 'Фильтр заданий', emptyRecent: 'Вы ещё не присылали задания' }}
    />
  );
}
