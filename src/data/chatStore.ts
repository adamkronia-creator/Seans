import { useSyncExternalStore } from 'react';
import { CHATS, type Chat } from './chats';
import { ROLE_MAX } from './roles';
import { MESSAGES, type Message, type MessageGroup } from './messages';

// Общее состояние: список чатов и переписки. Список и открытый чат видят одни и те же данные.
let messages: Record<string, MessageGroup[]> = MESSAGES;
let nextId = 1000;
let typing: Record<string, boolean> = {};
const listeners = new Set<() => void>();

/** Превью чата в списке берётся из последнего сообщения переписки */
function previewOf(groups: MessageGroup[] | undefined): Pick<Chat, 'lastMessage' | 'time' | 'outgoing'> | undefined {
  const lastGroup = groups?.[groups.length - 1];
  const last = lastGroup?.messages[lastGroup.messages.length - 1];
  if (!last) return undefined;
  const text = last.text.replace(/\s*\n\s*/g, ' ') || (last.image ? 'Фото' : last.test ? 'Тест' : last.task ? 'Задание' : '');
  return { lastMessage: text, time: last.time, outgoing: last.from === 'me' ? (last.status === 'read' || !last.status ? 'read' : 'sent') : undefined };
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

/** Сколько чатов с непрочитанными: число на значке вкладки «Диалоги», в той же единице, что и на чипсах (архив и «Избранное» не считаются) */
export function useUnreadTotal(): number {
  return useSyncExternalStore(subscribe, () => unreadTotal(chats));
}
let unreadMemo: { chats: Chat[]; total: number } | null = null;
function unreadTotal(list: Chat[]) {
  if (unreadMemo?.chats !== list) unreadMemo = { chats: list, total: list.filter((c) => !c.archived && !c.favorites && c.unread > 0).length };
  return unreadMemo.total;
}

/** Отправить чат в архив или вернуть его в список. «Избранное» закреплено навсегда и в архив не уходит */
export function setArchived(id: string, archived: boolean) {
  const chat = chats.find((c) => c.id === id);
  if (!chat || chat.favorites || !!chat.archived === archived) return;
  chats = chats.map((c) => (c.id === id ? { ...c, archived } : c));
  emit();
}

const rank = (c: Chat) => (c.favorites ? 0 : c.pinned ? 1 : 2);
/** Порядок списка: «Избранное», затем закреплённые, затем остальные (внутри групп порядок прежний) */
const sorted = (list: Chat[]) => list.map((c, i) => [c, i] as const).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(([c]) => c);

/** Действия над несколькими чатами сразу (выбор в списке): «Избранное» в них не участвует, у него нет ни архива, ни удаления */
const ordinary = (ids: string[]) => new Set(ids.filter((id) => !chats.find((c) => c.id === id)?.favorites));

export function setArchivedMany(ids: string[], archived: boolean) {
  const set = ordinary(ids);
  chats = chats.map((c) => (set.has(c.id) ? { ...c, archived } : c));
  emit();
}

export function setMutedMany(ids: string[], muted: boolean) {
  const set = ordinary(ids);
  chats = chats.map((c) => (set.has(c.id) ? { ...c, muted } : c));
  emit();
}

export function setPinnedMany(ids: string[], pinned: boolean) {
  const set = ordinary(ids);
  chats = sorted(chats.map((c) => (set.has(c.id) ? { ...c, pinned } : c)));
  emit();
}

export function setBlockedMany(ids: string[], blocked: boolean) {
  const set = ordinary(ids);
  chats = chats.map((c) => (set.has(c.id) ? { ...c, blocked } : c));
  emit();
}

/** Удалить чаты вместе с перепиской */
export function deleteChats(ids: string[]) {
  const set = ordinary(ids);
  chats = chats.filter((c) => !set.has(c.id));
  messages = Object.fromEntries(Object.entries(messages).filter(([id]) => !set.has(id)));
  emit();
}

/** Очистить историю: переписка пустая, в списке остаётся сам чат */
export function clearHistory(ids: string[]) {
  const set = ordinary(ids);
  messages = { ...messages, ...Object.fromEntries([...set].map((id) => [id, [] as MessageGroup[]])) };
  chats = chats.map((c) => (set.has(c.id) ? { ...c, lastMessage: 'История очищена', outgoing: undefined, unread: 0 } : c));
  emit();
}

/** Назначить роль собеседнику: подпись под именем в открытом чате. Пустая строка возвращает роль по папке */
export function setRole(id: string, role: string) {
  const value = role.trim().slice(0, ROLE_MAX);
  chats = chats.map((c) => (c.id === id ? { ...c, role: value || undefined } : c));
  emit();
}

/** Изменить контакт: имя (пустое не принимается) и телефон */
export function updateContact(id: string, patch: { name: string; phone: string }) {
  const name = patch.name.trim();
  if (!name) return;
  chats = chats.map((c) => (c.id === id ? { ...c, name, phone: patch.phone.trim() || undefined } : c));
  emit();
}

export function setSubscribed(id: string, subscribed: boolean) {
  chats = chats.map((c) => (c.id === id ? { ...c, subscribed } : c));
  emit();
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
export function receiveMessage(chatId: string, content: Pick<Message, 'text' | 'buttons' | 'test' | 'task' | 'testKind'>) {
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
export function sendMessage(chatId: string, rawText: string, replyTo?: string, test?: Pick<Message, 'test' | 'testKind' | 'testOptions' | 'toSelf' | 'task' | 'taskOptions' | 'buttons' | 'forwarded' | 'image'>) {
  const text = rawText.trim();
  if (!text && !test) return;

  const id = String(nextId++);
  appendToday(chatId, { id, from: 'me', text, time: clock(), status: 'sending', ...(replyTo ? { replyTo } : {}), ...test });
  // Тест или задание, отправленные себе («Избранное»), приходят как входящие: в чате счётчик, на вкладке «Диалоги» значок
  if (test?.toSelf && (test.test || test.task) && chats.find((c) => c.id === chatId)?.favorites) {
    chats = chats.map((c) => (c.id === chatId ? { ...c, unread: c.unread + 1 } : c));
  }
  setPreview(chatId);
  emit();

  setTimeout(() => patchMessage(chatId, id, { status: 'sent' }), 500);
  setTimeout(() => patchMessage(chatId, id, { status: 'read' }), 1400);
  // Собеседник иногда отвечает реакцией на ваше сообщение (в «Избранном» собеседника нет)
  const peer = chats.find((c) => c.id === chatId);
  if (peer && !peer.favorites && peer.online && !test?.toSelf && Math.random() < 0.6) {
    const pool = ['❤️', '👍', '🔥', '🥰', '👏', '😁'];
    setTimeout(() => patchMessage(chatId, id, { theirReaction: pool[Math.floor(Math.random() * pool.length)] }), 3000 + Math.random() * 2500);
  }
  if (chats.find((c) => c.id === chatId)?.online) {
    if (SIMULATE_TYPING) {
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

/** Поставить реакцию на сообщение; та же реакция второй раз снимает её, null — снять */
export function setMessageReaction(chatId: string, id: string, emoji: string | null) {
  messages = {
    ...messages,
    [chatId]: (messages[chatId] ?? []).map((g) => ({
      ...g,
      messages: g.messages.map((m) => (m.id === id ? { ...m, reaction: emoji && m.reaction !== emoji ? emoji : undefined } : m)),
    })),
  };
  emit();
}

/** Переслать сообщение в другие чаты: уходит копия текста с пометкой «Переслано от …»; у карточки теста или задания текст — её название */
export function forwardMessage(toIds: string[], message: Message, from: string, title?: string) {
  // У фото подпись не пересылается, уходит только снимок
  const text = message.image ? '' : message.text || title || '';
  if (!text && !message.image) return;
  toIds.forEach((id) => sendMessage(id, text, undefined, { forwarded: from, ...(message.image ? { image: message.image } : {}) }));
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

/** Закрепить сообщение в чате или открепить; закреплённых может быть несколько */
export function setMessagePinned(chatId: string, id: string, pinned: boolean) {
  messages = {
    ...messages,
    [chatId]: (messages[chatId] ?? []).map((g) => ({ ...g, messages: g.messages.map((m) => (m.id === id ? { ...m, pinned: pinned || undefined } : m)) })),
  };
  emit();
}
