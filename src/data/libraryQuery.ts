import { createIndex, type FieldSpec, type IndexDoc, type SearchIndex, type SearchResult } from '../utils/searchIndex';
import { normalize } from '../utils/ruText';
import type { LibraryItem } from './library';
import { CONCEPTS } from './libraryConcepts';
import { describe, FACETS, NONE, type Described, type FacetDef, type Kind, type Option } from './libraryMeta';

/*
 * Каталог тестов или заданий для поиска и фильтров: слова + фильтры + сортировка, счётчики у пунктов фильтров
 * и подсказки для пустой выдачи. Здесь нет React: всё можно проверить скриптом (scripts/test-library.mjs).
 */

/** Поля поиска по важности: сокращение и название выше описания, темы и шкалы ниже */
export const FIELDS: FieldSpec[] = [
  { id: 'abbr', label: 'Название', weight: 100, visible: true },
  { id: 'title', label: 'Название', weight: 80, visible: true },
  { id: 'alias', label: 'Также называется', weight: 70 },
  { id: 'domain', label: 'Область', weight: 60 },
  { id: 'topic', label: 'Тема', weight: 45 },
  { id: 'scale', label: 'Шкала', weight: 40 },
  { id: 'approach', label: 'Подход', weight: 40 },
  { id: 'description', label: 'Описание', weight: 35, visible: true },
  { id: 'format', label: 'Формат', weight: 20 },
];

export interface Entry {
  item: LibraryItem;
  d: Described;
  /** Место в каталоге: так материалы стоят, пока порядок не выбран */
  order: number;
}

export interface Catalog {
  kind: Kind;
  entries: Entry[];
  byId: Map<string, Entry>;
  /** Фильтры с пунктами из данных каталога; те, что ничего не различают, убраны */
  facets: FacetDef[];
  index: SearchIndex;
}

/** Выбранные пункты по фильтрам; внутри фильтра «или», между фильтрами «и» */
export type Filters = Record<string, string[]>;

export type SortId = 'auto' | 'alpha' | 'short' | 'long' | 'favorite';

export interface ViewQuery {
  query: string;
  filters: Filters;
  sort: SortId;
}


const docOf = ({ item, d }: Entry): IndexDoc => ({
  id: item.id,
  fields: {
    abbr: item.abbr ? [item.abbr] : [],
    title: [item.title],
    alias: d.aliases,
    domain: d.domains,
    topic: d.topics,
    scale: d.scales,
    approach: d.approaches,
    description: [item.description],
    format: d.format ? [d.format] : [],
  },
  exact: [item.abbr, item.title, ...d.aliases].filter((s): s is string => !!s),
  concepts: d.concepts,
});

/** Фильтры по данным каталога: только пункты, которые у кого-то есть; «Не указано» — если у кого-то сведений нет */
function resolveFacets(kind: Kind, entries: Entry[]): FacetDef[] {
  const out: FacetDef[] = [];
  for (const facet of FACETS[kind]) {
    const present = new Set<string>();
    let missing = false;
    for (const e of entries) {
      const values = e.d.facets[facet.id] ?? [];
      if (values.length === 0) missing = true;
      values.forEach((v) => present.add(v));
    }
    let options: Option[] = facet.dynamic
      ? [...present].sort((a, b) => Number(a) - Number(b)).map((id) => ({ id, label: facet.labelOf?.(id) ?? id }))
      : facet.options.filter((o) => present.has(o.id));
    if (options.length + (missing ? 1 : 0) < 2) continue;
    if (missing) options = [...options, { id: NONE, label: 'Не указано' }];
    out.push({ ...facet, options });
  }
  return out;
}

const catalogs = new WeakMap<LibraryItem[], Catalog>();

/** Каталог для списка материалов: собирается один раз на список */
export function catalogOf(kind: Kind, items: LibraryItem[]): Catalog {
  const cached = catalogs.get(items);
  if (cached) return cached;
  const entries = items.map((item, order) => ({ item, d: describe(kind, item), order }));
  const catalog: Catalog = {
    kind,
    entries,
    byId: new Map(entries.map((e) => [e.item.id, e])),
    facets: resolveFacets(kind, entries),
    index: createIndex(entries.map(docOf), FIELDS, CONCEPTS),
  };
  catalogs.set(items, catalog);
  return catalog;
}

// ——— Фильтры ———

