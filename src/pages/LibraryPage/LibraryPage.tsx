import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Badge } from '../../components/Badge/Badge';
import { Chip } from '../../components/Chip/Chip';
import { IconFilterAll, IconFilterFavorites, IconFilterRecent, IconPlusChip } from '../../components/icons';
import { CompareBar } from '../../components/LibraryFilters/CompareBar';
import { CompareSheet } from '../../components/LibraryFilters/CompareSheet';
import { EmptyResults, type EmptyAction } from '../../components/LibraryFilters/EmptyResults';
import { IconSliders } from '../../components/LibraryFilters/FilterIcons';
import { FilterSheet } from '../../components/LibraryFilters/FilterSheet';
import { ResultsBar, type FilterToken } from '../../components/LibraryFilters/ResultsBar';
import { SortSheet, sortLabel } from '../../components/LibraryFilters/SortSheet';
import { SuggestPanel, type QuickPick } from '../../components/LibraryFilters/SuggestPanel';
import { LibraryCard } from '../../components/LibraryCard/LibraryCard';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { SwipePager } from '../../components/SwipePager/SwipePager';
import { recentIds, useClientData } from '../../data/clientStore';
import type { LibraryItem } from '../../data/library';
import type { Kind } from '../../data/libraryMeta';
import { catalogOf, countFilters, listIds, quickPicks, relaxations, type Catalog, type Listing, type Relaxation, type ViewQuery } from '../../data/libraryQuery';
import {
  clearFilters,
  clearHistory,
  COMPARE_LIMIT,
  forgetQuery,
  readLibraryView,
  rememberQuery,
  setFilters,
  setQuery,
  setSort,
  startCompare,
  stopCompare,
  toggleOption,
  togglePicked,
  useLibraryView,
  type ViewState,
} from '../../data/libraryView';
import { plural } from '../../data/taskValues';
import { centerChips } from '../../utils/centerChips';
import { followChips } from '../../utils/followChips';
import { normalize } from '../../utils/ruText';
import './LibraryPage.css';

type Noun = [string, string, string];

interface LibraryPageProps {
  /** Что показываем: тесты или задания (от этого зависят «недавние», фильтры и тексты) */
  kind: Kind;
  title: string;
  searchPlaceholder: string;
  items: LibraryItem[];
  categories: { id: string; label: string }[];
  favorites: ReadonlySet<string>;
  onToggleFavorite: (id: string) => void;
  /** Нажатие на карточку (открыть настройку) */
  onOpen?: (item: LibraryItem) => void;
  /** Подписи для экранных читалок и пустых состояний; noun — «тест», «теста», «тестов» */
  labels: { all: string; filters: string; emptyRecent: string; noun: Noun; everywhere: string };
}

type Filter = string; // 'all' | 'favorites' | 'recent' | id категории

/** Что показывает страница фильтра, когда в ней вообще ничего нет */
const emptyText = (filter: Filter, recent: string) => (filter === 'favorites' ? 'В избранном пока ничего нет' : filter === 'recent' ? recent : 'Здесь пока ничего нет');

/** Порция карточек: длинный каталог показывается по мере прокрутки, а не весь сразу */
const STEP = 30;

interface ListProps {
  catalog: Catalog;
  scope: string[];
  everything: string[];
  listing: Listing;
  query: ViewQuery;
  /** Исходный запрос, как его набрал человек */
  typed: string;
  narrowed: boolean;
  active: boolean;
  noun: Noun;
  everywhere: string;
  empty: string;
  favorites: ReadonlySet<string>;
  view: ViewState;
  tokens: FilterToken[];
  resetKey: string;
  onToggleFavorite: (id: string) => void;
  onOpen: (item: LibraryItem) => void;
  onSort: () => void;
  onCompare?: () => void;
  onRelax: (r: Relaxation) => void;
  onResetFilters: () => void;
}

