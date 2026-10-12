import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Badge } from '../../components/Badge/Badge';
import { Chip } from '../../components/Chip/Chip';
import { IconFilterAll, IconPlusChip } from '../../components/icons';
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
import {
  catalogOf,
  countFilters,
  hasMarks,
  listIds,
  markedScope,
  quickPicks,
  relaxations,
  type Catalog,
  type Listing,
  type Marks,
  type Relaxation,
  type ScopeContext,
  type ViewQuery,
} from '../../data/libraryQuery';
import { clearFilters, clearHistory, forgetQuery, readLibraryView, rememberQuery, setFilters, setQuery, setSort, toggleMark, toggleOption, useLibraryView, type ViewState } from '../../data/libraryView';
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

type Section = string; // 'all' | id категории

/** Что написано там, где нет ничего и нет ни запроса, ни фильтров: зависит от включённых «Избранное» и «Недавние» и от того, весь ли это каталог */
function emptyText(marks: Marks, wholeCatalog: boolean, recent: string): string {
  if (marks.favorites && marks.recent) return wholeCatalog ? 'Среди недавних нет избранного.' : 'В этом разделе среди недавних нет избранного.';
  if (marks.favorites) return wholeCatalog ? 'В избранном пока ничего нет.' : 'В этом разделе нет избранного.';
  if (marks.recent) return wholeCatalog ? `${recent}.` : 'В этом разделе нет недавних.';
  return 'Здесь пока ничего нет.';
}

/** Где искали, когда включены «Избранное» и «Недавние»: «Среди избранного по запросу «…» ничего нет» */
const whereText = (m: Marks) => (m.favorites && m.recent ? 'Среди недавних избранных' : m.favorites ? 'Среди избранного' : m.recent ? 'Среди недавних' : '');

/** Порция карточек: длинный каталог показывается по мере прокрутки, а не весь сразу */
const STEP = 30;

interface ListProps {
  catalog: Catalog;
  /** Раздел страницы без отметок, весь каталог, включённые отметки: по ним считается «из скольких» и подсказки для пустой выдачи */
  ctx: ScopeContext;
  listing: Listing;
  query: ViewQuery;
  /** Исходный запрос, как его набрал человек */
  typed: string;
  narrowed: boolean;
  active: boolean;
  noun: Noun;
  everywhere: string;
  empty: string;
  view: ViewState;
  tokens: FilterToken[];
  resetKey: string;
  onToggleFavorite: (id: string) => void;
  onOpen: (item: LibraryItem) => void;
  onSort: () => void;
  onToggleMark: (mark: keyof Marks) => void;
  onRelax: (r: Relaxation) => void;
  onResetFilters: () => void;
}