export const EMPTY_FILTERS: Filters = {};

/** Сколько пунктов выбрано во всех фильтрах */
export const countFilters = (filters: Filters): number => Object.values(filters).reduce((n, v) => n + v.length, 0);

function passes(entry: Entry, filters: Filters, skip?: string): boolean {
  for (const [facet, selected] of Object.entries(filters)) {
    if (!selected.length || facet === skip) continue;
    const values = entry.d.facets[facet] ?? [];
    if (!(values.length === 0 ? selected.includes(NONE) : values.some((v) => selected.includes(v)))) return false;
  }
  return true;
}

// ——— Отметки: избранное и недавнее ———

/** Отбор поверх раздела: только избранное и/или только то, что недавно присылали; включённые отметки действуют вместе («и») */
export interface Marks {
  favorites: boolean;
  recent: boolean;
}

export const NO_MARKS: Marks = { favorites: false, recent: false };

export const hasMarks = (marks: Marks): boolean => marks.favorites || marks.recent;

/**
 * Материалы раздела с учётом отметок. Недавние идут от самых свежих (recent уже в таком порядке),
 * поэтому без выбора другого порядка список «недавних» начинается с последнего присланного; остальное — в порядке раздела.
 */
export function markedScope(scope: string[], marks: Marks, favorites: ReadonlySet<string>, recent: readonly string[]): string[] {
  let ids = scope;
  if (marks.recent) {
    const inScope = new Set(ids);
    ids = recent.filter((id) => inScope.has(id));
  }
  if (marks.favorites) ids = ids.filter((id) => favorites.has(id));
  return ids;
}

// ——— Выдача ———

export interface Listing {
  ids: string[];
  /** Результат поиска по словам; null — слов в запросе нет */
  search: SearchResult | null;
  /** В запросе есть слова, но ничего не нашлось */
  noMatches: boolean;
}

const collator = new Intl.Collator('ru');
const minutesOf = (e: Entry, i: 0 | 1) => e.d.minutes?.[i];

/**
 * Материалы раздела (scope — их идентификаторы в порядке раздела: все или папка, уже с учётом отметок)
 * после запроса, фильтров и сортировки.
 */
export function listIds(catalog: Catalog, view: ViewQuery, scope: string[], favorites: ReadonlySet<string>): Listing {
  const hasWords = normalize(view.query) !== '';
  const search = hasWords ? catalog.index.search(view.query) : null;
  const rank = search ? new Map(search.order.map((id, i) => [id, i])) : null;
  const found: Entry[] = [];
  for (const id of scope) {
    const entry = catalog.byId.get(id);
    if (!entry || !passes(entry, view.filters)) continue;
    if (hasWords && !search?.hits.has(id)) continue;
    found.push(entry);
  }
  const natural = (a: Entry, b: Entry) => (rank ? (rank.get(a.item.id) ?? 0) - (rank.get(b.item.id) ?? 0) : 0);
  // Сортировка устойчивая: у равных остаётся порядок раздела
  switch (view.sort) {
    case 'alpha':
      found.sort((a, b) => collator.compare(a.item.title, b.item.title));
      break;
    case 'short':
    case 'long': {
      const sign = view.sort === 'short' ? 1 : -1;
      found.sort((a, b) => {
        const x = minutesOf(a, 1);
        const y = minutesOf(b, 1);
        if (x === undefined || y === undefined) return x === y ? 0 : x === undefined ? 1 : -1;
        return sign * (x - y || (minutesOf(a, 0) ?? 0) - (minutesOf(b, 0) ?? 0));
      });
      break;
    }
    case 'favorite':
      found.sort((a, b) => Number(favorites.has(b.item.id)) - Number(favorites.has(a.item.id)) || natural(a, b));
      break;
    default:
      if (rank) found.sort(natural);
  }
  return { ids: found.map((e) => e.item.id), search, noMatches: hasWords && !search };
}

/**
 * Сколько материалов даст каждый пункт фильтра, если его выбрать (остальные фильтры, запрос и раздел учитываются).
 * Внутри своего фильтра пункты не мешают друг другу: выбрав «Депрессию», видно, сколько будет, если добавить «Тревогу».
 */
