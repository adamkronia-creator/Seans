import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Badge } from '../../components/Badge/Badge';
import { Chip } from '../../components/Chip/Chip';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { IconFavorites, IconTabLibrary, IconTabTests } from '../../components/icons';
import { useFolderMenu } from '../../components/FolderMenu/useFolderMenu';
import { EmptyResults, type EmptyAction } from '../../components/LibraryFilters/EmptyResults';
import { IconSliders } from '../../components/LibraryFilters/FilterIcons';
import { FilterSheet } from '../../components/LibraryFilters/FilterSheet';
import { ResultsBar, type FilterToken } from '../../components/LibraryFilters/ResultsBar';
import { SuggestPanel, type QuickPick } from '../../components/LibraryFilters/SuggestPanel';
import { LibraryCard } from '../../components/LibraryCard/LibraryCard';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { Toast } from '../../components/Toast/Toast';
import { useToast } from '../../components/Toast/useToast';
import { SwipePager } from '../../components/SwipePager/SwipePager';
import { recentIds, useClientData } from '../../data/clientStore';
import { useFolderEditing, useFrozenWhile } from '../../data/folderEdit';
import { useFolders } from '../../data/folders';
import type { LibraryItem } from '../../data/library';
import type { Kind } from '../../data/libraryMeta';
import {
  catalogOf,
  countFilters,
  hasMarks,
  listIds,
  markedScope,
  NO_MARKS,
  quickPicks,
  relaxations,
  type Catalog,
  type Listing,
  type Marks,
  type Relaxation,
  type ScopeContext,
  type ViewQuery,
} from '../../data/libraryQuery';
import { clearFilters, clearHistory, forgetQuery, readLibraryView, rememberQuery, setFilters, setQuery, toggleOption, useLibraryView } from '../../data/libraryView';
import { plural } from '../../data/taskValues';
import { centerChips } from '../../utils/centerChips';
import { useListMotion } from '../../utils/listMotion';
import { followChips, placePill, type PositionVia } from '../../utils/followChips';
import { switchTab, useChipsDrag, useTabSwipe } from '../../utils/tabNav';
import { taskSettings } from '../../data/taskSettings';
import { ChatsHeader } from '../MessagesPage/ChatsHeader';
import { useLibrarySelection } from './LibrarySelection';
import '../MessagesPage/MessagesPage.css';
import { RecentRow } from './RecentRow';
import { normalize } from '../../utils/ruText';
import './LibraryPage.css';
import './LibraryPage.pm.css';

type Noun = [string, string, string];

interface LibraryPageProps {
  /** Что показываем: тесты или задания (от этого зависят «недавние», фильтры и тексты) */
  kind: Kind;
  title: string;
  searchPlaceholder: string;
  items: LibraryItem[];
  favorites: ReadonlySet<string>;
  onToggleFavorite: (id: string) => void;
  /** Закреплённые: идут в списке первыми */
  pinned: ReadonlySet<string>;
  /** Добавить в избранное или убрать сразу несколько (выбор в списке) */
  onSetFavorites: (ids: string[], on: boolean) => void;
  /** Закрепить или открепить сразу несколько */
  onSetPinned: (ids: string[], on: boolean) => void;
  /** Нажатие на карточку (открыть настройку) */
  onOpen?: (item: LibraryItem) => void;
  /** Подписи для экранных читалок и пустых состояний; noun — «тест», «теста», «тестов» */
  /** Шапка и чипсы как в «Диалогах», над чипсами недавние тесты (раздел «Диагностика») */
  chatLike?: boolean;
  labels: { all: string; filters: string; emptyRecent: string; noun: Noun; everywhere: string };
}

/** 'all', 'favorites', 'recent' или номер папки */
type Section = string;

const FAVORITES = 'favorites';
const RECENT = 'recent';

/** Порядок выдачи один: по порядку раздела, а при поиске по совпадению (переключателя порядка в интерфейсе нет) */
const SORT: ViewQuery['sort'] = 'auto';

/** «Избранное» и «Недавнее» — отборы поверх всего каталога: те же отметки, что работают в движке поиска, только теперь это страницы ряда */
const ONLY_FAVORITES: Marks = { favorites: true, recent: false };
const ONLY_RECENT: Marks = { favorites: false, recent: true };
const marksOf = (id: Section): Marks => (id === FAVORITES ? ONLY_FAVORITES : id === RECENT ? ONLY_RECENT : NO_MARKS);

