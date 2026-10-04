import { useSyncExternalStore } from 'react';
import { CHATS, type Chat } from './chats';

// Общее состояние чатов: список и открытый чат видят одни и те же непрочитанные.
let chats: Chat[] = CHATS;
const listeners = new Set<() => void>();

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function useChats(): Chat[] {
  return useSyncExternalStore(subscribe, () => chats);
}

/** Открытие чата помечает его прочитанным */
export function markRead(id: string) {
  if (!chats.some((c) => c.id === id && c.unread > 0)) return;
  chats = chats.map((c) => (c.id === id ? { ...c, unread: 0 } : c));
  listeners.forEach((cb) => cb());
}
