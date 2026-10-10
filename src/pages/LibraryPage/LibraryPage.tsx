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
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { recentIds, useClientData } from '../../data/clientStore';
import type { LibraryItem } from '../../data/library';
import './LibraryPage.css';

interface LibraryPageProps {
  /** Что показываем: тесты или задания (от этого зависят «недавние» и тексты) */
  kind: 'test' | 'task';
  title: string;
  searchPlaceholder: string;
  items: LibraryItem[];
  categories: { id: string; label: string }[];
  favorites: ReadonlySet<string>;
  onToggleFavorite: (id: string) => void;
  /** Нажатие на карточку (открыть настройку) */
  onOpen?: (item: LibraryItem) => void;
  /** Подписи для экранных читалок и пустых состояний */
  labels: { all: string; filters: string; emptyRecent: string };
}

type Filter = string; // 'all' | 'favorites' | 'recent' | id категории

/**
 * Библиотека для психолога: все тесты (или задания) приложения. Интерфейс общий,
 * потому что разделы «Психологические тесты» и «Психологические задания» устроены одинаково.
 */
export function LibraryPage({
  kind,
  title,
  searchPlaceholder,
  items,
  categories,
  favorites,
  onToggleFavorite,
  onOpen,
  labels,
}: LibraryPageProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const client = useClientData();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items;
    if (filter === 'favorites') list = list.filter((t) => favorites.has(t.id));
    else if (filter === 'recent') {
      // Недавние идут в порядке свежести, а не в порядке библиотеки
      list = recentIds(client, kind).flatMap((id) => items.filter((t) => t.id === id));
    } else if (filter !== 'all') list = list.filter((t) => t.categories.includes(filter));
    if (!q) return list;
    return list.filter(
      (t) => t.title.toLowerCase().includes(q) || (t.abbr?.toLowerCase().includes(q) ?? false) || t.description.toLowerCase().includes(q),
    );
  }, [items, query, filter, favorites, client, kind]);

  return (
    <section className="library-page">
      <ScreenHeader
        title={title}
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder={searchPlaceholder}
        searchTrailing={
          <button type="button" className="library-page__filter" aria-label="Настройки списка">
            <IconFilterSettings />
          </button>
        }
        chipsLabel={labels.filters}
        chips={
          <>
            <Chip iconOnly className="chip--plus" ariaLabel="Добавить категорию">
              <IconPlusChip />
            </Chip>
            <Chip iconOnly toggle className="chip--glyph-lg" ariaLabel={labels.all} active={filter === 'all'} onClick={() => setFilter('all')}>
              <IconFilterAll />
            </Chip>
            <Chip iconOnly toggle className="chip--glyph-lg" ariaLabel="Избранное" active={filter === 'favorites'} onClick={() => setFilter('favorites')}>
              <IconFilterFavorites />
            </Chip>
            <Chip iconOnly toggle className="chip--glyph-lg" ariaLabel="Недавние" active={filter === 'recent'} onClick={() => setFilter('recent')}>
              <IconFilterRecent />
            </Chip>
            {categories.map(({ id, label }) => (
              <Chip key={id} active={filter === id} onClick={() => setFilter(id)}>
                {label}
              </Chip>
            ))}
          </>
        }
      />

      {visible.length > 0 ? (
        <ul className="library-page__list">
          {visible.map((item) => (
            <LibraryCard
              key={item.id}
              test={item}
              favorite={favorites.has(item.id)}
              onToggleFavorite={onToggleFavorite}
              onClick={onOpen}
            />
          ))}
        </ul>
      ) : (
        <p className="library-page__empty">
          {filter === 'favorites'
            ? 'В избранном пока ничего нет'
            : filter === 'recent'
              ? labels.emptyRecent
              : 'Ничего не найдено'}
        </p>
      )}
    </section>
  );
}
