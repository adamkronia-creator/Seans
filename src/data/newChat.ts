import { useSyncExternalStore } from 'react';
import type { GroupDraft, GroupKind } from './groups';

/*
 * Черновик новой группы или канала: его заполняют по шагам на экранах /new/… (участники, название и фото, тип и адрес),
 * а создаётся группа на последнем шаге. Черновик живёт, пока мастер открыт; новый мастер начинает с пустого.
 */

const empty = (kind: GroupKind): GroupDraft => ({ kind, name: '', description: '', photo: null, members: [], isPublic: false, username: '' });

let draft: GroupDraft = empty('group');
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const emit = () => listeners.forEach((cb) => cb());

export const useDraft = (): GroupDraft => useSyncExternalStore(subscribe, () => draft);
export const getDraft = (): GroupDraft => draft;

export function startDraft(kind: GroupKind) {
  draft = empty(kind);
  emit();
}

export function patchDraft(patch: Partial<GroupDraft>) {
  draft = { ...draft, ...patch };
  emit();
}

export function toggleDraftMember(id: string) {
  patchDraft({ members: draft.members.includes(id) ? draft.members.filter((m) => m !== id) : [...draft.members, id] });
}
