import { useSyncExternalStore } from 'react';
import { CHATS, type Chat } from './chats';
import { MESSAGES, type Message, type MessageGroup } from './messages';

// Общее состояние: список чатов и переписки. Список и открытый чат видят одни и те же данные.
let chats: Chat[] = CHATS;
let messages: Record<string, MessageGroup[]> = MESSAGES;
let nextId = 1000;
const listeners = new Set<() => void>();

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const emit = () => listeners.forEach((cb) => cb());

export function useChats(): Chat[] {
  return useSyncExternalStore(subscribe, () => chats);
}

const NO_MESSAGES: MessageGroup[] = [];

export function useMessages(chatId: string): MessageGroup[] {
  return useSyncExternalStore(subscribe, () => messages[chatId] ?? NO_MESSAGES);
}

/** Открытие чата помечает его прочитанным */
export function markRead(id: string) {
  if (!chats.some((c) => c.id === id && c.unread > 0)) return;
  chats = chats.map((c) => (c.id === id ? { ...c, unread: 0 } : c));
  emit();
}

/** Отправка сообщения: попадает в переписку и в превью чата в списке */
export function sendMessage(chatId: string, rawText: string) {
  const text = rawText.trim();
  if (!text) return;

  const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const message: Message = { id: String(nextId++), from: 'me', text, time };

  const groups = messages[chatId] ?? [];
  const last = groups[groups.length - 1];
  messages = {
    ...messages,
    [chatId]:
      last?.label === 'Сегодня'
        ? [...groups.slice(0, -1), { ...last, messages: [...last.messages, message] }]
        : [...groups, { label: 'Сегодня', messages: [message] }],
  };
  chats = chats.map((c) => (c.id === chatId ? { ...c, lastMessage: `Вы: ${text}`, time } : c));
  emit();
}
