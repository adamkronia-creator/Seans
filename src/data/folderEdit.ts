import { useRef, useSyncExternalStore } from 'react';
import { guardBack } from '../router';
import type { FolderScope } from './folders';

/*
 * Режим «Изменить порядок» у чипсов папок (как в Telegram): чипсы подрагивают, на каждом значок удаления, удержанный чипс можно
 * перетащить. Режим один на раздел и живёт, пока человек не нажмёт «Готово». Значок удаления просит экран спросить подтверждение.
 */
let editing: FolderScope | null = null;
const listeners = new Set<() => void>();
const removeAsks = new Set<(scope: FolderScope, id: string) => void>();

const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Снимает запись-«заглушку» истории: системная «назад» во время перестановки закрывает её, а не уводит с экрана */
let releaseBack: (() => void) | null = null;

export const startFolderEdit = (scope: FolderScope) => {
  if (editing === null) releaseBack = guardBack(stopFolderEdit);
  editing = scope;
  emit();
};
export const stopFolderEdit = () => {
  if (editing === null) return;
  editing = null;
  const release = releaseBack;
  releaseBack = null;
  release?.();
  emit();
};

/** Идёт ли перестановка папок этого раздела */
export const useFolderEditing = (scope: FolderScope) => useSyncExternalStore(subscribe, () => editing === scope);

/** Значок удаления на чипсе: экран, который слушает, откроет вопрос «Удалить папку?» */
export const askRemoveFolder = (scope: FolderScope, id: string) => removeAsks.forEach((fn) => fn(scope, id));
export const onRemoveFolderAsk = (fn: (scope: FolderScope, id: string) => void) => {
  removeAsks.add(fn);
  return () => {
    removeAsks.delete(fn);
  };
};

/**
 * Значение, которое на время перестановки чипсов не меняется: страницы пейджера не должны перестраиваться на каждом шаге перетаскивания
 * (это мигало), порядок страниц обновится один раз, когда человек нажмёт «Готово»
 */
export function useFrozenWhile<T>(frozen: boolean, value: T): T {
  const kept = useRef<T>(value);
  if (!frozen) kept.current = value;
  return kept.current;
}
