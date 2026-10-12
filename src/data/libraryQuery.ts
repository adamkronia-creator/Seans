import { createIndex, type FieldSpec, type IndexDoc, type SearchIndex, type SearchResult } from '../utils/searchIndex';
import { normalize } from '../utils/ruText';
import type { LibraryItem } from './library';
import { CONCEPTS } from './libraryConcepts';
import { COMPARE_ROWS, describe, FACETS, NONE, type Described, type Fact, type FacetDef, type Kind, type Option } from './libraryMeta';

/*
 * Каталог тестов или заданий для поиска и фильтров: слова + фильтры + сортировка, счётчики у пунктов фильтров,
 * подсказки для пустой выдачи и сравнение материалов. Здесь нет React: всё можно проверить скриптом (scripts/test-library.mjs).
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

export const SORTS: { id: SortId; label: string; hint?: string }[] = [
  { id: 'auto', label: 'По умолчанию' },
  { id: 'alpha', label: 'По названию', hint: 'От А до Я' },
  { id: 'short', label: 'Сначала быстрые', hint: 'Меньше времени у клиента' },
  { id: 'long', label: 'Сначала долгие', hint: 'Подробнее, но дольше' },
  { id: 'favorite', label: 'Сначала избранное' },
];

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
 * Материалы раздела (scope — их идентификаторы в порядке раздела: все, избранное, недавние, категория)
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
  | { type: 'scope'; count: number }
  | { type: 'query'; count: number };

/** Что убрать, чтобы появились результаты, и сколько их будет: пустая выдача подсказывает выход, а не просто сообщает об этом */
export function relaxations(catalog: Catalog, view: ViewQuery, scope: string[], everything: string[], favorites: ReadonlySet<string>): Relaxation[] {
  const count = (v: ViewQuery, s = scope) => listIds(catalog, v, s, favorites).ids.length;
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
  if (scope.length !== everything.length) {
    const n = count(view, everything);
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

// ——— Сравнение ———

export interface CompareRow {
  id: string;
  label: string;
  cells: (Fact | undefined)[];
  /** Наибольшее число в строке: от него считается длина полоски */
  max?: number;
  bar: boolean;
}

export interface Comparison {
  /** Строки, где материалы различаются или у кого-то нет сведений */
  different: CompareRow[];
  /** Строки, где у всех одно и то же */
  same: CompareRow[];
}

/** Подпись для сравнения: сокращение (СМОЛ, PHQ-9), а если его нет, название */
export const shortName = (item: LibraryItem) => item.abbr ?? item.title;

export function compare(kind: Kind, entries: Entry[]): Comparison {
  const different: CompareRow[] = [];
  const same: CompareRow[] = [];
  for (const spec of COMPARE_ROWS[kind]) {
    const cells = entries.map((e) => e.d.facts[spec.id]);
    if (cells.every((c) => !c)) continue;
    const values = cells.map((c) => c?.value).filter((v): v is number => v !== undefined);
    const row: CompareRow = { id: spec.id, label: spec.label, cells, bar: !!spec.bar && values.length > 1, max: values.length ? Math.max(...values) : undefined };
    const equal = cells.every((c) => c && c.text === cells[0]?.text);
    (equal ? same : different).push(row);
  }
  return { different, same };
}

/** Итог сравнения словами: кто быстрее, у кого больше вопросов */
export function summary(entries: Entry[]): string[] {
  const lines: string[] = [];
  const extreme = (key: string, low: string, high: string, unit: (v: number) => string) => {
    const known = entries.filter((e) => e.d.facts[key]?.value !== undefined);
    if (known.length < 2) return;
    const values = known.map((e) => e.d.facts[key].value as number);
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) return;
    const names = (v: number) => known.filter((e) => e.d.facts[key].value === v).map((e) => shortName(e.item)).join(' и ');
    lines.push(`${low}: ${names(min)}, ${unit(min)}`);
    lines.push(`${high}: ${names(max)}, ${unit(max)}`);
  };
  extreme('time', 'Быстрее всех', 'Дольше всех', (v) => `до ${v} мин`);
  const questions = entries.every((e) => e.d.facts.size?.value !== undefined);
  if (questions) extreme('size', 'Меньше всего вопросов', 'Больше всего вопросов', (v) => String(v));
  return lines;
}
