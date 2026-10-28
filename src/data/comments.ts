import { useSyncExternalStore } from 'react';

/**
 * Комментарии под постами канала. Живут в памяти, как и остальная переписка показа.
 * Автор — id контакта, ME (вы от своего имени) или `ch:<чат>` (вы от имени сообщества, где вы владелец или администратор).
 */
export interface Comment {
  id: string;
  author: string;
  text: string;
  time: string;
}

const CHANNEL_PREFIX = 'ch:';
export const asChannel = (chatId: string): string => `${CHANNEL_PREFIX}${chatId}`;
export const channelOf = (author: string): string | undefined => (author.startsWith(CHANNEL_PREFIX) ? author.slice(CHANNEL_PREFIX.length) : undefined);

const key = (chatId: string, postId: string) => `${chatId}:${postId}`;

let store: Record<string, Comment[]> = {
  'psy-myths:pm-1': [
    { id: 'c-1', author: 'anna', text: 'Очень точно. Сама пришла «просто разобраться», а получилось про всю жизнь.', time: '10:02' },
    { id: 'c-2', author: 'igor', text: 'Хорошо бы разобрать ещё миф про «надо просто взять себя в руки».', time: '11:40' },
    { id: 'c-3', author: 'elena', text: 'Согласна, на приёме это слышу чаще всего.', time: '12:15' },
  ],
  'psy-myths:pm-2': [{ id: 'c-4', author: 'bogdan', text: 'Пункт про длительность симптомов стоит подчеркнуть: его часто упускают.', time: '18:30' }],
};
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const emit = () => listeners.forEach((cb) => cb());
const EMPTY: Comment[] = [];

export const useComments = (chatId: string, postId: string): Comment[] => useSyncExternalStore(subscribe, () => store[key(chatId, postId)] ?? EMPTY);
/** Весь набор комментариев: лента постов берёт из него числа, не подписываясь на каждый пост отдельно */
export const useCommentsStore = (): Record<string, Comment[]> => useSyncExternalStore(subscribe, () => store);
export const countIn = (snapshot: Record<string, Comment[]>, chatId: string, postId: string): number => (snapshot[key(chatId, postId)] ?? EMPTY).length;
export const useCommentCount = (chatId: string, postId: string): number => useSyncExternalStore(subscribe, () => (store[key(chatId, postId)] ?? EMPTY).length);

export function addComment(chatId: string, postId: string, author: string, text: string) {
  const t = text.trim();
  if (!t) return;
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const k = key(chatId, postId);
  store = { ...store, [k]: [...(store[k] ?? EMPTY), { id: `c-${now.getTime()}-${(store[k]?.length ?? 0) + 1}`, author, text: t, time }] };
  emit();
}

/** Слово «комментарий» с числом: 1 комментарий, 2 комментария, 5 комментариев */
export const commentsWord = (n: number): string => {
  const a = n % 100;
  const b = n % 10;
  const w = a >= 11 && a <= 14 ? 'комментариев' : b === 1 ? 'комментарий' : b >= 2 && b <= 4 ? 'комментария' : 'комментариев';
  return `${n} ${w}`;
};