/** Раздел охватывает весь каталог: «Все» и отборы «Избранное» и «Недавнее» (у папки только то, что в неё выбрано) */
const wholeCatalog = (id: Section) => id === 'all' || id === FAVORITES || id === RECENT;

/** Что написано там, где нет ничего и нет ни запроса, ни фильтров: зависит от раздела (заголовок и пояснение) */
function emptyText(marks: Marks, whole: boolean, recent: string): { title: string; text: string } {
  if (marks.favorites) return { title: 'В избранном пусто', text: 'Отмечайте сердечком нужные материалы — они появятся здесь.' };
  if (marks.recent) return { title: 'Пока пусто', text: `${recent}.` };
  return whole
    ? { title: 'Пока пусто', text: 'Материалов здесь пока нет.' }
    : { title: 'Папка пуста', text: 'Чтобы добавить, удерживайте название папки и выберите «Настроить папку».' };
}

/** Где искали в «Избранном» и «Недавнем»: «Среди избранного по запросу «…» ничего нет» */
const whereText = (m: Marks) => (m.favorites ? 'Среди избранного' : m.recent ? 'Среди недавних' : '');

/** Порция карточек: длинный каталог показывается по мере прокрутки, а не весь сразу */
const STEP = 30;

interface ListProps {
  catalog: Catalog;
  /** Раздел страницы без отметок, весь каталог, отметка страницы («Избранное» или «Недавнее»): по ним считаются подсказки для пустой выдачи */
  ctx: ScopeContext;
  listing: Listing;
  query: ViewQuery;
  /** Исходный запрос, как его набрал человек */
  typed: string;
  noun: Noun;
  everywhere: string;
  empty: { title: string; text: string };
  tokens: FilterToken[];
  resetKey: string;
  pinned: ReadonlySet<string>;
  selected: readonly string[];
  onHold: (item: LibraryItem) => void;
  onToggleFavorite: (id: string) => void;
  onOpen: (item: LibraryItem) => void;
  onRelax: (r: Relaxation) => void;
  onResetFilters: () => void;
}

/** Страница пейджера: выбранные фильтры и пояснения над карточками, карточки или пустая выдача; у каждой страницы своя прокрутка */
function LibraryList(p: ListProps) {
  const { catalog, listing, ctx } = p;
  const scroller = useRef<HTMLDivElement>(null);
  const more = useRef<HTMLDivElement>(null);
  const rows = useRef<HTMLUListElement>(null);
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

  // Закрепили или убрали из выборки (избранное): карточки переезжают и схлопываются на месте, а не прыгают. Новый запрос, фильтр или порядок
  // заменяют список целиком (resetKey), долистывание добавляет карточки снизу: там ничего двигать не нужно
  useListMotion(rows, { attr: 'data-item', view: p.resetKey, enter: false, leave: true });

  const search = listing.search;
  const notes: string[] = [];
  if (search?.fixes.length) notes.push(search.fixes.map((f) => `Показано для «${f.to}» вместо «${f.from}»`).join('; '));
  if (search?.partial && total > 0) notes.push('Совпали не все слова запроса: показано, что подходит хотя бы по части');

  const describe = (n: number) => `${n} ${plural(n, p.noun)}`;
  const marked = hasMarks(ctx.marks);

  let body;
  if (total > 0) {
    body = (
      <ul ref={rows} className="library-page__list">
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
              pinned={p.pinned.has(id)}
              selected={p.selected.includes(id)}
              onLongPress={p.onHold}
            />
          );
        })}
      </ul>
    );
  } else if (ctx.scope.length === 0 && !marked) {
    body = <EmptyState icon={ctx.marks.favorites ? <IconFavorites /> : ctx.marks.recent ? <IconTabLibrary /> : <IconTabTests />} title={p.empty.title} text={p.empty.text} />;
  } else {
    const label = (r: Relaxation) =>
      r.type === 'option'
        ? `Без фильтра «${r.label}»`
        : r.type === 'filters'
          ? 'Сбросить все фильтры'
          : r.type === 'mark' || r.type === 'scope'
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
            : p.empty.text;
    body = <EmptyResults title={words || filtered ? 'Ничего не нашлось' : 'Здесь пусто'} text={text} actions={actions} describe={describe} />;
  }

  return (
    <div ref={scroller} className="library-page__page">
      {(ctx.scope.length > 0 || marked) && <ResultsBar tokens={p.tokens} onResetFilters={p.onResetFilters} notes={notes} />}
      {body}
      {shown < total && <div ref={more} className="library-page__more" aria-hidden="true" />}
    </div>
  );
}

