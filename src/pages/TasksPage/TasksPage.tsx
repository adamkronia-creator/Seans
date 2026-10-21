import { TASK_LIBRARY, toggleTaskFavorite, useTaskFavorites } from '../../data/library';
import { hasTaskSettings } from '../../data/taskValues';
import { navigate } from '../../router';
import { LibraryPage } from '../LibraryPage/LibraryPage';

/** Раздел «Задания»: библиотека всех заданий приложения */
export function TasksPage() {
  return (
    <LibraryPage
      kind="task"
      chatLike
      title="Практика"
      searchPlaceholder="Поиск по заданиям"
      items={TASK_LIBRARY}
      favorites={useTaskFavorites()}
      onToggleFavorite={toggleTaskFavorite}
      // Настройки пока есть не у всех заданий: остальные карточки без перехода
      onOpen={(t) => hasTaskSettings(t.id) && navigate(`/tasks/${t.id}`)}
      labels={{ all: 'Все задания', filters: 'Фильтр заданий', emptyRecent: 'Вы ещё не присылали задания', noun: ['задание', 'задания', 'заданий'], everywhere: 'Искать во всех заданиях' }}
    />
  );
}
