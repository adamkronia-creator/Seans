import { useSyncExternalStore } from 'react';

/** Вкладки чата с собеседником */
export type SectionId = 'messages' | 'tests' | 'tasks' | 'notes' | 'info' | 'library';

/** Порядок по умолчанию: тот же, в котором вкладки листаются пальцем */
export const DEFAULT_TABS: SectionId[] = ['messages', 'tests', 'tasks', 'notes', 'info', 'library'];

/** «Диалог» скрыть нельзя: чат всегда открывается на нём */
export const ALWAYS_SHOWN: SectionId = 'messages';

interface TabsState {
  order: SectionId[];
  hidden: SectionId[];
}

const KEY = 'seans.chatTabs';

function load(): TabsState {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<TabsState> | null;
    const known = (list: unknown): SectionId[] => (Array.isArray(list) ? list.filter((id): id is SectionId => DEFAULT_TABS.includes(id as SectionId)) : []);
    const order = known(raw?.order);
    // Новые вкладки, которых нет в сохранённом порядке, встают в конец
    return { order: [...order, ...DEFAULT_TABS.filter((id) => !order.includes(id))], hidden: known(raw?.hidden).filter((id) => id !== ALWAYS_SHOWN) };
  } catch {
    return { order: DEFAULT_TABS, hidden: [] };
  }
}

let state: TabsState = load();
const listeners = new Set<() => void>();

function commit(next: TabsState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* хранилище недоступно: настройка живёт до перезагрузки */
  }
  listeners.forEach((l) => l());
}

export function useChatTabs(): TabsState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

/** Сдвинуть вкладку на одно место (порядок общий для всех чатов) */
export function moveChatTab(id: SectionId, step: -1 | 1) {
  const from = state.order.indexOf(id);
  const to = from + step;
  if (from < 0 || to < 0 || to >= state.order.length) return;
  const order = state.order.slice();
  [order[from], order[to]] = [order[to], order[from]];
  commit({ ...state, order });
}

export function setChatTabShown(id: SectionId, shown: boolean) {
  if (id === ALWAYS_SHOWN) return;
  commit({ ...state, hidden: shown ? state.hidden.filter((x) => x !== id) : [...state.hidden.filter((x) => x !== id), id] });
}
