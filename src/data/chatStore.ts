import { useSyncExternalStore } from 'react';
import { CHATS, type Chat } from './chats';
import { ROLE_MAX } from './roles';
import { MESSAGES, type Message, type MessageGroup } from './messages';
import { firstNameOf, type Contact } from './contacts';

// Общее состояние: список чатов и переписки. Список и открытый чат видят одни и те же данные.
let messages: Record<string, MessageGroup[]> = MESSAGES;
let nextId = 1000;
let typing: Record<string, boolean> = {};
const listeners = new Set<() => void>();

/**
 * Превью чата в списке берётся из последнего сообщения переписки. В группе перед текстом имя автора («Анна: …», у своих «Вы: …»);
 * у групп и каналов галочек доставки нет.
 */
function previewOf(groups: MessageGroup[] | undefined, kind?: Chat['kind']): Pick<Chat, 'lastMessage' | 'time' | 'outgoing' | 'lastAuthor'> | undefined {
  const lastGroup = groups?.[groups.length - 1];
  const last = lastGroup?.messages[lastGroup.messages.length - 1];
  if (!last) return undefined;
  const text = last.text.replace(/\s*\n\s*/g, ' ') || (last.image ? 'Фото' : last.file ? last.file.name : last.test ? 'Тест' : last.task ? 'Задание' : '');
  if (kind) {
    const lastAuthor = kind === 'group' && !last.service ? (last.from === 'me' ? 'Вы' : firstNameOf(last.author ?? '')) : undefined;
    return { lastMessage: text, time: last.time, outgoing: undefined, lastAuthor };
  }
  return { lastMessage: text, time: last.time, outgoing: last.from === 'me' ? (last.status === 'read' || !last.status ? 'read' : 'sent') : undefined, lastAuthor: undefined };
}

let chats: Chat[] = CHATS.map((c) => ({ ...c, ...previewOf(MESSAGES[c.id], c.kind) }));

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const emit = () => listeners.forEach((cb) => cb());

/** Чаты, которые видны в списке: без только что созданных пустых (их показывает первое сообщение) */
let listedMemo: { chats: Chat[]; list: Chat[] } | null = null;
function listedOf(all: Chat[]): Chat[] {
  if (listedMemo?.chats !== all) listedMemo = { chats: all, list: all.some((c) => c.empty) ? all.filter((c) => !c.empty) : all };
  return listedMemo.list;
}

export function useChats(): Chat[] {
  return useSyncExternalStore(subscribe, () => listedOf(chats));
}

/** Один чат по номеру, в том числе ещё пустой (открыт из контактов, но без сообщений) */
export function useChat(id: string): Chat | undefined {
  return useSyncExternalStore(subscribe, () => chats.find((c) => c.id === id));
}

/** Все чаты без подписки: для адресов и проверок вне разметки (есть ли такой чат) */
export const getChats = (): Chat[] => chats;
export const getChat = (id: string): Chat | undefined => chats.find((c) => c.id === id);
/** Переписка чата без подписки: для проверок вне разметки */
export const getMessages = (chatId: string): MessageGroup[] => messages[chatId] ?? NO_MESSAGES;

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
  const gone = chats.filter((c) => set.has(c.id));
  chats = chats.filter((c) => !set.has(c.id));
  messages = Object.fromEntries(Object.entries(messages).filter(([id]) => !set.has(id)));
  emit();
  // Группы и каналы при этом покидаются: об этом знает хранилище групп
  if (gone.length) removedListeners.forEach((cb) => cb(gone));
}

const removedListeners = new Set<(gone: Chat[]) => void>();
/** Подписка на удаление чатов из списка (хранилище групп выходит из удалённых групп и каналов) */
export function onChatsRemoved(cb: (gone: Chat[]) => void) {
  removedListeners.add(cb);
  return () => removedListeners.delete(cb);
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
  const p = previewOf(messages[chatId], chats.find((c) => c.id === chatId)?.kind);
  if (p) chats = chats.map((c) => (c.id === chatId ? { ...c, ...p } : c));
}

/** Первое сообщение делает созданный из контактов пустой чат видимым в списке: он встаёт вверх, под закреплёнными */
function reveal(chatId: string) {
  const chat = chats.find((c) => c.id === chatId && c.empty);
  if (chat) chats = sorted([{ ...chat, empty: undefined }, ...chats.filter((c) => c.id !== chatId)]);
}

