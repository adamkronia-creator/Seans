import { LIBRARY, setFavorites, setPinned, useFavorites, usePinned } from '../../data/library';
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
      pinned={usePinned()}
      onSetFavorites={setFavorites}
      onSetPinned={setPinned}
      onOpen={(t, origin) => navigate(`/tests/${t.id}`, 'forward', undefined, origin)}
      labels={{ all: 'Все тесты', filters: 'Фильтр тестов', emptyRecent: 'Вы ещё не присылали тесты', noun: ['тест', 'теста', 'тестов'], everywhere: 'Искать во всех тестах' }}
    />
  );
}