/**
 * Библиотека для психолога: все тесты (или задания) приложения. Интерфейс общий,
 * потому что разделы «Диагностика» и «Задания» устроены одинаково.
 *
 * Разделы — страницы пейджера: «Все», «Избранное», «Недавнее» (то, что недавно присылали клиентам) и папки. Список можно листать пальцем,
 * а чипсы идут следом: выбранный выходит из капсулы отдельной плашкой (Chip.css, split). Долгое нажатие на «Все» и на папку открывает меню (useFolderMenu).
 * Поверх любого раздела работают поиск по словам и фильтры (лист «Фильтры»); выбранные фильтры и пояснения к выдаче стоят над списком.
 * Состояние лежит в libraryView.ts, поэтому после открытия теста запрос и фильтры на месте.
 */
export function LibraryPage({ kind, title, searchPlaceholder, items, favorites, onToggleFavorite, pinned, onSetFavorites, onSetPinned, onOpen, labels, chatLike }: LibraryPageProps) {
  const [section, setSection] = useState<Section>('all');
  // Пока страницы ведёт палец, чипс подсвечивает ту, что ближе к положению; отпустили — выбранный раздел
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [sheet, setSheet] = useState<null | 'filters'>(null);
  const [focused, setFocused] = useState(false);
  const [toast, say] = useToast();
  const [searching, setSearching] = useState(() => readLibraryView(kind).query !== '');
  const client = useClientData();
  const view = useLibraryView(kind);
  const scope = kind === 'test' ? 'tests' : 'tasks';
  const folders = useFolders(scope);
  // Пока чипсы переставляют, страницы пейджера стоят в прежнем порядке (см. useFrozenWhile); чипсы показывают живой порядок
  const pagerFolders = useFrozenWhile(useFolderEditing(scope), folders);
  const folderMenu = useFolderMenu(scope);
  const root = useRef<HTMLElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const catalog = useMemo(() => catalogOf(kind, items), [kind, items]);
  const picks = useMemo<QuickPick[]>(() => quickPicks(catalog), [catalog]);

  /** Разделы по порядку чипсов: по ним же идут страницы. Папки — после «Все», «Избранного» и «Недавнего» */
  const sections = useMemo<Section[]>(() => ['all', FAVORITES, ...(chatLike ? [] : [RECENT]), ...pagerFolders.map((f) => f.id)], [pagerFolders, chatLike]);
  const liveOrder = ['all', FAVORITES, ...(chatLike ? [] : [RECENT]), ...folders.map((f) => f.id)].join('|');
  /** Страницы пейджера привязаны к номерам, поэтому когда папки добавили, убрали или переставили, пейджер строится заново */
  const order = sections.join('|');

  // Открытую папку удалили: остаёмся на «Все»
  useEffect(() => {
    if (!sections.includes(section)) setSection('all');
  }, [sections, section]);
  const everything = useMemo(() => items.map((t) => t.id), [items]);
  /** Недавние от самых свежих */
  const recent = useMemo(() => recentIds(client, kind).filter((id) => catalog.byId.has(id)), [client, kind, catalog]);

  /** Материалы каждого раздела: идентификаторы в порядке раздела (в папке — те, что в неё выбраны) */
  const bases = useMemo(
    () =>
      sections.map((id) => {
        if (wholeCatalog(id)) return everything;
        const members = new Set(folders.find((f) => f.id === id)?.ids);
        return items.filter((t) => members.has(t.id)).map((t) => t.id);
      }),
    [sections, everything, items, folders],
  );
  /** Они же с учётом отметки страницы: в «Избранном» только избранное, в «Недавнем» только присланное, от самого свежего */
  const scopes = useMemo(() => bases.map((base, i) => markedScope(base, marksOf(sections[i]), favorites, recent)), [bases, sections, favorites, recent]);

  // Пока человек печатает, список догоняет с небольшим запозданием, а поле остаётся отзывчивым
  const query = useDeferredValue(view.query);
  const q = useMemo<ViewQuery>(() => ({ query, filters: view.filters, sort: SORT }), [query, view.filters]);
  const listings = useMemo(
    () =>
      scopes.map((scope) => {
        const listing = listIds(catalog, q, scope, favorites);
        // Закреплённые стоят первыми, пока нет запроса: при поиске порядок задаёт совпадение
        if (normalize(query) !== '' || !listing.ids.some((id) => pinned.has(id))) return listing;
        return { ...listing, ids: [...listing.ids.filter((id) => pinned.has(id)), ...listing.ids.filter((id) => !pinned.has(id))] };
      }),
    [catalog, q, scopes, favorites, pinned, query],
  );
  const narrowed = normalize(query) !== '' || countFilters(view.filters) > 0;
  const activeCount = countFilters(view.filters);
  const resetKey = `${query}|${JSON.stringify(view.filters)}`;

  const index = Math.max(0, sections.indexOf(section));
  const shown = dragIndex ?? index;
  // Соседние разделы нижней панели («Задания», «Диагностика», «Диалоги»): с последнего чипса влево — в следующий, с первого вправо — в
  // предыдущий (перед заданиями раздела нет). По списку это делает пейджер, по самим чипсам — жесты ниже
  const nextTab = kind === 'task' ? 'tests' : 'messages';
  const prevTab = kind === 'test' ? 'tasks' : null;
  const atStart = useRef(true);
  const atEnd = useRef(false);
  atStart.current = index === 0;
  atEnd.current = index === sections.length - 1;
  useChipsDrag(root);
  const onChips = (origin: Element) => Boolean(chatLike) && Boolean(origin.closest('.screen-header__chips'));
  useTabSwipe(root, 'left', nextTab, (o) => onChips(o) && atEnd.current);
  useTabSwipe(root, 'right', 'tasks', (o) => prevTab !== null && onChips(o) && atStart.current);

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

  const byItem = useMemo(() => new Map(items.map((t) => [t.id, t] as const)), [items]);
  const sel = useLibrarySelection({
    kind,
    scope,
    byId: byItem,
    favorites,
    pinned,
    onSetFavorites,
    onSetPinned,
    say,
    canSend: (item) => kind === 'test' || Boolean(taskSettings(item)),
  });
  // Пока идёт выбор, нажатие на строку выделяет её, а не открывает
  const tap = useCallback(
    (item: LibraryItem) => {
      if (sel.justHeld()) return;
      if (sel.selecting) sel.toggle(item);
      else open(item);
    },
    [sel.selecting, sel.toggle, sel.justHeld, open],
  );

  const relax = useCallback(
    (r: Relaxation) => {
      if (r.type === 'option') toggleOption(kind, r.facet, r.option);
      else if (r.type === 'filters') clearFilters(kind);
      // «Не только избранное», «не только недавнее» и «во всех» — один и тот же выход: на «Все»
      else if (r.type === 'mark' || r.type === 'scope') setSection('all');
      else setQuery(kind, '');
    },
    [kind],
  );

  const pages = useMemo(
    () =>
      sections.map((id, i) => ({
        key: id,
        node: (
          <LibraryList
            catalog={catalog}
            ctx={{ scope: bases[i], everything, marks: marksOf(id), favorites, recent }}
            listing={listings[i]}
            query={q}
            typed={query}
            noun={labels.noun}
            everywhere={labels.everywhere}
            empty={emptyText(marksOf(id), wholeCatalog(id), labels.emptyRecent)}
            tokens={tokens}
            resetKey={resetKey}
            pinned={pinned}
            selected={sel.ids}
            onHold={sel.hold}
            onToggleFavorite={onToggleFavorite}
            onOpen={tap}
            onRelax={relax}
            onResetFilters={() => clearFilters(kind)}
          />
        ),
      })),
    [sections, catalog, bases, everything, listings, q, query, labels, favorites, recent, tokens, resetKey, onToggleFavorite, tap, relax, kind, pinned, sel.ids, sel.hold],
  );

  const onDrag = useCallback(
    (position: number | null) => {
      setDragIndex(position === null ? null : Math.round(Math.min(sections.length - 1, Math.max(0, position))));
    },
    [sections.length],
  );

  // Цвет чипсов идёт за положением страниц
  const onPosition = useCallback((position: number, via?: PositionVia) => {
    const chips = root.current?.querySelectorAll<HTMLElement>('.screen-header__chips .chip');
    if (chips) followChips(chips, position, via);
    const row = root.current?.querySelector<HTMLElement>('.screen-header__chips');
    if (row) centerChips(row, position, '.chip', via);
  }, []);

  // Чипс раздела: пока что-то ищут, пустые разделы бледнеют, а число находок слышно в подписи.
  // Долгое нажатие открывает меню папки (у «Избранного» и «Недавнего» меню нет); у «Все» на экране одно слово, а читалке нужно знать, чего «все»: «Все тесты»
  const chip = (id: Section, label: string) => {
    const i = sections.indexOf(id);
    const count = listings[i]?.ids.length ?? 0;
    return {
      follow: true,
      // В стиле «Диалогов» чипсы — отдельные капсулы с зазором 8, а не склеенная лента
      split: !chatLike,
      tone: chatLike ? ('chat' as const) : kind,
      active: sections[shown] === id,
      onClick: () => setSection(id),
      onLongPress: id === FAVORITES || id === RECENT ? undefined : (el: HTMLElement) => folderMenu.open(id, el),
      ariaLabel: narrowed ? `${label}: найдено ${count}` : id === 'all' ? label : undefined,
      className: narrowed && count === 0 ? 'chip--dim' : undefined,
    };
  };

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

  const chipNodes = (
    <>
            <Chip {...chip('all', labels.all)}>Все</Chip>
            <Chip {...chip(FAVORITES, 'Избранное')}>Избранное</Chip>
            {!chatLike && <Chip {...chip(RECENT, 'Недавнее')}>Недавнее</Chip>}
            {folders.map(({ id, name, color, ink, badge }) => (
              <Chip key={id} {...chip(id, name)} folder={{ scope, id }} paint={{ color, ink, badge }}>
                {name}
              </Chip>
            ))}
    </>
  );
  const filterButton = (
    <button
      type="button"
      className={`${chatLike ? 'chats-header__action' : 'screen-header__action'} library-page__tile${activeCount ? ' library-page__tile--on' : ''}`}
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
  );
  const recentItems = useMemo(() => recent.map((id) => catalog.byId.get(id)?.item).filter((x): x is LibraryItem => Boolean(x)), [recent, catalog]);

  // В покое подвижная заливка стоит под выбранным чипсом (как в «Диалогах»)
  const keptOrder = useRef('');
  useLayoutEffect(() => {
    if (!chatLike) return;
    const row = root.current?.querySelector<HTMLElement>('.screen-header__chips');
    if (!row) return;
    const place = () => {
      const chips = Array.from(row.querySelectorAll<HTMLElement>(':scope > .chip'));
      const kept = row.querySelector<HTMLElement>(':scope > .chips-pill')?.dataset.weights?.split(',').map(Number);
      const at = liveOrder.split('|').indexOf(sections[index]);
      placePill(chips, kept && kept.length === chips.length && liveOrder === keptOrder.current ? kept : chips.map((_, i) => (i === at ? 1 : 0)));
      keptOrder.current = liveOrder;
    };
    place();
    const watch = new ResizeObserver(place);
    watch.observe(row);
    row.querySelectorAll('.chip').forEach((c) => watch.observe(c));
    void document.fonts?.ready.then(place);
    return () => watch.disconnect();
  }, [chatLike, index, order, liveOrder, searching]);

  return (
    <section ref={root} className={chatLike ? `library-page messages${recentItems.length === 0 ? ' library-page--bare' : ''}` : 'library-page'} data-selecting={chatLike && sel.selecting ? '' : undefined}>
      {chatLike ? (
        <ChatsHeader
          searching={searching}
          onSearching={setSearching}
          query={view.query}
          onQuery={(value) => setQuery(kind, value)}
          title={kind === 'task' ? 'Задания' : 'Тесты'}
          status={kind === 'task' ? 'Ваши практики' : 'Ваши опросники'}
          heading={title}
          placeholder={searchPlaceholder}
          chipsLabel={labels.filters}
          aside={filterButton}
          belt={recentItems.length > 0 ? <RecentRow items={recentItems} onOpen={open} /> : null}
          inputRef={input}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
          chips={chipNodes}
          selection={sel.header()}
        />
      ) : (
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
        searchAside={filterButton}
        chipsLabel={labels.filters}
        chips={chipNodes}
      />
      )}

      <div className="library-page__body">
        <SwipePager key={order} index={index} pages={pages} onIndexChange={(i) => setSection(sections[i])} onPosition={onPosition} onDrag={onDrag} onEdgeSwipe={chatLike ? (d) => (d > 0 ? switchTab(nextTab, 'slide-next') : prevTab && switchTab(prevTab, 'slide-prev')) : undefined} />
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
          view={{ query: view.query, filters: view.filters, sort: SORT }}
          scope={scopes[index]}
          favorites={favorites}
          noun={labels.noun}
          onApply={(next) => setFilters(kind, next)}
          onClose={() => setSheet(null)}
        />
      )}
      {folderMenu.node}
      {chatLike && sel.send()}
      {toast && <Toast text={toast} />}
    </section>
  );
}