export function facetCounts(catalog: Catalog, view: ViewQuery, scope: string[]): Record<string, Record<string, number>> {
  const hasWords = normalize(view.query) !== '';
  const search = hasWords ? catalog.index.search(view.query) : null;
  const base: Entry[] = [];
  for (const id of scope) {
    const entry = catalog.byId.get(id);
    if (entry && (!hasWords || search?.hits.has(id))) base.push(entry);
  }
  const out: Record<string, Record<string, number>> = {};
  for (const facet of catalog.facets) {
    const counts: Record<string, number> = {};
    for (const option of facet.options) counts[option.id] = 0;
    for (const entry of base) {
      if (!passes(entry, view.filters, facet.id)) continue;
      const values = entry.d.facets[facet.id] ?? [];
      if (values.length === 0) counts[NONE] = (counts[NONE] ?? 0) + 1;
      else for (const v of values) if (v in counts) counts[v] += 1;
    }
    out[facet.id] = counts;
  }
  return out;
}

// ——— Если ничего не нашлось ———

export type Relaxation =
  | { type: 'option'; facet: string; option: string; label: string; count: number }
  | { type: 'filters'; count: number }
  | { type: 'mark'; mark: keyof Marks; count: number }
  | { type: 'scope'; count: number }
  | { type: 'query'; count: number };

/** Откуда берутся материалы страницы: раздел без отметок, весь каталог, включённые отметки и то, от чего они зависят */
export interface ScopeContext {
  scope: string[];
  everything: string[];
  marks: Marks;
  favorites: ReadonlySet<string>;
  /** Недавние от самых свежих */
  recent: readonly string[];
}

/** Что убрать, чтобы появились результаты, и сколько их будет: пустая выдача подсказывает выход, а не просто сообщает об этом */
export function relaxations(catalog: Catalog, view: ViewQuery, ctx: ScopeContext): Relaxation[] {
  const { scope, everything, marks, favorites, recent } = ctx;
  const count = (v: ViewQuery, m: Marks = marks, base = scope) => listIds(catalog, v, markedScope(base, m, favorites, recent), favorites).ids.length;
  const out: Relaxation[] = [];
  const selected = catalog.facets.flatMap((f) => (view.filters[f.id] ?? []).map((o) => ({ facet: f, option: o })));
  const single = selected
    .map(({ facet, option }) => {
      const filters = { ...view.filters, [facet.id]: (view.filters[facet.id] ?? []).filter((o) => o !== option) };
      return { facet, option, count: count({ ...view, filters }) };
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  for (const r of single) {
    out.push({ type: 'option', facet: r.facet.id, option: r.option, label: r.facet.options.find((o) => o.id === r.option)?.label ?? r.option, count: r.count });
  }
  if (selected.length > 1) {
    const n = count({ ...view, filters: EMPTY_FILTERS });
    if (n > 0) out.push({ type: 'filters', count: n });
  }
  for (const mark of ['favorites', 'recent'] as const) {
    if (!marks[mark]) continue;
    const n = count(view, { ...marks, [mark]: false });
    if (n > 0) out.push({ type: 'mark', mark, count: n });
  }
  if (scope.length !== everything.length) {
    const n = count(view, marks, everything);
    if (n > 0) out.push({ type: 'scope', count: n });
  }
  if (normalize(view.query) !== '') {
    const n = count({ ...view, query: '' });
    if (n > 0) out.push({ type: 'query', count: n });
  }
  return out;
}

/** Быстрый выбор для пустого поиска: самые «населённые» пункты фильтров по каталогу */
export function quickPicks(catalog: Catalog, limit = 6): { facet: string; option: string; label: string; count: number }[] {
  const all = catalog.entries.map((e) => e.item.id);
  const counts = facetCounts(catalog, { query: '', filters: EMPTY_FILTERS, sort: 'auto' }, all);
  const picks: { facet: string; option: string; label: string; count: number; at: number }[] = [];
  catalog.facets
    .filter((f) => f.id === 'domain' || f.id === 'approach' || f.id === 'time')
    .forEach((f, fi) => {
      f.options.forEach((o, oi) => {
        const count = counts[f.id]?.[o.id] ?? 0;
        if (o.id !== NONE && count > 0) picks.push({ facet: f.id, option: o.id, label: o.label, count, at: fi * 100 + oi });
      });
    });
  return picks
    .sort((a, b) => b.count - a.count || a.at - b.at)
    .slice(0, limit)
    .map(({ at: _at, ...pick }) => pick);
}
