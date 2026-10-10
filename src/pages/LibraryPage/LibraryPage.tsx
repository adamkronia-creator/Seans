import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Chip } from '../../components/Chip/Chip';
import {
  IconFilterAll,
  IconFilterFavorites,
  IconFilterRecent,
  IconFilterSettings,
  IconPlusChip,
} from '../../components/icons';
import { LibraryCard } from '../../components/LibraryCard/LibraryCard';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { SwipePager } from '../../components/SwipePager/SwipePager';
import { recentIds, useClientData } from '../../data/clientStore';
import type { LibraryItem } from '../../data/library';
import { followChips } from '../../utils/followChips';
import { centerChips } from '../../utils/centerChips';
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

/** Что показывает страница фильтра, когда список пуст: название и что делать дальше */
function emptyOf(filter: Filter, searching: boolean, recent: string, kind: 'test' | 'task') {
  if (searching) {
    return {
      title: 'Ничего не найдено',
      text: kind === 'test' ? 'Проверьте написание. Тест можно искать и по краткому названию, например «СМОЛ» или «BDI».' : 'Проверьте написание или очистите поиск.',
    };
  }
  if (filter === 'favorites') return { title: 'Избранное пусто', text: 'Нажмите на сердечко у карточки, чтобы закрепить ее здесь.' };
  if (filter === 'recent') {
    return {
      title: recent,
      text: kind === 'test' ? 'Тесты, которые вы отправляли клиентам, соберутся здесь, чтобы их было легко найти снова.' : 'Задания, которые вы назначали клиентам, соберутся здесь, чтобы их было легко найти снова.',
    };
  }
  return { title: 'В этой категории пока пусто', text: 'Добавленные сюда элементы появятся в списке.' };
}

/** Карточки одного фильтра: страница пейджера, у каждой своя прокрутка */
const LibraryList = memo(function LibraryList({
  items,
  empty,
  favorites,
  onToggleFavorite,
  onOpen,
}: {
  items: LibraryItem[];
  empty: { title: string; text: string };
  favorites: ReadonlySet<string>;
  onToggleFavorite: (id: string) => void;
  onOpen?: (item: LibraryItem) => void;
}) {
  return items.length > 0 ? (
    <ul className="library-page__list">
      {items.map((item) => (
        <LibraryCard key={item.id} test={item} favorite={favorites.has(item.id)} onToggleFavorite={onToggleFavorite} onClick={onOpen} />
      ))}
    </ul>
  ) : (
    <EmptyState title={empty.title} text={empty.text} />
  );
});

/**
 * Библиотека для психолога: все тесты (или задания) приложения. Интерфейс общий,
 * потому что разделы «Диагностика» и «Задания» устроены одинаково.
 * Фильтры — страницы пейджера: список можно листать пальцем, а чипсы идут следом.
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
  // Пока страницы ведёт палец, чипс подсвечивает ту, что ближе к положению; отпустили — выбранный фильтр
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const client = useClientData();
  const root = useRef<HTMLElement>(null);

  /** Фильтры по порядку чипсов: по ним же идут страницы */
  const filters = useMemo<Filter[]>(() => ['all', 'favorites', 'recent', ...categories.map((c) => c.id)], [categories]);

  const lists = useMemo(() => {
    const q = query.trim().toLowerCase();
    return filters.map((id) => {
      let list = items;
      if (id === 'favorites') list = list.filter((t) => favorites.has(t.id));
      else if (id === 'recent') {
        // Недавние идут в порядке свежести, а не в порядке библиотеки
        list = recentIds(client, kind).flatMap((rid) => items.filter((t) => t.id === rid));
      } else if (id !== 'all') list = list.filter((t) => t.categories.includes(id));
      if (!q) return list;
      return list.filter(
        (t) => t.title.toLowerCase().includes(q) || (t.abbr?.toLowerCase().includes(q) ?? false) || t.description.toLowerCase().includes(q),
      );
    });
  }, [items, query, filters, favorites, client, kind]);

  const pages = useMemo(
    () =>
      filters.map((id, i) => ({
        key: id,
        node: <LibraryList items={lists[i]} empty={emptyOf(id, query.trim() !== '', labels.emptyRecent, kind)} favorites={favorites} onToggleFavorite={onToggleFavorite} onOpen={onOpen} />,
      })),
    [filters, lists, query, kind, labels.emptyRecent, favorites, onToggleFavorite, onOpen],
  );

  const index = Math.max(0, filters.indexOf(filter));
  const shown = dragIndex ?? index;

  const onDrag = useCallback(
    (position: number | null) => {
      setDragIndex(position === null ? null : Math.round(Math.min(filters.length - 1, Math.max(0, position))));
    },
    [filters.length],
  );

  // Цвет чипсов идёт за положением страниц (чипс «+» не фильтр: он вне страниц)
  const onPosition = useCallback((position: number) => {
    const chips = root.current?.querySelectorAll<HTMLElement>('.screen-header__chips .chip:not(.chip--plus)');
    if (chips) followChips(chips, position);
    const row = root.current?.querySelector<HTMLElement>('.screen-header__chips');
    if (row) centerChips(row, position, '.chip:not(.chip--plus)');
  }, []);

  const chip = (id: Filter) => ({ follow: true, active: shown === filters.indexOf(id), onClick: () => setFilter(id) });

  return (
    <section ref={root} className="library-page">
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
            <Chip iconOnly toggle className="chip--glyph-lg" ariaLabel={labels.all} {...chip('all')}>
              <IconFilterAll />
            </Chip>
            <Chip iconOnly toggle className="chip--glyph-lg" ariaLabel="Избранное" {...chip('favorites')}>
              <IconFilterFavorites />
            </Chip>
            <Chip iconOnly toggle className="chip--glyph-lg" ariaLabel="Недавние" {...chip('recent')}>
              <IconFilterRecent />
            </Chip>
            {categories.map(({ id, label }) => (
              <Chip key={id} {...chip(id)}>
                {label}
              </Chip>
            ))}
          </>
        }
      />

      <SwipePager index={index} pages={pages} onIndexChange={(i) => setFilter(filters[i])} onPosition={onPosition} onDrag={onDrag} />
    </section>
  );
}
