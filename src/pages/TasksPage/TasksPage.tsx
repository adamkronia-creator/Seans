import {
  TASK_CATEGORIES,
  TASK_LIBRARY,
  toggleTaskFavorite,
  useTaskFavorites,
} from '../../data/library';
import { LibraryPage } from '../LibraryPage/LibraryPage';

/** Раздел «Психологические задания»: библиотека всех заданий приложения */
export function TasksPage() {
  return (
    <LibraryPage
      kind="task"
      title="Психологические задания"
      searchPlaceholder="Поиск по заданиям"
      items={TASK_LIBRARY}
      categories={TASK_CATEGORIES}
      favorites={useTaskFavorites()}
      onToggleFavorite={toggleTaskFavorite}
      labels={{ all: 'Все задания', filters: 'Фильтр заданий', emptyRecent: 'Вы ещё не присылали задания' }}
    />
  );
}
