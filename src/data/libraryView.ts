import { useSyncExternalStore } from 'react';
import type { Kind } from './libraryMeta';
import { EMPTY_FILTERS, SORTS, type Filters, type SortId } from './libraryQuery';

/*
 * Состояние поиска и фильтров библиотеки: запрос, выбранные фильтры, сортировка, прошлые запросы и выбор для сравнения.
 * Хранится вне экрана: человек открыл тест из выдачи и вернулся — запрос и фильтры на месте. Прошлые запросы и
 * сортировка переживают перезагрузку (localStorage); сам запрос и фильтры — нет: новый день, новая задача.
 */

export interface ViewState {
  query: string;
  filters: Filters;
  sort: SortId;
  /** Прошлые запросы, свежие первыми */
  history: string[];
  /** Идёт выбор материалов для сравнения */
  compare: boolean;
  picked: string[];
}

export const HISTORY_LIMIT = 6;
export const COMPARE_LIMIT = 3;
const STORAGE_KEY = 'seans.library.v1';

type Saved = Partial<Record<Kind, { history?: unknown; sort?: unknown }>>;

function readSaved(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Saved) : {};
  } catch {
    // Хранилище закрыто (приватный режим, запрет сайта): работаем без него
    return {};
  }
}

function writeSaved() {
  try {
    const saved: Saved = {};
    (['test', 'task'] as Kind[]).forEach((kind) => {
      saved[kind] = { history: states[kind].history, sort: states[kind].sort };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // не сохранилось — не страшно
  }
}

function initial(kind: Kind, saved: Saved): ViewState {
  const s = saved[kind];
  const history = Array.isArray(s?.history) ? (s.history as unknown[]).filter((q): q is string => typeof q === 'string').slice(0, HISTORY_LIMIT) : [];
  const sort = SORTS.some((o) => o.id === s?.sort) ? (s?.sort as SortId) : 'auto';
  return { query: '', filters: EMPTY_FILTERS, sort, history, compare: false, picked: [] };
}

const saved = readSaved();
let states: Record<Kind, ViewState> = { test: initial('test', saved), task: initial('task', saved) };
const listeners = new Set<() => void>();

function update(kind: Kind, patch: Partial<ViewState>, persist = false) {
  states = { ...states, [kind]: { ...states[kind], ...patch } };
  if (persist) writeSaved();
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useLibraryView = (kind: Kind): ViewState => useSyncExternalStore(subscribe, () => states[kind]);

export const readLibraryView = (kind: Kind): ViewState => states[kind];

// ——— Запрос ———

export const setQuery = (kind: Kind, query: string) => update(kind, { query });

/** Запомнить запрос: нажали «Найти» или открыли найденное */
export function rememberQuery(kind: Kind, query: string) {
  const q = query.trim().replace(/\s+/g, ' ');
  if (q.length < 2) return;
  const rest = states[kind].history.filter((h) => h.toLowerCase() !== q.toLowerCase());
  update(kind, { history: [q, ...rest].slice(0, HISTORY_LIMIT) }, true);
}

export const forgetQuery = (kind: Kind, query: string) => update(kind, { history: states[kind].history.filter((h) => h !== query) }, true);
export const clearHistory = (kind: Kind) => update(kind, { history: [] }, true);

// ——— Фильтры ———

export const setFilters = (kind: Kind, filters: Filters) => update(kind, { filters });
export const clearFilters = (kind: Kind) => update(kind, { filters: EMPTY_FILTERS });

/** Выбрать или снять один пункт фильтра */
export function toggleOption(kind: Kind, facet: string, option: string) {
  const current = states[kind].filters[facet] ?? [];
  const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
  const filters = { ...states[kind].filters, [facet]: next };
  if (!next.length) delete filters[facet];
  update(kind, { filters });
}

export const resetSearch = (kind: Kind) => update(kind, { query: '', filters: EMPTY_FILTERS });

// ——— Сортировка ———

export const setSort = (kind: Kind, sort: SortId) => update(kind, { sort }, true);

// ——— Сравнение ———

export const startCompare = (kind: Kind) => update(kind, { compare: true, picked: [] });
export function stopCompare(kind: Kind) {
  const s = states[kind];
  if (s.compare || s.picked.length) update(kind, { compare: false, picked: [] });
}

export function togglePicked(kind: Kind, id: string) {
  const picked = states[kind].picked;
  if (picked.includes(id)) update(kind, { picked: picked.filter((p) => p !== id) });
  else if (picked.length < COMPARE_LIMIT) update(kind, { picked: [...picked, id] });
}
