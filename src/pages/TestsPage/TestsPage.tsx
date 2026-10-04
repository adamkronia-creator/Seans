import { useMemo, useState } from 'react';
import { Chip } from '../../components/Chip/Chip';
import {
  IconFilterAll,
  IconFilterFavorites,
  IconFilterRecent,
  IconFilterSettings,
  IconPlusChip,
} from '../../components/icons';
import { LibraryCard } from '../../components/LibraryCard/LibraryCard';
import { SearchField } from '../../components/SearchField/SearchField';
import { recentTestIds, useClientData } from '../../data/clientStore';
import {
  LIBRARY,
  TEST_CATEGORIES,
  toggleFavorite,
  useFavorites,
  type TestCategory,
} from '../../data/library';
import './TestsPage.css';

type Filter = 'all' | 'favorites' | 'recent' | TestCategory;

const EMPTY_TEXT: Record<string, string> = {
  favorites: 'В избранном пока ничего нет',
  recent: 'Вы ещё не присылали тесты',
};

export function TestsPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const favorites = useFavorites();
  const client = useClientData();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = LIBRARY;
    if (filter === 'favorites') list = list.filter((t) => favorites.has(t.id));
    else if (filter === 'recent') {
      // Недавние идут в порядке свежести, а не в порядке библиотеки
      const ids = recentTestIds(client);
      list = ids.flatMap((id) => LIBRARY.filter((t) => t.id === id));
    } else if (filter !== 'all') list = list.filter((t) => t.categories.includes(filter));
    if (!q) return list;
    return list.filter(
      (t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
    );
  }, [query, filter, favorites, client]);

  return (
    <section className="tests-page">
      <header className="tests-page__header">
        <h1 className="tests-page__title">Тестовые материалы</h1>

        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Поиск тестов..."
          trailing={
            // Число на кнопке в макете «2»; что именно оно считает, пока неизвестно
            <button type="button" className="tests-page__filter" aria-label="Настройки списка тестов">
              <span className="tests-page__filter-count">2</span>
              <IconFilterSettings />
            </button>
          }
        />

        <div className="tests-page__chips" role="group" aria-label="Фильтр тестов">
          <Chip iconOnly className="chip--plus" ariaLabel="Добавить категорию">
            <IconPlusChip />
          </Chip>
          <Chip iconOnly toggle className="chip--glyph-lg" ariaLabel="Все тесты" active={filter === 'all'} onClick={() => setFilter('all')}>
            <IconFilterAll />
          </Chip>
          <Chip iconOnly toggle className="chip--glyph-lg" ariaLabel="Избранное" active={filter === 'favorites'} onClick={() => setFilter('favorites')}>
            <IconFilterFavorites />
          </Chip>
          <Chip iconOnly toggle className="chip--glyph-lg" ariaLabel="Недавние" active={filter === 'recent'} onClick={() => setFilter('recent')}>
            <IconFilterRecent />
          </Chip>
          {TEST_CATEGORIES.map(({ id, label }) => (
            <Chip key={id} active={filter === id} onClick={() => setFilter(id)}>
              {label}
            </Chip>
          ))}
        </div>
      </header>

      {visible.length > 0 ? (
        <ul className="tests-page__list">
          {visible.map((test) => (
            <LibraryCard
              key={test.id}
              test={test}
              favorite={favorites.has(test.id)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </ul>
      ) : (
        <p className="tests-page__empty">{EMPTY_TEXT[filter] ?? 'Ничего не найдено'}</p>
      )}
    </section>
  );
}
