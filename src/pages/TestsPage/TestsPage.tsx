import { LIBRARY, setFavorites, setPinned, toggleFavorite, useFavorites, usePinned } from '../../data/library';
import { navigate } from '../../router';
import { LibraryPage } from '../LibraryPage/LibraryPage';

/** Раздел «Психологические тесты»: библиотека всех тестов приложения */
export function TestsPage() {
  return (
    <LibraryPage
      kind="test"
      chatLike
      title="Диагностика"
      searchPlaceholder="Поиск по тестам"
      items={LIBRARY}
      favorites={useFavorites()}
      onToggleFavorite={toggleFavorite}
      pinned={usePinned()}
      onSetFavorites={setFavorites}
      onSetPinned={setPinned}
      onOpen={(t) => navigate(`/tests/${t.id}`)}
      labels={{ all: 'Все тесты', filters: 'Фильтр тестов', emptyRecent: 'Вы ещё не присылали тесты', noun: ['тест', 'теста', 'тестов'], everywhere: 'Искать во всех тестах' }}
    />
  );
}