/** Личный чат с контактом из записной книжки: если переписки ещё нет, создаётся пустой чат (в списке его не видно, пока не появится первое сообщение) */
export function ensureContactChat(contact: Contact) {
  if (chats.some((c) => c.id === contact.id)) return;
  chats = [
    ...chats,
    { id: contact.id, name: contact.name, avatar: contact.avatar, category: contact.category, online: contact.online, username: contact.username, lastMessage: '', time: '', unread: 0, empty: true },
  ];
  messages = { ...messages, [contact.id]: [] };
  emit();
}

/** Чат, который открыт на экране: входящие в нём сразу прочитаны */
let openChat: string | null = null;
export function setOpenChat(id: string | null) {
  openChat = id;
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
  reveal(chatId);
  chats = chats.map((c) => (c.id === chatId ? { ...c, unread: c.unread + 1 } : c));
  setPreview(chatId);
  emit();
}

/** Что хранилище групп добавляет к отправляемому сообщению (просмотры и подпись поста) и что делает после отправки (ответы участников) */
interface SendHooks {
  decorate: (chatId: string) => Partial<Message>;
  after: (chatId: string, id: string, text: string) => void;
}
let sendHooks: SendHooks | null = null;
export function registerSendHooks(hooks: SendHooks) {
  sendHooks = hooks;
}

/** Служебная запись в переписке группы («Вы добавили Анну»): по центру, без пузыря */
export function postService(chatId: string, text: string) {
  appendToday(chatId, { id: String(nextId++), from: 'me', service: true, text, time: clock() });
  reveal(chatId);
  setPreview(chatId);
  emit();
}

/** Сообщение участника группы или пост канала от другого человека. Если чат открыт, оно сразу прочитано */
export function postIncoming(chatId: string, content: Pick<Message, 'text' | 'author' | 'views' | 'signature' | 'counts'>) {
  appendToday(chatId, { id: String(nextId++), from: 'them', time: clock(), ...content });
  reveal(chatId);
  if (openChat !== chatId) chats = chats.map((c) => (c.id === chatId ? { ...c, unread: c.unread + 1 } : c));
  setPreview(chatId);
  emit();
}

/** Изменить поля сообщения (правка текста, счётчики реакций и просмотров) */
export function updateMessage(chatId: string, id: string, patch: Partial<Message>) {
  patchMessage(chatId, id, patch);
  setPreview(chatId);
  emit();
}

/** Изменить сведения о чате (название, фото) */
export function patchChat(id: string, patch: Partial<Chat>) {
  chats = chats.map((c) => (c.id === id ? { ...c, ...patch } : c));
  emit();
}

/** Новый чат: встаёт в начало списка (после «Избранного» и закреплённых), с готовой перепиской */
export function addChat(chat: Chat, history: MessageGroup[] = []) {
  messages = { ...messages, [chat.id]: history };
  chats = sorted([{ ...chat, ...previewOf(history, chat.kind) }, ...chats.filter((c) => c.id !== chat.id)]);
  emit();
}

/** Показывать ли «печатает…» после отправки (демонстрация: ответа за этим не следует) */
const SIMULATE_TYPING = true;

/**
 * Отправка сообщения: попадает в переписку и в превью чата; статус идёт «отправляется → отправлено → прочитано».
 * С `test` уходит карточка теста: текст в ней необязателен. Возвращает номер нового сообщения (пост канала по нему уходит в другие сети).
 */
export function sendMessage(chatId: string, rawText: string, replyTo?: string, test?: Pick<Message, 'test' | 'testKind' | 'testOptions' | 'toSelf' | 'task' | 'taskOptions' | 'buttons' | 'forwarded' | 'image' | 'file'>): string | undefined {
  const text = rawText.trim();
  if (!text && !test) return undefined;

  const id = String(nextId++);
  appendToday(chatId, { id, from: 'me', text, time: clock(), status: 'sending', ...sendHooks?.decorate(chatId), ...(replyTo ? { replyTo } : {}), ...test });
  reveal(chatId);
  // Тест или задание, отправленные себе («Избранное»), приходят как входящие: в чате счётчик, на вкладке «Диалоги» значок
  if (test?.toSelf && (test.test || test.task) && chats.find((c) => c.id === chatId)?.favorites) {
    chats = chats.map((c) => (c.id === chatId ? { ...c, unread: c.unread + 1 } : c));
  }
  setPreview(chatId);
  emit();

  setTimeout(() => patchMessage(chatId, id, { status: 'sent' }), 500);
  setTimeout(() => patchMessage(chatId, id, { status: 'read' }), 1400);
  sendHooks?.after(chatId, id, text);
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
  return id;
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
  if (!text && !message.image && !message.file) return;
  toIds.forEach((id) => sendMessage(id, text, undefined, { forwarded: from, ...(message.image ? { image: message.image } : {}), ...(message.file ? { file: message.file } : {}) }));
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
