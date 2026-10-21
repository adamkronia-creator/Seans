import avatar1 from '../assets/avatars/avatar-1.jpg';
import avatar2 from '../assets/avatars/avatar-2.jpg';
import avatar3 from '../assets/avatars/avatar-3.jpg';
import avatar4 from '../assets/avatars/avatar-4.jpg';
import userAvatar from '../assets/avatars/user-avatar-200.jpg';

export interface Chat {
  id: string;
  name: string;
  avatar?: string;
  /** Закреплённый системный чат «Избранное» */
  favorites?: boolean;
  online?: boolean;
  lastMessage: string;
  time: string;
  unread: number;
  /** Последнее сообщение отправили вы: доставлено (серые галочки) или прочитано (синие) */
  outgoing?: 'sent' | 'read';
  /** Чат в архиве: не показывается в списке и папках, лежит на экране «Архив чатов» */
  archived?: boolean;
  /** Закреплён вверху списка (после «Избранного») */
  pinned?: boolean;
  /** Уведомления чата выключены */
  muted?: boolean;
  /** Собеседник заблокирован */
  blocked?: boolean;
  /** Данные контакта (карточка собеседника) */
  phone?: string;
  username?: string;
  about?: string;
  birthday?: string;
  /** Подписка на события контакта */
  subscribed?: boolean;
}

export const CURRENT_USER = { name: 'Вы', avatar: userAvatar };

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
    online: true,
    phone: '+7 (913) 735-19-37',
    username: '@maxim_martynov',
    about: 'Ведём работу с тревогой, сеансы по четвергам',
    birthday: '14 марта 1991',
    lastMessage: 'Напомню: сеанс состоится 21.04 в 18:00. Кабинет №91.',
    outgoing: 'read',
    time: '00:00',
    unread: 0, // прочитано
  },
  {
    id: 'vera',
    name: 'Вера Филиппова',
    avatar: avatar2,
    phone: '+7 (905) 412-08-66',
    username: '@vera_filippova',
    about: 'Веду дневник эмоций, пишу по вечерам',
    birthday: '2 августа 1996',
    lastMessage: 'Заполнила дневник эмоций :)',
    time: '14:32',
    unread: 2, // не прочитано
  },
  {
    id: 'vladislav',
    name: 'Владислав Семёнов',
    avatar: avatar3,
    online: true,
    phone: '+7 (922) 310-47-25',
    username: '@vlad_semenov',
    about: 'Психолог, КПТ. Делюсь опросниками и разборами',
    birthday: '27 ноября 1988',
    lastMessage: 'Блин, я не и не знал, что такой опросник есть.',
    time: '12:05',
    unread: 1,
  },
  {
    id: 'anna',
    name: 'Анна Лебедева',
    // Без фото: так выглядит контакт, у которого его нет (буквы на подложке)
    phone: '+7 (983) 440-26-91',
    username: '@anna_lebedeva',
    about: 'Пишет впервые, хочет записаться на консультацию',
    lastMessage: 'Здравствуйте! Хотела бы записаться на консультацию.',
    time: '10:12',
    unread: 1,
  },
  {
    id: 'oleg',
    name: 'Олег Рябинин',
    phone: '+7 (913) 118-52-07',
    username: '@oleg_ryabinin',
    about: 'Нашёл вас по рекомендации коллеги',
    lastMessage: 'Приглашение: роль «Клиент»',
    time: '09:40',
    unread: 1,
  },
  {
    id: 'bogdan',
    name: 'Богдан Ермолаев',
    avatar: avatar4,
    phone: '+7 (983) 205-61-40',
    username: '@bogdan_ermolaev',
    about: 'Ведущий семинара по КПТ, группа по четвергам',
    birthday: '9 января 1985',
    lastMessage: 'Да, третий семинар в четверг.',
    outgoing: 'sent',
    time: 'Вчера',
    unread: 0,
    archived: true, // для показа: в архиве уже есть чат
  },
];
