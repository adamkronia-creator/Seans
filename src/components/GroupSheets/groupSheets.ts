import { useSyncExternalStore } from 'react';

/*
 * Какое нижнее окно групп открыто сейчас и подсказка после действия. Окна открываются с разных экранов (значок в профиле, строка поиска,
 * карточка приглашения в ленте чата), поэтому состояние общее, а показывает его один узел на весь экран (GroupSheetHost в App.tsx).
 * Карточки в ленте чата открывают окна отсюда: окно внутри пузыря получало бы его жесты (долгое нажатие, свайп ответа).
 */

export type GroupSheetState =
  /** Группа по нажатию на значок: о группе, участники, вступление */
  | { kind: 'group'; id: string }
  /** Вступление: что другие увидят о вас; `invite` — вы отвечаете согласием на приглашение; `back` — «Отмена» возвращает к листу группы */
  | { kind: 'join'; id: string; invite?: string; back?: boolean }
  /** Новая группа (без id) или правка своей */
  | { kind: 'edit'; id?: string }
  /** Кого позвать в группу */
  | { kind: 'people'; id: string }
  /** Ответ собеседника на ваше приглашение (пока нет сервера, отвечает тот, кто смотрит) */
  | { kind: 'reply'; invite: string }
  | { kind: 'status' }
  | { kind: 'leave'; id: string }
  | { kind: 'delete'; id: string };

interface Snapshot {
  sheet: GroupSheetState | null;
  toast: string | null;
}

let snapshot: Snapshot = { sheet: null, toast: null };
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const set = (patch: Partial<Snapshot>) => {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((cb) => cb());
};

/** Адреса экранов групп: список (из профиля) и страница одной группы */
export const groupsPath = '/groups';
export const groupPath = (id: string) => `/group/${id}`;

export const openGroupSheet = (sheet: GroupSheetState) => set({ sheet });
export const closeGroupSheet = () => set({ sheet: null });
/** Нажатие на значок: окно группы */
export const openGroup = (id: string) => openGroupSheet({ kind: 'group', id });

let timer: number | undefined;
/** Короткая подсказка внизу экрана, как у остальных экранов: уходит сама */
export function toastGroup(text: string) {
  set({ toast: text });
  window.clearTimeout(timer);
  timer = window.setTimeout(() => set({ toast: null }), 2600);
}

export function useGroupSheet(): Snapshot {
  return useSyncExternalStore(subscribe, () => snapshot);
}
