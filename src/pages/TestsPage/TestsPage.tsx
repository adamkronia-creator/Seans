import { LIBRARY, TEST_CATEGORIES, toggleFavorite, useFavorites } from '../../data/library';
import { navigate } from '../../router';
import { LibraryPage } from '../LibraryPage/LibraryPage';

/** Раздел «Психологические тесты»: библиотека всех тестов приложения */
export function TestsPage() {
  return (
    <LibraryPage
      kind="test"
      title="Тестовые материалы"
      searchPlaceholder="Поиск тестов..."
      items={LIBRARY}
      categories={TEST_CATEGORIES}
      favorites={useFavorites()}
      onToggleFavorite={toggleFavorite}
      onOpen={(t) => navigate(`/tests/${t.id}`)}
      labels={{ all: 'Все тесты', filters: 'Фильтр тестов', emptyRecent: 'Вы ещё не присылали тесты' }}
    />
  );
}
