import { useSyncExternalStore } from 'react';
import { CHATS, CURRENT_USER, type ChatCategory } from './chats';
import { authorIndex, initialsAvatar } from '../utils/initialsAvatar';

/** Идентификатор самого пользователя среди участников групп и авторов сообщений */
export const ME = 'me';

/** Человек из записной книжки: его можно позвать в группу или канал, открыть с ним личный чат */
export interface Contact {
  id: string;
  name: string;
  avatar: string;
  username?: string;
  /** Десять цифр после +7, если номер указан при создании */
  phone?: string;
  /** Когда был в сети: «в сети», «был(а) недавно», «был(а) вчера в 19:40» */
  status: string;
  online: boolean;
  category?: ChatCategory;
  /** Нужен для текстов служебных записей: «вступила» или «вступил» */
  female?: boolean;
}

/**
 * Контакты. Первые четыре — собеседники из чатов, остальные придуманы для показа (выбор участников групп и каналов):
 * у них нет фото, вместо него цветная аватарка с инициалами.
 */
const STATUS: Record<string, string> = {
  maxim: 'в сети',
  vera: 'был(а) 10 минут назад',
  vladislav: 'в сети',
  bogdan: 'был(а) вчера в 19:40',
};

const fromChats: Contact[] = CHATS.filter((c) => !c.favorites && !c.kind).map((c) => ({
  id: c.id,
  name: c.name,
  avatar: c.avatar ?? initialsAvatar(c.name, c.id),
  username: c.username,
  status: STATUS[c.id] ?? 'был(а) недавно',
  online: Boolean(c.online),
  category: c.category,
  female: c.id === 'vera',
}));

const invented = (id: string, name: string, username: string, status: string, category: ChatCategory, female = false): Contact => ({
  id,
  name,
  avatar: initialsAvatar(name, id),
  username,
  status,
  online: status === 'в сети',
  category,
  female,
});

export const CONTACTS: Contact[] = [
  ...fromChats,
  invented('anna', 'Анна Королёва', '@anna_korolyova', 'в сети', 'colleagues', true),
  invented('igor', 'Игорь Назаров', '@igor_nazarov', 'был(а) 20 минут назад', 'colleagues'),
  invented('elena', 'Елена Миронова', '@elena_mironova', 'в сети', 'colleagues', true),
  invented('olga', 'Ольга Громова', '@olga_gromova', 'был(а) сегодня в 10:12', 'colleagues', true),
  invented('pavel', 'Павел Зайцев', '@pavel_zaytsev', 'был(а) вчера', 'seminars'),
  invented('tatyana', 'Татьяна Соколова', '@tatyana_sokolova', 'был(а) недавно', 'clients', true),
  invented('dmitry', 'Дмитрий Орлов', '@dmitry_orlov', 'в сети', 'clients'),
  invented('sergey', 'Сергей Лебедев', '@sergey_lebedev', 'был(а) на этой неделе', 'clients'),
];

const byId = new Map(CONTACTS.map((c) => [c.id, c]));
const order = new Map(CONTACTS.map((c, i) => [c.id, i]));

/** Номер цвета имени автора в группе (0…6): по месту в записной книжке, чтобы у соседей цвета не совпадали; у остальных — по идентификатору */
export const authorColor = (id: string): number => ((order.get(id) ?? authorIndex(id)) % 7);

/** Новый контакт из окна «Новый контакт»: ложится в конец записной книжки, у него цветные инициалы и статус «был(а) недавно» */
let snapshot: Contact[] = [...CONTACTS];
const listeners = new Set<() => void>();
export function addContact(name: string, surname: string, phone: string): Contact {
  const full = [name, surname].map((t) => t.trim()).filter(Boolean).join(' ');
  const id = `contact-${CONTACTS.length}-${Date.now().toString(36)}`;
  const contact: Contact = { id, name: full, avatar: initialsAvatar(full, id), status: 'был(а) недавно', online: false, phone: phone || undefined };
  order.set(id, CONTACTS.length);
  CONTACTS.push(contact);
  byId.set(id, contact);
  snapshot = [...CONTACTS];
  listeners.forEach((l) => l());
  return contact;
}
/** Записная книжка, которая перерисовывает экран, когда в ней появился новый контакт */
export const useContacts = (): Contact[] =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshot,
  );

export const contactOf = (id: string): Contact | undefined => byId.get(id);

/** Имя для подписи: у самого пользователя «Вы» */
export const nameOf = (id: string): string => (id === ME ? CURRENT_USER.name : (byId.get(id)?.name ?? 'Пользователь'));

export const firstNameOf = (id: string): string => nameOf(id).split(' ')[0];

/** Фото из справочника (у самого пользователя актуальное фото профиля берёт компонент через useAvatarSrc) */
export const avatarOf = (id: string): string | undefined => (id === ME ? CURRENT_USER.avatar : byId.get(id)?.avatar);

/** Сортировка по алфавиту для списков выбора */
export const byName = (a: Contact, b: Contact) => a.name.localeCompare(b.name, 'ru');

/** Глагол в нужном роде: gendered('anna', 'вступил', 'вступила') */
export const gendered = (id: string, male: string, female: string): string => (byId.get(id)?.female ? female : male);
