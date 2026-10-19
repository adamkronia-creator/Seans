import avatar1 from '../assets/avatars/avatar-1.jpg';
import avatar2 from '../assets/avatars/avatar-2.jpg';
import avatar3 from '../assets/avatars/avatar-3.jpg';
import avatar4 from '../assets/avatars/avatar-4.jpg';
import userAvatar from '../assets/avatars/user-avatar-200.jpg';

export type ChatCategory = 'clients' | 'colleagues' | 'seminars';

export interface Chat {
  id: string;
  name: string;
  avatar?: string;
  /** Закреплённый системный чат «Избранное» */
  favorites?: boolean;
  category?: ChatCategory;
  online?: boolean;
  lastMessage: string;
  time: string;
  unread: number;
  /** Последнее сообщение отправили вы: доставлено (серые галочки) или прочитано (синие) */
  outgoing?: 'sent' | 'read';
  /** Чат в архиве: не показывается в списке и папках, лежит на экране «Архив чатов» */
  archived?: boolean;
}

export const CURRENT_USER = { name: 'Вы', avatar: userAvatar };

export const CATEGORIES: { id: ChatCategory; label: string }[] = [
  { id: 'clients', label: 'Клиенты' },
  { id: 'colleagues', label: 'Коллеги' },
  { id: 'seminars', label: 'Семинар' },
];

// Тестовые данные. Тексты и время, кроме первых двух чатов, придуманы.
export const CHATS: Chat[] = [
  {
    id: 'favorites',
    name: 'Избранное',
    favorites: true,
    lastMessage: 'Вы прошли «Сокращённый многофакторный опросник»',
    time: '00:00',
    unread: 5,
  },
  {
    id: 'maxim',
    name: 'Максим Мартынов',
    avatar: avatar1,
    category: 'clients',
    online: true,
    lastMessage: 'Напомню: сеанс состоится 21.04 в 18:00. Кабинет №91.',
    outgoing: 'read',
    time: '00:00',
    unread: 0, // прочитано
  },
  {
    id: 'vera',
    name: 'Вера Филиппова',
    avatar: avatar2,
    category: 'clients',
    lastMessage: 'Заполнила дневник эмоций :)',
    time: '14:32',
    unread: 2, // не прочитано
  },
  {
    id: 'vladislav',
    name: 'Владислав Семёнов',
    avatar: avatar3,
    category: 'colleagues',
    online: true,
    lastMessage: 'Блин, я не и не знал, что такой опросник есть.',
    time: '12:05',
    unread: 1,
  },
  {
    id: 'bogdan',
    name: 'Богдан Ермолаев',
    avatar: avatar4,
    category: 'seminars',
    lastMessage: 'Да, третий семинар в четверг.',
    outgoing: 'sent',
    time: 'Вчера',
    unread: 0,
    archived: true, // для показа: в архиве уже есть чат
  },
];