/** Страница пейджера: строка над карточками, карточки или пустая выдача; у каждой страницы своя прокрутка */
function LibraryList(p: ListProps) {
  const { catalog, listing, ctx, narrowed, view } = p;
  const scroller = useRef<HTMLDivElement>(null);
  const more = useRef<HTMLDivElement>(null);
  const [limit, setLimit] = useState(STEP);
  const total = listing.ids.length;
  const shown = Math.min(limit, total);

  // Запрос, фильтры, отметки или порядок изменились: список снова с начала
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
  const summary = narrowed ? `Найдено ${total} из ${ctx.scope.length}` : describe(ctx.scope.length);
  const marked = hasMarks(ctx.marks);

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
              favorite={ctx.favorites.has(id)}
              onToggleFavorite={p.onToggleFavorite}
              onClick={p.onOpen}
              facts={entry.d.line.join(' · ') || undefined}
              why={why}
              marks={search?.words}
            />
          );
        })}
      </ul>
    );
  } else if (ctx.scope.length === 0 && !marked) {
    body = <p className="library-page__empty">{p.empty}</p>;
  } else {
    const label = (r: Relaxation) =>
      r.type === 'option'
        ? `Без фильтра «${r.label}»`
        : r.type === 'filters'
          ? 'Сбросить все фильтры'
          : r.type === 'mark'
            ? r.mark === 'favorites'
              ? 'Показать не только избранное'
              : 'Показать не только недавние'
            : r.type === 'scope'
              ? p.everywhere
              : 'Очистить запрос';
    const actions: EmptyAction[] = relaxations(catalog, p.query, ctx).map((r) => ({
      key: r.type === 'option' ? `${r.facet}:${r.option}` : r.type === 'mark' ? `mark:${r.mark}` : r.type,
      label: label(r),
      count: r.count,
      onClick: () => p.onRelax(r),
    }));
    const typed = p.typed.trim();
    const words = normalize(typed) !== '';
    const filtered = countFilters(p.query.filters) > 0;
    const where = whereText(ctx.marks);
    const text =
      words && filtered
        ? `${where ? `${where} по` : 'По'} запросу «${typed}» и выбранным фильтрам ничего нет.`
        : words
          ? where
            ? `${where} по запросу «${typed}» ничего нет.`
            : `По запросу «${typed}» ничего нет. Проверьте написание или попробуйте другое слово.`
          : filtered
            ? `${where ? `${where} нет` : 'Нет'} материалов, которые подходят под все выбранные фильтры.`
            : p.empty;
    body = <EmptyResults title={words || filtered ? 'Ничего не нашлось' : 'Здесь пусто'} text={text} actions={actions} describe={describe} />;
  }

  return (
    <div ref={scroller} className="library-page__page">
      {(ctx.scope.length > 0 || marked) && (
        <ResultsBar
          summary={summary}
          live={p.active}
          sortLabel={sortLabel(view.sort, !!search)}
          sortChanged={view.sort !== 'auto'}
          sortDisabled={total < 2}
          onSort={p.onSort}
          marks={ctx.marks}
          onToggleMark={p.onToggleMark}
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
 * Разделы (все и свои категории) — страницы пейджера: список можно листать пальцем, а чипсы идут следом.
 * Поверх любого раздела работают поиск по словам, фильтры (лист «Фильтры») и порядок; в строке над списком
 * кнопки «Избранное» и «Недавние» оставляют только их. Состояние лежит в libraryView.ts,
 * поэтому после открытия теста запрос, фильтры и кнопки на месте.
 */
export function LibraryPage({ kind, title, searchPlaceholder, items, categories, favorites, onToggleFavorite, onOpen, labels }: LibraryPageProps) {
  const [section, setSection] = useState<Section>('all');
  // Пока страницы ведёт палец, чипс подсвечивает ту, что ближе к положению; отпустили — выбранный раздел
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [sheet, setSheet] = useState<null | 'filters' | 'sort'>(null);
  const [focused, setFocused] = useState(false);
  const client = useClientData();
  const view = useLibraryView(kind);
  const root = useRef<HTMLElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const catalog = useMemo(() => catalogOf(kind, items), [kind, items]);
  const picks = useMemo<QuickPick[]>(() => quickPicks(catalog), [catalog]);

  /** Разделы по порядку чипсов: по ним же идут страницы */
  const sections = useMemo<Section[]>(() => ['all', ...categories.map((c) => c.id)], [categories]);
  const everything = useMemo(() => items.map((t) => t.id), [items]);
  /** Недавние от самых свежих */
  const recent = useMemo(() => recentIds(client, kind).filter((id) => catalog.byId.has(id)), [client, kind, catalog]);

  /** Материалы каждого раздела: идентификаторы в порядке раздела */
  const bases = useMemo(() => sections.map((id) => (id === 'all' ? everything : items.filter((t) => t.categories.includes(id)).map((t) => t.id))), [sections, everything, items]);
  /** Они же с учётом кнопок «Избранное» и «Недавние» */
  const scopes = useMemo(() => bases.map((base) => markedScope(base, view.marks, favorites, recent)), [bases, view.marks, favorites, recent]);

  // Пока человек печатает, список догоняет с небольшим запозданием, а поле остаётся отзывчивым
  const query = useDeferredValue(view.query);
  const q = useMemo<ViewQuery>(() => ({ query, filters: view.filters, sort: view.sort }), [query, view.filters, view.sort]);
  const listings = useMemo(() => scopes.map((scope) => listIds(catalog, q, scope, favorites)), [catalog, q, scopes, favorites]);
  const narrowed = normalize(query) !== '' || countFilters(view.filters) > 0 || hasMarks(view.marks);
  const activeCount = countFilters(view.filters);
  const resetKey = `${query}|${JSON.stringify(view.filters)}|${view.sort}|${view.marks.favorites}|${view.marks.recent}`;

  const index = Math.max(0, sections.indexOf(section));
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
      // Запрос читается в момент нажатия: обработчики карточек не пересоздаются при каждой букве
      rememberQuery(kind, readLibraryView(kind).query);
      onOpen?.(item);
    },
    [kind, onOpen],
  );

  const relax = useCallback(
    (r: Relaxation) => {
      if (r.type === 'option') toggleOption(kind, r.facet, r.option);
      else if (r.type === 'filters') clearFilters(kind);
      else if (r.type === 'mark') toggleMark(kind, r.mark);
      else if (r.type === 'scope') setSection('all');
      else setQuery(kind, '');
    },
    [kind],
  );

  const onToggleMark = useCallback((mark: keyof Marks) => toggleMark(kind, mark), [kind]);

  const pages = useMemo(
    () =>
      sections.map((id, i) => ({
        key: id,
        node: (
          <LibraryList
            catalog={catalog}
            ctx={{ scope: bases[i], everything, marks: view.marks, favorites, recent }}
            listing={listings[i]}
            query={q}
            typed={query}
            narrowed={narrowed}
            active={i === index}
            noun={labels.noun}
            everywhere={labels.everywhere}
            empty={emptyText(view.marks, id === 'all', labels.emptyRecent)}
            view={view}
            tokens={tokens}
            resetKey={resetKey}
            onToggleFavorite={onToggleFavorite}
            onOpen={open}
            onSort={() => setSheet('sort')}
            onToggleMark={onToggleMark}
            onRelax={relax}
            onResetFilters={() => clearFilters(kind)}
          />
        ),
      })),
    [sections, catalog, bases, everything, listings, q, query, narrowed, index, labels, favorites, recent, view, tokens, resetKey, onToggleFavorite, open, onToggleMark, relax, kind],
  );

  const onDrag = useCallback(
    (position: number | null) => {
      setDragIndex(position === null ? null : Math.round(Math.min(sections.length - 1, Math.max(0, position))));
    },
    [sections.length],
  );

  // Цвет чипсов идёт за положением страниц (чипс «+» не раздел: он вне страниц)
  const onPosition = useCallback((position: number) => {
    const chips = root.current?.querySelectorAll<HTMLElement>('.screen-header__chips .chip:not(.chip--plus)');
    if (chips) followChips(chips, position);
    const row = root.current?.querySelector<HTMLElement>('.screen-header__chips');
    if (row) centerChips(row, position, '.chip:not(.chip--plus)');
  }, []);

  // Чипс раздела: пока что-то ищут, пустые разделы бледнеют, а число находок слышно в подписи
  const chip = (id: Section, label: string, icon = false) => {
    const i = sections.indexOf(id);
    const count = listings[i]?.ids.length ?? 0;
    return {
      follow: true,
      active: shown === i,
      onClick: () => setSection(id),
      ariaLabel: narrowed ? `${label}: найдено ${count}` : icon ? label : undefined,
    };
  };
  const chipClass = (id: Section, extra?: string) => [extra, narrowed && (listings[sections.indexOf(id)]?.ids.length ?? 0) === 0 && 'chip--dim'].filter(Boolean).join(' ') || undefined;

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

  return (
    <section ref={root} className="library-page">
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
            {categories.map(({ id, label }) => (
              <Chip key={id} className={chipClass(id)} {...chip(id, label)}>
                {label}
              </Chip>
            ))}
          </>
        }
      />

      <div className="library-page__body">
        <SwipePager index={index} pages={pages} onIndexChange={(i) => setSection(sections[i])} onPosition={onPosition} onDrag={onDrag} />
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
    </section>
  );
}
