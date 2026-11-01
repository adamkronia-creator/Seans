import avatarMaxim from '../assets/avatars/maxim.jpg';
import avatarVera from '../assets/avatars/vera.jpg';
import avatarVladislav from '../assets/avatars/vladislav.jpg';
import avatarBogdan from '../assets/avatars/bogdan.jpg';
import avatarAlisa from '../assets/avatars/alisa.jpg';
import avatarArseniy from '../assets/avatars/arseniy.jpg';
import avatarEgor from '../assets/avatars/egor.jpg';
import avatarElizaveta from '../assets/avatars/elizaveta.jpg';
import avatarSofia from '../assets/avatars/sofia.jpg';
import avatarUlyana from '../assets/avatars/ulyana.jpg';
import userAvatar from '../assets/avatars/user-avatar-200.jpg';
import { initialsAvatar } from '../utils/initialsAvatar';

export type ChatCategory = 'clients' | 'colleagues' | 'seminars';

export interface Chat {
  id: string;
  name: string;
  avatar?: string;
  /** Закреплённый системный чат «Избранное» */
  favorites?: boolean;
  category?: ChatCategory;
  /** Папки, в которых чат лежит кроме основной (Софья — коллега и участница семинара) */
  extraCategories?: ChatCategory[];
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
  /** Роль, которую назначил психолог («Клиент», «Коллега», своя): подпись под именем в открытом чате. Нет — по папке (category) */
  role?: string;
  /** Данные контакта (карточка собеседника) */
  phone?: string;
  username?: string;
  about?: string;
  birthday?: string;
  /** Подписка на события контакта */
  subscribed?: boolean;
  /** Группа или канал; у обычного диалога поля нет. Участники, ссылки и права лежат в data/groups.ts */
  kind?: 'group' | 'channel';
  /** В группе: кто написал последнее сообщение (имя перед превью, у своих «Вы») */
  lastAuthor?: string;
  /** Чат создан, но в нём ещё нет сообщений: в списке его не видно, пока не появится первое */
  empty?: boolean;
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
    avatar: avatarMaxim,
    category: 'clients',
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
    avatar: avatarVera,
    category: 'clients',
    phone: '+7 (905) 412-08-66',
    username: '@vera_filippova',
    about: 'Веду дневник эмоций, пишу по вечерам',
    birthday: '2 августа 1996',
    lastMessage: 'Заполнила дневник эмоций :)',
    time: '14:32',
    unread: 2, // не прочитано
  },
  {
    id: 'alisa',
    name: 'Алиса Филатова',
    avatar: avatarAlisa,
    category: 'clients',
    online: true,
    phone: '+7 (912) 604-33-18',
    username: '@alisa_filatova',
    about: 'Работаем с самооценкой, встречи по вторникам',
    birthday: '11 июня 1994',
    lastMessage: 'Спасибо, что выслушали. Стало спокойнее.',
    time: '11:48',
    unread: 1,
  },
  {
    id: 'arseniy',
    name: 'Арсений Осипов',
    avatar: avatarArseniy,
    category: 'clients',
    phone: '+7 (922) 548-07-92',
    username: '@arseniy_osipov',
    about: 'Учусь справляться с тревогой перед экзаменами',
    birthday: '3 февраля 2001',
    lastMessage: 'Пройду тест сегодня вечером.',
    time: '10:26',
    unread: 0,
  },
  {
    id: 'elizaveta',
    name: 'Елизавета Белова',
    avatar: avatarElizaveta,
    category: 'clients',
    phone: '+7 (904) 281-65-40',
    username: '@liza_belova',
    about: 'Пришла после переезда, ищу опору',
    birthday: '19 сентября 1992',
    lastMessage: 'Хорошо, до встречи в среду.',
    outgoing: 'read',
    time: 'Вчера',
    unread: 0,
  },
  {
    id: 'ulyana',
    name: 'Ульяна Спиридонова',
    avatar: avatarUlyana,
    category: 'clients',
    phone: '+7 (951) 773-20-85',
    username: '@ulyana_spiridonova',
    about: 'Веду записи мыслей, обсуждаем на встречах',
    birthday: '28 апреля 1997',
    lastMessage: 'Заполнила дневник, посмотрите, пожалуйста.',
    time: '09:12',
    unread: 2,
  },
  {
    id: 'egor',
    name: 'Егор Афанасьев',
    avatar: avatarEgor,
    category: 'colleagues',
    phone: '+7 (987) 330-14-56',
    username: '@egor_afanasyev',
    about: 'Психолог, гештальт-подход. Обмениваемся случаями',
    birthday: '6 декабря 1990',
    lastMessage: 'Скинул вам разбор по тревоге, посмотрите.',
    time: 'Вчера',
    unread: 0,
  },
  {
    id: 'sofia',
    name: 'Софья Жукова',
    avatar: avatarSofia,
    category: 'colleagues',
    extraCategories: ['seminars'],
    online: true,
    phone: '+7 (965) 119-72-03',
    username: '@sofia_zhukova',
    about: 'Психолог и участница семинара по КПТ',
    birthday: '14 мая 1993',
    lastMessage: 'Увидимся на четвёртом занятии!',
    time: '08:40',
    unread: 0,
  },
  {
    id: 'supervision',
    name: 'Супервизия КПТ',
    avatar: initialsAvatar('Супервизия КПТ', 'supervision'),
    kind: 'group',
    lastMessage: '',
    time: '',
    unread: 3,
  },
  {
    id: 'vladislav',
    name: 'Владислав Семёнов',
    avatar: avatarVladislav,
    category: 'colleagues',
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
    id: 'psy-myths',
    name: 'Психология без мифов',
    avatar: initialsAvatar('Психология без мифов', 'psy-myths'),
    kind: 'channel',
    lastMessage: '',
    time: '',
    unread: 1,
  },
  {
    id: 'psy-notes',
    name: 'Заметки психолога',
    avatar: initialsAvatar('Заметки психолога', 'psy-notes'),
    kind: 'channel',
    lastMessage: '',
    time: '',
    unread: 0,
  },
  {
    id: 'bogdan',
    name: 'Богдан Ермолаев',
    avatar: avatarBogdan,
    category: 'seminars',
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