/** Страница пейджера: строка над карточками, карточки или пустая выдача; у каждой страницы своя прокрутка */
function LibraryList(p: ListProps) {
  const { catalog, listing, scope, narrowed, view } = p;
  const scroller = useRef<HTMLDivElement>(null);
  const more = useRef<HTMLDivElement>(null);
  const [limit, setLimit] = useState(STEP);
  const total = listing.ids.length;
  const shown = Math.min(limit, total);

  // Запрос, фильтры или порядок изменились: список снова с начала
  useEffect(() => {
    setLimit(STEP);
    if (scroller.current) scroller.current.scrollTop = 0;
  }, [p.resetKey]);

  // Дошли до конца показанного — добавляем ещё порцию
  useEffect(() => {
    const el = more.current;
    if (!el || shown >= total) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && setLimit((l) => l + STEP), { root: scroller.current, rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [shown, total]);

  const search = listing.search;
  const notes: string[] = [];
  if (search?.fixes.length) notes.push(search.fixes.map((f) => `Показано для «${f.to}» вместо «${f.from}»`).join('; '));
  if (search?.partial && total > 0) notes.push('Совпали не все слова запроса: показано, что подходит хотя бы по части');

  const describe = (n: number) => `${n} ${plural(n, p.noun)}`;
  const summary = narrowed ? `Найдено ${total} из ${scope.length}` : describe(scope.length);

  let body;
  if (total > 0) {
    body = (
      <ul className="library-page__list">
        {listing.ids.slice(0, shown).map((id) => {
          const entry = catalog.byId.get(id);
          if (!entry) return null;
          const hit = search?.hits.get(id);
          const why = hit ? (hit.via ? `Близко по смыслу: ${hit.via}` : hit.visible ? undefined : `${hit.fieldLabel}: ${hit.text}`) : undefined;
          return (
            <LibraryCard
              key={id}
              test={entry.item}
              favorite={p.favorites.has(id)}
              onToggleFavorite={p.onToggleFavorite}
              onClick={p.onOpen}
              facts={entry.d.line.join(' · ')}
              why={why}
              marks={search?.words}
              pick={view.compare ? { selected: view.picked.includes(id), disabled: view.picked.length >= COMPARE_LIMIT } : undefined}
            />
          );
        })}
      </ul>
    );
  } else if (scope.length === 0 && !narrowed) {
    body = <p className="library-page__empty">{p.empty}</p>;
  } else {
    const label = (r: Relaxation) =>
      r.type === 'option' ? `Без фильтра «${r.label}»` : r.type === 'filters' ? 'Сбросить все фильтры' : r.type === 'scope' ? p.everywhere : 'Очистить запрос';
    const actions: EmptyAction[] = relaxations(catalog, p.query, scope, p.everything, p.favorites).map((r) => ({
      key: r.type === 'option' ? `${r.facet}:${r.option}` : r.type,
      label: label(r),
      count: r.count,
      onClick: () => p.onRelax(r),
    }));
    const typed = p.typed.trim();
    const words = normalize(typed) !== '';
    const filtered = countFilters(p.query.filters) > 0;
    const text =
      words && filtered
        ? `По запросу «${typed}» и выбранным фильтрам ничего нет.`
        : words
          ? `По запросу «${typed}» ничего нет. Проверьте написание или попробуйте другое слово.`
          : filtered
            ? 'Нет материалов, которые подходят под все выбранные фильтры.'
            : 'Здесь пока ничего нет.';
    body = <EmptyResults title="Ничего не нашлось" text={text} actions={actions} describe={describe} />;
  }

  return (
    <div ref={scroller} className="library-page__page">
      {scope.length > 0 && (
        <ResultsBar
          summary={summary}
          live={p.active}
          sortLabel={sortLabel(view.sort, !!search)}
          onSort={total > 1 ? p.onSort : undefined}
          onCompare={p.onCompare && (total > 1 || view.compare) ? p.onCompare : undefined}
          comparing={view.compare}
          tokens={p.tokens}
          onResetFilters={p.onResetFilters}
          notes={notes}
        />
      )}
      {body}
      {shown < total && <div ref={more} className="library-page__more" aria-hidden="true" />}
    </div>
  );
}

/**
 * Библиотека для психолога: все тесты (или задания) приложения. Интерфейс общий,
 * потому что разделы «Диагностика» и «Задания» устроены одинаково.
 *
 * Разделы (все, избранное, недавние, категории) — страницы пейджера: список можно листать пальцем, а чипсы идут следом.
 * Поверх любого раздела работают поиск по словам, фильтры (лист «Фильтры»), порядок и сравнение выбранных материалов;
 * состояние лежит в libraryView.ts, поэтому после открытия теста запрос и фильтры на месте.
 */
export function LibraryPage({ kind, title, searchPlaceholder, items, categories, favorites, onToggleFavorite, onOpen, labels }: LibraryPageProps) {
  const [filter, setFilter] = useState<Filter>('all');
  // Пока страницы ведёт палец, чипс подсвечивает ту, что ближе к положению; отпустили — выбранный фильтр
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [sheet, setSheet] = useState<null | 'filters' | 'sort' | 'compare'>(null);
  const [focused, setFocused] = useState(false);
  const client = useClientData();
  const view = useLibraryView(kind);
  const root = useRef<HTMLElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const catalog = useMemo(() => catalogOf(kind, items), [kind, items]);
  const picks = useMemo<QuickPick[]>(() => quickPicks(catalog), [catalog]);

  /** Фильтры по порядку чипсов: по ним же идут страницы */
  const filters = useMemo<Filter[]>(() => ['all', 'favorites', 'recent', ...categories.map((c) => c.id)], [categories]);
  const everything = useMemo(() => items.map((t) => t.id), [items]);

  /** Материалы каждого раздела: идентификаторы в порядке раздела */
  const scopes = useMemo(
    () =>
      filters.map((id) => {
        if (id === 'all') return everything;
        if (id === 'favorites') return everything.filter((x) => favorites.has(x));
        // Недавние идут в порядке свежести, а не в порядке библиотеки
        if (id === 'recent') return recentIds(client, kind).filter((rid) => catalog.byId.has(rid));
        return items.filter((t) => t.categories.includes(id)).map((t) => t.id);
      }),
    [filters, everything, items, favorites, client, kind, catalog],
  );

  // Пока человек печатает, список догоняет с небольшим запозданием, а поле остаётся отзывчивым
  const query = useDeferredValue(view.query);
  const q = useMemo<ViewQuery>(() => ({ query, filters: view.filters, sort: view.sort }), [query, view.filters, view.sort]);
  const listings = useMemo(() => scopes.map((scope) => listIds(catalog, q, scope, favorites)), [catalog, q, scopes, favorites]);
  const narrowed = normalize(query) !== '' || countFilters(view.filters) > 0;
  const activeCount = countFilters(view.filters);
  const resetKey = `${query}|${JSON.stringify(view.filters)}|${view.sort}`;

  const index = Math.max(0, filters.indexOf(filter));
  const shown = dragIndex ?? index;

  const tokens = useMemo<FilterToken[]>(
    () =>
      catalog.facets.flatMap((facet) =>
        (view.filters[facet.id] ?? []).map((option) => ({
          key: `${facet.id}:${option}`,
          label: facet.options.find((o) => o.id === option)?.label ?? option,
          group: facet.label,
          onRemove: () => toggleOption(kind, facet.id, option),
        })),
      ),
    [catalog, view.filters, kind],
  );

  const open = useCallback(
    (item: LibraryItem) => {
      // Состояние читается в момент нажатия: обработчики карточек не пересоздаются при каждом выборе
      const state = readLibraryView(kind);
      if (state.compare) return togglePicked(kind, item.id);
      rememberQuery(kind, state.query);
      onOpen?.(item);
    },
    [kind, onOpen],
  );

  const relax = useCallback(
    (r: Relaxation) => {
      if (r.type === 'option') toggleOption(kind, r.facet, r.option);
      else if (r.type === 'filters') clearFilters(kind);
      else if (r.type === 'scope') setFilter('all');
      else setQuery(kind, '');
    },
    [kind],
  );

  const toggleCompare = useCallback(() => (readLibraryView(kind).compare ? stopCompare(kind) : startCompare(kind)), [kind]);

  // Ушли с экрана посреди выбора — вернувшись, человек видит обычный список, а не недобранную пару для сравнения
  useEffect(() => () => stopCompare(kind), [kind]);

  const pages = useMemo(
    () =>
      filters.map((id, i) => ({
        key: id,
        node: (
          <LibraryList
            catalog={catalog}
            scope={scopes[i]}
            everything={everything}
            listing={listings[i]}
            query={q}
            typed={query}
            narrowed={narrowed}
            active={i === index}
            noun={labels.noun}
            everywhere={labels.everywhere}
            empty={emptyText(id, labels.emptyRecent)}
            favorites={favorites}
            view={view}
            tokens={tokens}
            resetKey={resetKey}
            onToggleFavorite={onToggleFavorite}
            onOpen={open}
            onSort={() => setSheet('sort')}
            onCompare={scopes[i].length >= 2 ? toggleCompare : undefined}
            onRelax={relax}
            onResetFilters={() => clearFilters(kind)}
          />
        ),
      })),
    [filters, catalog, scopes, everything, listings, q, query, narrowed, index, labels, favorites, view, tokens, resetKey, onToggleFavorite, open, relax, toggleCompare, kind],
  );

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

  // Чипс раздела: пока что-то ищут, пустые разделы бледнеют, а число находок слышно в подписи
  const chip = (id: Filter, label: string, icon = false) => {
    const i = filters.indexOf(id);
    const count = listings[i]?.ids.length ?? 0;
    return {
      follow: true,
      active: shown === i,
      onClick: () => setFilter(id),
      ariaLabel: narrowed ? `${label}: найдено ${count}` : icon ? label : undefined,
    };
  };
  const chipClass = (id: Filter, extra?: string) => [extra, narrowed && (listings[filters.indexOf(id)]?.ids.length ?? 0) === 0 && 'chip--dim'].filter(Boolean).join(' ') || undefined;

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      rememberQuery(kind, view.query);
      input.current?.blur();
    } else if (e.key === 'Escape') {
      if (view.query) setQuery(kind, '');
      else input.current?.blur();
    }
  };

  const showSuggest = focused && view.query === '' && (view.history.length > 0 || picks.length > 0);
  const applyPick = (pick: QuickPick) => {
    if (!(view.filters[pick.facet] ?? []).includes(pick.option)) toggleOption(kind, pick.facet, pick.option);
    input.current?.blur();
  };

  const pickedEntries = view.picked.flatMap((id) => catalog.byId.get(id) ?? []);

  return (
    <section ref={root} className={`library-page${view.compare ? ' library-page--compare' : ''}`}>
      <ScreenHeader
        title={title}
        searchValue={view.query}
        onSearchChange={(value) => setQuery(kind, value)}
        searchPlaceholder={searchPlaceholder}
        onSearchClear={() => setQuery(kind, '')}
        searchInputRef={input}
        onSearchFocus={() => setFocused(true)}
        onSearchBlur={() => setFocused(false)}
        onSearchKeyDown={onKeyDown}
        searchAside={
          <button
            type="button"
            className={`screen-header__action library-page__tile${activeCount ? ' library-page__tile--on' : ''}`}
            aria-label={activeCount ? `Фильтры: выбрано ${activeCount}` : 'Фильтры'}
            aria-haspopup="dialog"
            onClick={() => setSheet('filters')}
          >
            <IconSliders />
            {activeCount > 0 && (
              <span className="library-page__tile-badge">
                <Badge count={activeCount} />
              </span>
            )}
          </button>
        }
        chipsLabel={labels.filters}
        chips={
          <>
            <Chip iconOnly className="chip--plus" ariaLabel="Добавить категорию">
              <IconPlusChip />
            </Chip>
            <Chip iconOnly toggle className={chipClass('all', 'chip--glyph-lg')} {...chip('all', labels.all, true)}>
              <IconFilterAll />
            </Chip>
            <Chip iconOnly toggle className={chipClass('favorites', 'chip--glyph-lg')} {...chip('favorites', 'Избранное', true)}>
              <IconFilterFavorites />
            </Chip>
            <Chip iconOnly toggle className={chipClass('recent', 'chip--glyph-lg')} {...chip('recent', 'Недавние', true)}>
              <IconFilterRecent />
            </Chip>
            {categories.map(({ id, label }) => (
              <Chip key={id} className={chipClass(id)} {...chip(id, label)}>
                {label}
              </Chip>
            ))}
          </>
        }
      />

      <div className="library-page__body">
        <SwipePager index={index} pages={pages} onIndexChange={(i) => setFilter(filters[i])} onPosition={onPosition} onDrag={onDrag} />
        {showSuggest && (
          <SuggestPanel
            history={view.history}
            picks={picks}
            onHistory={(h) => {
              setQuery(kind, h);
              rememberQuery(kind, h);
              input.current?.blur();
            }}
            onForget={(h) => forgetQuery(kind, h)}
            onClearHistory={() => clearHistory(kind)}
            onPick={applyPick}
          />
        )}
        {view.compare && (
          <CompareBar picked={pickedEntries.map((e) => e.item)} onCompare={() => setSheet('compare')} onCancel={() => stopCompare(kind)} />
        )}
      </div>

      {sheet === 'filters' && (
        <FilterSheet
          catalog={catalog}
          view={{ query: view.query, filters: view.filters, sort: view.sort }}
          scope={scopes[index]}
          favorites={favorites}
          noun={labels.noun}
          onApply={(next) => setFilters(kind, next)}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'sort' && (
        <SortSheet
          value={view.sort}
          searching={normalize(view.query) !== ''}
          onPick={(sort) => {
            setSort(kind, sort);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'compare' && pickedEntries.length >= 2 && (
        <CompareSheet
          kind={kind}
          entries={pickedEntries}
          onOpen={(item) => {
            setSheet(null);
            stopCompare(kind);
            onOpen?.(item);
          }}
          onRemove={(id) => {
            togglePicked(kind, id);
            if (pickedEntries.length <= 2) setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </section>
  );
}
