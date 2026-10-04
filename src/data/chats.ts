import avatar1 from '../assets/avatars/avatar-1.png';
import avatar2 from '../assets/avatars/avatar-2.png';
import avatar3 from '../assets/avatars/avatar-3.png';
import avatar4 from '../assets/avatars/avatar-4.png';
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
}

export const CURRENT_USER = { name: 'Вы', avatar: userAvatar };

export const CATEGORIES: { id: ChatCategory; label: string }[] = [
  { id: 'clients', label: 'Клиенты' },
  { id: 'colleagues', label: 'Коллеги' },
  { id: 'seminars', label: 'Семинары' },
];

// Тестовые данные. Тексты и время, кроме первых двух чатов, придуманы.
export const CHATS: Chat[] = [
  {
    id: 'favorites',
    name: 'Избранное',
    favorites: true,
    lastMessage: 'Вы прошли «Сокращенный многофакторный опросник»',
    time: '00:00',
    unread: 5,
  },
  {
    id: 'maxim',
    name: 'Максим Мартынов',
    avatar: avatar1,
    category: 'clients',
    online: true,
    lastMessage: 'Вы: Напомню: сеанс состоится 21/04 в 18:00. Кабинет №91.',
    time: '00:00',
    unread: 3,
  },
  {
    id: 'vera',
    name: 'Вера Филиппова',
    avatar: avatar2,
    category: 'clients',
    lastMessage: 'Заполнила дневник эмоций :)',
    time: '14:32',
    unread: 0,
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
    lastMessage: 'Мы же читаем третий семинар, верно?',
    time: 'Вчера',
    unread: 0,
  },
];
