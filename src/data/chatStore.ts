import { useSyncExternalStore } from 'react';
import { CHATS, type Chat } from './chats';
import { MESSAGES, type Message, type MessageGroup } from './messages';

// Общее состояние: список чатов и переписки. Список и открытый чат видят одни и те же данные.
let messages: Record<string, MessageGroup[]> = MESSAGES;
let nextId = 1000;
let typing: Record<string, boolean> = {};
const listeners = new Set<() => void>();

/** Превью чата в списке берётся из последнего сообщения переписки */
function previewOf(groups: MessageGroup[] | undefined): Pick<Chat, 'lastMessage' | 'time'> | undefined {
  const lastGroup = groups?.[groups.length - 1];
  const last = lastGroup?.messages[lastGroup.messages.length - 1];
  if (!last) return undefined;
  const text = last.text.replace(/\s*\n\s*/g, ' ') || (last.test ? 'Тест' : '');
  return { lastMessage: last.from === 'me' ? `Вы: ${text}` : text, time: last.time };
}

let chats: Chat[] = CHATS.map((c) => ({ ...c, ...previewOf(MESSAGES[c.id]) }));

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

/** Собеседник «печатает» */
export function useTyping(chatId: string): boolean {
  return useSyncExternalStore(subscribe, () => !!typing[chatId]);
}

/** Открытие чата помечает его прочитанным */
export function markRead(id: string) {
  if (!chats.some((c) => c.id === id && c.unread > 0)) return;
  chats = chats.map((c) => (c.id === id ? { ...c, unread: 0 } : c));
  emit();
}

function setPreview(chatId: string) {
  const p = previewOf(messages[chatId]);
  if (p) chats = chats.map((c) => (c.id === chatId ? { ...c, ...p } : c));
}

function patchMessage(chatId: string, id: string, patch: Partial<Message>) {
  messages = {
    ...messages,
    [chatId]: (messages[chatId] ?? []).map((g) => ({
      ...g,
      messages: g.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  };
  emit();
}

const clock = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

/** Добавляет сообщение в конец переписки, в день «Сегодня» */
function appendToday(chatId: string, message: Message) {
  const groups = messages[chatId] ?? [];
  const last = groups[groups.length - 1];
  messages = {
    ...messages,
    [chatId]:
      last?.label === 'Сегодня'
        ? [...groups.slice(0, -1), { ...last, messages: [...last.messages, message] }]
        : [...groups, { label: 'Сегодня', messages: [message] }],
  };
}

/**
 * Входящее сообщение (от собеседника или от самого приложения, как от бота): попадает в переписку
 * и в превью чата, счётчик непрочитанных растёт.
 */
export function receiveMessage(chatId: string, content: Pick<Message, 'text' | 'buttons' | 'test' | 'testKind'>) {
  appendToday(chatId, { id: String(nextId++), from: 'them', time: clock(), ...content });
  chats = chats.map((c) => (c.id === chatId ? { ...c, unread: c.unread + 1 } : c));
  setPreview(chatId);
  emit();
}

/** Показывать ли «печатает…» после отправки (демонстрация: ответа за этим не следует) */
const SIMULATE_TYPING = true;

/**
 * Отправка сообщения: попадает в переписку и в превью чата; статус идёт «отправляется → отправлено → прочитано».
 * С `test` уходит карточка теста: текст в ней необязателен.
 */
export function sendMessage(chatId: string, rawText: string, replyTo?: string, test?: Pick<Message, 'test' | 'testKind' | 'testOptions' | 'booking' | 'buttons'>) {
  const text = rawText.trim();
  if (!text && !test) return;

  const id = String(nextId++);
  appendToday(chatId, { id, from: 'me', text, time: clock(), status: 'sending', ...(replyTo ? { replyTo } : {}), ...test });
  setPreview(chatId);
  emit();

  setTimeout(() => patchMessage(chatId, id, { status: 'sent' }), 500);
  setTimeout(() => patchMessage(chatId, id, { status: 'read' }), 1400);
  if (chats.find((c) => c.id === chatId)?.online) {
    // Оповещение о записи на прием уходит без «печатает…»: это не реплика, на которую отвечают
    if (SIMULATE_TYPING && !test?.booking) {
      setTimeout(() => {
        typing = { ...typing, [chatId]: true };
        emit();
      }, 2200);
      setTimeout(() => {
        typing = { ...typing, [chatId]: false };
        emit();
      }, 5200);
    }
  }
}

/** Удаление сообщения; пустые дни убираются, превью списка обновляется */
export function deleteMessage(chatId: string, id: string) {
  messages = {
    ...messages,
    [chatId]: (messages[chatId] ?? [])
      .map((g) => ({ ...g, messages: g.messages.filter((m) => m.id !== id) }))
      .filter((g) => g.messages.length > 0),
  };
  setPreview(chatId);
  emit();
}
