import { useSyncExternalStore } from 'react';
import { CATEGORIES, CHATS } from './chats';
import { LIBRARY, TASK_CATEGORIES, TASK_LIBRARY, TEST_CATEGORIES } from './library';

/*
 * Папки: чипсы под полем поиска в «Диалогах», «Диагностике» и «Заданиях» (кроме «Все»). Как в Telegram, папка — это
 * название и выбранные в неё чаты, тесты или задания; один и тот же материал может лежать в нескольких папках.
 * Начальные папки собраны из прежних категорий. Данные только в памяти, как и остальные настройки приложения.
 */

/** Где живут папки: у каждого раздела свои */
export type FolderScope = 'chats' | 'tests' | 'tasks';

export interface Folder {
  id: string;
  name: string;
  /** Что лежит в папке: чаты, тесты или задания. Порядок показа задаёт сам раздел, а не папка */
  ids: string[];
  /** Уведомления папки выключены: число непрочитанных на её чипсе приглушено (только у чатов) */
  muted: boolean;
  /** Цвет заливки выбранного чипса и цвет его подписи (#rrggbb); без них чипс обычный */
  color?: string;
  ink?: string;
}

/** Название папки не длиннее: чипсы стоят в один ряд, а длинное название съест его целиком */
export const FOLDER_NAME_MAX = 16;
export const NEW_FOLDER_NAME = 'Новая папка';

const seed = (categories: { id: string; label: string }[], members: (id: string) => string[]): Folder[] =>
  categories.map(({ id, label }) => ({ id, name: label, ids: members(id), muted: false }));

let state: Record<FolderScope, Folder[]> = {
  // «Избранное» лежит только в «Все»: это системный чат
  chats: seed(CATEGORIES, (id) => CHATS.filter((chat) => !chat.favorites && chat.category === id).map((chat) => chat.id)),
  tests: seed(TEST_CATEGORIES, (id) => LIBRARY.filter((item) => (item.categories as string[]).includes(id)).map((item) => item.id)),
  tasks: seed(TASK_CATEGORIES, (id) => TASK_LIBRARY.filter((item) => (item.categories as string[]).includes(id)).map((item) => item.id)),
};

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function commit(scope: FolderScope, folders: Folder[]) {
  state = { ...state, [scope]: folders };
  listeners.forEach((listener) => listener());
}

function patch(scope: FolderScope, id: string, change: Partial<Folder>) {
  const folder = state[scope].find((f) => f.id === id);
  if (!folder) return;
  commit(scope, state[scope].map((f) => (f === folder ? { ...folder, ...change } : f)));
}

/** Папки раздела по порядку чипсов */
export function useFolders(scope: FolderScope): readonly Folder[] {
  return useSyncExternalStore(subscribe, () => state[scope]);
}

/** Одна папка; undefined, если её уже нет (удалили) */
export function useFolder(scope: FolderScope, id: string): Folder | undefined {
  return useSyncExternalStore(subscribe, () => state[scope].find((f) => f.id === id));
}

export const getFolder = (scope: FolderScope, id: string): Folder | undefined => state[scope].find((f) => f.id === id);

/** Весь ряд папок раздела вне React (обработчики и проверки) */
export const getFolders = (scope: FolderScope): readonly Folder[] => state[scope];

/** Название без лишних пробелов и не длиннее предела; пустое не годится */
export const cleanFolderName = (name: string) => name.replace(/\s+/g, ' ').trim().slice(0, FOLDER_NAME_MAX).trim();

/** Только что созданные папки: пока в них ничего не тронули, при выходе с экрана настроек они убираются */
const fresh = new Set<string>();
const touched = (id: string) => fresh.delete(id);

/** Папку только что создали и пока ничего в ней не трогали (экран настроек сразу ставит курсор в название) */
export const isFreshFolder = (id: string) => fresh.has(id);

let serial = 0;

/** Новая пустая папка в конце ряда; возвращает её адрес */
export function createFolder(scope: FolderScope): string {
  serial += 1;
  const id = `folder-${serial}`;
  fresh.add(id);
  commit(scope, [...state[scope], { id, name: NEW_FOLDER_NAME, ids: [], muted: false }]);
  return id;
}

/** Переименовать; пустое название игнорируется, чипс без подписи не нужен */
export function renameFolder(scope: FolderScope, id: string, name: string) {
  const next = cleanFolderName(name);
  if (!next) return;
  touched(id);
  patch(scope, id, { name: next });
}

/** Цвет чипса и цвет подписи на нём; undefined возвращает обычный */
export function setFolderPaint(scope: FolderScope, id: string, paint: { color?: string; ink?: string }) {
  touched(id);
  patch(scope, id, paint);
}

/** Заменить состав папки (окно выбора) */
export function setFolderItems(scope: FolderScope, id: string, ids: string[]) {
  touched(id);
  patch(scope, id, { ids });
}

export function removeFromFolder(scope: FolderScope, id: string, itemId: string) {
  const folder = getFolder(scope, id);
  if (!folder) return;
  touched(id);
  patch(scope, id, { ids: folder.ids.filter((x) => x !== itemId) });
}

/** Переключить уведомления папки; возвращает, выключены ли они теперь */
export function toggleFolderMuted(scope: FolderScope, id: string): boolean {
  const folder = getFolder(scope, id);
  if (!folder) return false;
  patch(scope, id, { muted: !folder.muted });
  return !folder.muted;
}

/** Сдвинуть папку на шаг в ряду чипсов («Все» всегда первая и не входит в ряд) */
export function moveFolder(scope: FolderScope, id: string, step: -1 | 1) {
  const folders = state[scope];
  const from = folders.findIndex((f) => f.id === id);
  const to = from + step;
  if (from < 0 || to < 0 || to >= folders.length) return;
  const next = folders.slice();
  [next[from], next[to]] = [next[to], next[from]];
  commit(scope, next);
}

export function deleteFolder(scope: FolderScope, id: string) {
  fresh.delete(id);
  if (!getFolder(scope, id)) return;
  commit(scope, state[scope].filter((f) => f.id !== id));
}

/** Выход с экрана настроек: папка, которую создали и ничего в ней не тронули, убирается — пустой «Новой папки» никто не хотел */
export function discardUntouchedFolder(scope: FolderScope, id: string) {
  if (fresh.has(id)) deleteFolder(scope, id);
}
