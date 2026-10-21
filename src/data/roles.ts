import type { Chat } from './chats';

/** Роли, которые предлагаются чипсами; свои роли, уже назначенные чатам, добавляются к ним (см. rolesOf) */
export const DEFAULT_ROLES = ['Клиент', 'Коллега', 'Семинар', 'Супервизор', 'Студент', 'Пациент'];

/** Длина своей роли: подпись под именем в шапке чата должна поместиться в одну строку */
export const ROLE_MAX = 24;

const BY_CATEGORY: Record<string, string> = { clients: 'Клиент', colleagues: 'Коллега', seminars: 'Семинар' };

/** Роль собеседника: назначенная вручную или по папке; нет ни того ни другого — «Диалог» */
export const roleOf = (chat: Pick<Chat, 'role' | 'category'>): string => chat.role ?? BY_CATEGORY[chat.category ?? ''] ?? 'Диалог';

/** Чипсы выбора роли: стандартные и те, что уже назначены (свои), без повторов */
export function rolesOf(chats: Pick<Chat, 'role'>[]): string[] {
  const own = chats.flatMap((c) => (c.role && !DEFAULT_ROLES.some((r) => r.toLowerCase() === c.role!.toLowerCase()) ? [c.role] : []));
  return [...DEFAULT_ROLES, ...new Set(own)];
}
