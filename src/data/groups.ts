import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { addChat, deleteChats, getChat, onChatsRemoved, patchChat, postIncoming, postService, registerSendHooks, updateMessage } from './chatStore';
import { CONTACTS, ME, contactOf, nameOf } from './contacts';
import { JOIN_HISTORY } from './groupMessages';
import { getProfileName } from './profile';
import { plural } from './taskValues';
import { initialsAvatar, isGenerated } from '../utils/initialsAvatar';

/*
 * Группы и каналы: всё, что не входит в сам чат, — участники и их роли, права, тип (публичный или частный) и адрес,
 * ссылки-приглашения, заявки на вступление, заблокированные, журнал действий и настройки.
 * Устроено как в Telegram: у группы есть владелец и администраторы с набором прав, у обычных участников — общие разрешения;
 * в канале писать могут только администраторы, а подписчики читают, ставят реакции и видят просмотры.
 * Сообщения лежат в chatStore, а здесь — служебные записи в них и поведение «других людей» (ответы, просмотры), чтобы экран выглядел живым.
 * Состояние пока в памяти, как и остальные данные приложения.
 */

export type GroupKind = 'group' | 'channel';
export type Role = 'owner' | 'admin' | 'member';

// ---------------------------------------------------------------- права

export const RIGHT_KEYS = ['changeInfo', 'postMessages', 'editMessages', 'deleteMessages', 'banUsers', 'inviteUsers', 'pinMessages', 'addAdmins'] as const;
export type RightKey = (typeof RIGHT_KEYS)[number];
export type AdminRights = Record<RightKey, boolean>;

/** Права администратора, которые настраиваются в группе и в канале (их набор разный) */
export const RIGHT_LABELS: Record<GroupKind, Array<{ key: RightKey; label: string }>> = {
  group: [
    { key: 'changeInfo', label: 'Изменение профиля общего чата' },
    { key: 'deleteMessages', label: 'Удаление сообщений' },
    { key: 'banUsers', label: 'Блокировка пользователей' },
    { key: 'inviteUsers', label: 'Приглашение пользователей' },
    { key: 'pinMessages', label: 'Закрепление сообщений' },
    { key: 'addAdmins', label: 'Назначение администраторов' },
  ],
  channel: [
    { key: 'changeInfo', label: 'Изменение профиля канала' },
    { key: 'postMessages', label: 'Публикация сообщений' },
    { key: 'editMessages', label: 'Редактирование чужих сообщений' },
    { key: 'deleteMessages', label: 'Удаление чужих сообщений' },
    { key: 'inviteUsers', label: 'Приглашение подписчиков' },
    { key: 'banUsers', label: 'Блокировка подписчиков' },
    { key: 'addAdmins', label: 'Назначение администраторов' },
  ],
};

/** Новому администратору даётся всё, кроме назначения других администраторов */
export const defaultRights = (kind: GroupKind): AdminRights => ({
  changeInfo: true,
  postMessages: kind === 'channel',
  editMessages: kind === 'channel',
  deleteMessages: true,
  banUsers: true,
  inviteUsers: true,
  pinMessages: true,
  addAdmins: false,
});

export interface Member {
  /** Контакт или ME */
  id: string;
  role: Role;
  /** Когда вступил: «сегодня», «5 октября» */
  joinedAt: string;
  /** Права администратора; у владельца есть все */
  rights?: AdminRights;
  /** Подпись администратора («Куратор»): видна рядом с именем в группе */
  title?: string;
  /** Группа: сообщения администратора идут от имени группы */
  anonymous?: boolean;
  /** Обычному участнику запрещено писать (ограничение от администратора) */
  silenced?: boolean;
}

/** Что разрешено обычным участникам группы */
export interface Permissions {
  sendMessages: boolean;
  sendMedia: boolean;
  addMembers: boolean;
  pinMessages: boolean;
  changeInfo: boolean;
}

export const PERMISSION_LABELS: Array<{ key: keyof Permissions; label: string }> = [
  { key: 'sendMessages', label: 'Отправка сообщений' },
  { key: 'sendMedia', label: 'Отправка фото и файлов' },
  { key: 'addMembers', label: 'Добавление пользователей' },
  { key: 'pinMessages', label: 'Закрепление сообщений' },
  { key: 'changeInfo', label: 'Изменение профиля общего чата' },
];

export const DEFAULT_PERMISSIONS: Permissions = { sendMessages: true, sendMedia: true, addMembers: true, pinMessages: false, changeInfo: false };

/** Медленный режим: пауза между сообщениями обычного участника, секунды */
export const SLOW_MODES = [0, 10, 30, 60, 300, 900, 3600];
export const slowLabel = (s: number) => (s === 0 ? 'Выкл.' : s < 60 ? `${s} с` : s < 3600 ? `${s / 60} мин` : `${s / 3600} ч`);

/** Реакции, которые можно разрешить в группе или канале */
export const REACTION_CHOICES = ['❤️', '👍', '👎', '🔥', '🥰', '👏', '😁'];

// ---------------------------------------------------------------- данные

export interface InviteLink {
  id: string;
  code: string;
  /** Название, чтобы различать ссылки («Для семинара») */
  name: string;
  /** Основная ссылка: одна на группу, её нельзя удалить, только сбросить */
  primary: boolean;
  createdBy: string;
  createdAt: number;
  /** Когда перестанет действовать (мс); нет — без срока */
  expiresAt?: number;
  /** Сколько человек может вступить по ссылке; нет — без ограничения */
  limit?: number;
  /** Вступившие по ссылке попадают в заявки, а не сразу в группу */
  needApproval: boolean;
  /** Сколько человек уже вступило */
  joined: number;
  revoked: boolean;
}

export interface JoinRequest {
  id: string;
  contactId: string;
  at: number;
  /** По какой ссылке подана заявка; нет — по публичному адресу */
  linkId?: string;
}

export interface LogEntry {
  id: string;
  at: number;
  actor: string;
  text: string;
}

export interface GroupInfo {
  /** Совпадает с номером чата */
  chatId: string;
  kind: GroupKind;
  name: string;
  avatar: string;
  description: string;
  /** Публичные находятся поиском и открываются по адресу @имя, частные — только по ссылке-приглашению */
  isPublic: boolean;
  /** Адрес без @; у частных пустой */
  username: string;
  members: Member[];
  /** Заблокированные: вернуться по ссылке не могут, пока их не разблокируют */
  banned: string[];
  permissions: Permissions;
  slowMode: number;
  /** Канал: под постами подпись автора */
  signatures: boolean;
  /** Канал: под постами кнопка «Прокомментировать», комментарии открываются отдельным экраном */
  comments: boolean;
  /** Какие реакции разрешены; пустой список — реакции выключены */
  reactions: string[];
  /** Запрет пересылки и копирования */
  protectContent: boolean;
  /** Группа: новые участники видят прежнюю переписку */
  historyVisible: boolean;
  /** Публичная группа: вступление по заявке */
  joinApproval: boolean;
  links: InviteLink[];
  requests: JoinRequest[];
  log: LogEntry[];
  createdAt: number;
}

// ---------------------------------------------------------------- хранилище

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();
let seq = 0;
const uid = (prefix: string) => `${prefix}${(++seq).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
export function newCode(): string {
  const bytes = new Uint8Array(12);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else bytes.forEach((_, i) => (bytes[i] = Math.floor(Math.random() * 256)));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

const member = (id: string, role: Role = 'member', joinedAt = 'сегодня', extra: Partial<Member> = {}): Member => ({ id, role, joinedAt, ...extra });

const primaryLink = (createdBy: string, code = newCode(), joined = 0): InviteLink => ({
  id: uid('l'),
  code,
  name: '',
  primary: true,
  createdBy,
  createdAt: NOW - 2 * DAY,
  needApproval: false,
  joined,
  revoked: false,
});

const log = (actor: string, text: string, ago: number): LogEntry => ({ id: uid('e'), at: NOW - ago, actor, text });

function seeds(): Record<string, GroupInfo> {
  const supervision: GroupInfo = {
    chatId: 'supervision',
    kind: 'group',
    name: 'Супервизия КПТ',
    avatar: initialsAvatar('Супервизия КПТ', 'supervision'),
    description: 'Разбор случаев по КПТ раз в две недели. Без имён клиентов и подробностей, по которым их можно узнать.',
    isPublic: false,
    username: '',
    members: [
      member(ME, 'owner', '5 октября'),
      member('bogdan', 'admin', '5 октября', { title: 'Куратор', rights: { ...defaultRights('group'), addAdmins: false, changeInfo: false } }),
      member('vladislav', 'member', '5 октября'),
      member('anna', 'member', '5 октября'),
      member('elena', 'member', '5 октября'),
      member('igor', 'member', '5 октября'),
    ],
    banned: [],
    permissions: { ...DEFAULT_PERMISSIONS },
    slowMode: 0,
    signatures: false,
    comments: false,
    reactions: [...REACTION_CHOICES],
    protectContent: false,
    historyVisible: true,
    joinApproval: false,
    links: [
      primaryLink(ME, 'Zq4N7rVx2kPb', 5),
      { id: uid('l'), code: 'Xe8TmW3cJd5H', name: 'Для семинара', primary: false, createdBy: ME, createdAt: NOW - DAY, expiresAt: NOW + 6 * DAY, limit: 20, needApproval: true, joined: 0, revoked: false },
    ],
    requests: [
      { id: uid('r'), contactId: 'pavel', at: NOW - 3 * 60 * 60 * 1000 },
      { id: uid('r'), contactId: 'olga', at: NOW - 40 * 60 * 1000 },
    ],
    log: [
      log('bogdan', `${nameOf('bogdan')} закрепил сообщение`, 2 * DAY - 3 * 60 * 60 * 1000),
      log(ME, 'Вы добавили пользователей: Богдан Ермолаев, Владислав Семёнов, Анна Королёва, Елена Миронова, Игорь Назаров', 2 * DAY - 60 * 60 * 1000),
      log(ME, 'Вы назначили администратором: Богдан Ермолаев', 2 * DAY - 59 * 60 * 1000),
      log(ME, 'Вы создали общий чат «Супервизия КПТ»', 2 * DAY),
    ].sort((a, b) => b.at - a.at),
    createdAt: NOW - 2 * DAY,
  };

  const channel: GroupInfo = {
    chatId: 'psy-myths',
    kind: 'channel',
    name: 'Психология без мифов',
    avatar: initialsAvatar('Психология без мифов', 'psy-myths'),
    description: 'Короткие заметки практикующего психолога: мифы, упражнения, разборы. Не заменяет консультацию.',
    isPublic: true,
    username: 'psy_bez_mifov',
    members: [
      member('vladislav', 'owner', '1 сентября'),
      member('anna', 'member', '3 сентября'),
      member('igor', 'member', '12 сентября'),
      member('elena', 'member', '20 сентября'),
      member('olga', 'member', '2 октября'),
      member('pavel', 'member', '4 октября'),
      member(ME, 'member', '6 октября'),
    ],
    banned: [],
    permissions: { ...DEFAULT_PERMISSIONS },
    slowMode: 0,
    signatures: true,
    comments: true,
    reactions: ['❤️', '👍', '🔥', '👏'],
    protectContent: false,
    historyVisible: true,
    joinApproval: false,
    links: [primaryLink('vladislav', 'Gm6RwQ9sLp3Y', 6)],
    requests: [],
    log: [],
    createdAt: NOW - 30 * DAY,
  };

  // Публичные, в которых вас нет: находятся поиском в списке чатов и открываются по адресу /join/@имя
  const young: GroupInfo = {
    chatId: 'pub-young',
    kind: 'group',
    name: 'Молодые психологи',
    avatar: initialsAvatar('Молодые психологи', 'pub-young'),
    description: 'Сообщество начинающих психологов: вопросы, поддержка, обмен опытом. Вступление по заявке.',
    isPublic: true,
    username: 'young_psy',
    members: [member('olga', 'owner', '10 августа'), member('pavel', 'member', '12 августа'), member('tatyana', 'member', '15 августа'), member('igor', 'member', '1 сентября')],
    banned: [],
    permissions: { ...DEFAULT_PERMISSIONS },
    slowMode: 30,
    signatures: false,
    comments: false,
    reactions: [...REACTION_CHOICES],
    protectContent: false,
    historyVisible: true,
    joinApproval: true,
    links: [primaryLink('olga', 'Ys5KcB7nVf2D', 3)],
    requests: [],
    log: [],
    createdAt: NOW - 50 * DAY,
  };
  const cbt: GroupInfo = {
    chatId: 'pub-cbt',
    kind: 'channel',
    name: 'КПТ для начинающих',
    avatar: initialsAvatar('КПТ для начинающих', 'pub-cbt'),
    description: 'Записи лекций, схемы и упражнения по когнитивно-поведенческой терапии.',
    isPublic: true,
    username: 'cbt_start',
    members: [member('bogdan', 'owner', '2 июля'), member('anna', 'member', '5 июля'), member('elena', 'member', '9 июля'), member('dmitry', 'member', '20 июля')],
    banned: [],
    permissions: { ...DEFAULT_PERMISSIONS },
    slowMode: 0,
    signatures: false,
    comments: true,
    reactions: [...REACTION_CHOICES],
    protectContent: true,
    historyVisible: true,
    joinApproval: false,
    links: [primaryLink('bogdan', 'Kd3VtN8wHq6M', 4)],
    requests: [],
    log: [],
    createdAt: NOW - 90 * DAY,
  };

  return { supervision, 'psy-myths': channel, 'pub-young': young, 'pub-cbt': cbt };
}

let store: Record<string, GroupInfo> = seeds();
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const emit = () => listeners.forEach((cb) => cb());

export const getGroup = (chatId: string): GroupInfo | undefined => store[chatId];
export const useGroup = (chatId: string): GroupInfo | undefined => useSyncExternalStore(subscribe, () => store[chatId]);
/** Все группы и каналы, в том числе те, где вас нет: для поиска и страницы вступления */
export const useAllGroups = (): GroupInfo[] => {
  const snapshot = useSyncExternalStore(subscribe, () => store);
  return useMemo(() => Object.values(snapshot), [snapshot]);
};

function update(chatId: string, fn: (g: GroupInfo) => GroupInfo) {
  const g = store[chatId];
  if (!g) return;
  store = { ...store, [chatId]: fn(g) };
  emit();
}

/** Запись в журнал группы; вернёт группу с новой записью (журнал держит последние 200) */
const withLog = (g: GroupInfo, text: string, actor = ME): GroupInfo => ({ ...g, log: [{ id: uid('e'), at: Date.now(), actor, text }, ...g.log].slice(0, 200) });

/** Служебная запись в переписке: нужна только там, где вы состоите в чате */
function note(g: GroupInfo, text: string, channelToo = false) {
  if (!getChat(g.chatId)) return;
  if (g.kind === 'group' || channelToo) postService(g.chatId, text);
}

// ---------------------------------------------------------------- роли и права

export const memberOf = (g: GroupInfo, id: string): Member | undefined => g.members.find((m) => m.id === id);
export const myMember = (g: GroupInfo): Member | undefined => memberOf(g, ME);
export const myRole = (g: GroupInfo): Role | null => myMember(g)?.role ?? null;
export const isMember = (g: GroupInfo): boolean => Boolean(myMember(g));

/** Может ли пользователь то, что даёт право администратора: владелец — всё, администратор — отмеченное, участник — ничего */
export function can(g: GroupInfo | undefined, right: RightKey): boolean {
  const me = g && myMember(g);
  if (!me) return false;
  if (me.role === 'owner') return true;
  return me.role === 'admin' && Boolean(me.rights?.[right]);
}

/** Писать: в канале — администраторам с правом публикации, в группе — всем, кроме ограниченных и тех, кому запретили общие разрешения */
export function canWrite(g: GroupInfo | undefined): boolean {
  if (!g) return true;
  const me = myMember(g);
  if (!me) return false;
  if (g.kind === 'channel') return can(g, 'postMessages');
  if (me.role !== 'member') return true;
  return g.permissions.sendMessages && !me.silenced;
}

export function canSendMedia(g: GroupInfo | undefined): boolean {
  if (!g) return true;
  const me = myMember(g);
  if (!me) return false;
  return me.role !== 'member' || (g.permissions.sendMedia && !me.silenced);
}

/** Звать людей: владелец и администратор с правом, а в группе ещё и обычный участник, если это разрешено */
export function canInvite(g: GroupInfo | undefined): boolean {
  if (!g) return false;
  if (can(g, 'inviteUsers')) return true;
  return g.kind === 'group' && myRole(g) === 'member' && g.permissions.addMembers;
}

/** Закреплять сообщения */
export function canPin(g: GroupInfo | undefined): boolean {
  if (!g) return true;
  if (g.kind === 'channel') return can(g, 'postMessages');
  return can(g, 'pinMessages') || (myRole(g) === 'member' && g.permissions.pinMessages);
}

export function canChangeInfo(g: GroupInfo | undefined): boolean {
  if (!g) return false;
  return can(g, 'changeInfo') || (g.kind === 'group' && myRole(g) === 'member' && g.permissions.changeInfo);
}

/** Над кем можно что-то делать (убрать, заблокировать): не над собой, не над владельцем; администратор — только над участниками */
export function canManage(g: GroupInfo, target: Member): boolean {
  if (target.id === ME || target.role === 'owner') return false;
  const role = myRole(g);
  if (role === 'owner') return true;
  return role === 'admin' && target.role === 'member' && can(g, 'banUsers');
}

/** Можно ли пользователю удалить чужое сообщение */
export const canDeleteOthers = (g: GroupInfo | undefined): boolean => !g || can(g, 'deleteMessages');

// ---------------------------------------------------------------- подписи

const COUNT_WORDS: Record<GroupKind, [string, string, string]> = {
  group: ['пользователь', 'пользователя', 'пользователей'],
  channel: ['подписчик', 'подписчика', 'подписчиков'],
};
export const countWord = (kind: GroupKind, n: number) => plural(n, COUNT_WORDS[kind]);
export const countText = (g: GroupInfo) => `${g.members.length} ${countWord(g.kind, g.members.length)}`;
export const onlineCount = (g: GroupInfo) => g.members.filter((m) => m.id === ME || contactOf(m.id)?.online).length;
/** Подпись под названием в шапке чата: «6 участников, 3 в сети»; в канале — только число подписчиков */
export const subtitleOf = (g: GroupInfo) => (g.kind === 'channel' ? countText(g) : `${countText(g)}, ${onlineCount(g)} в сети`);
export const kindWord = (kind: GroupKind) => (kind === 'group' ? 'общий чат' : 'канал');

/** Адрес-приглашение: настоящая ссылка на этот экран приложения */
export const inviteUrl = (code: string): string => `${window.location.origin}${window.location.pathname}#/join/${code}`;
export const publicUrl = (username: string): string => inviteUrl(`@${username}`);
/** Ссылка без https:// для показа */
export const shortUrl = (url: string): string => {
  const path = url.replace(/^https?:\/\/[^/]*\/?/, '');
  return path.startsWith('Seans/') ? path : `Seans/${path}`;
};

/** Участники для списка: владелец, администраторы, затем остальные (в сети выше), внутри — по алфавиту */
export function sortedMembers(g: GroupInfo): Member[] {
  const rank = (m: Member) => (m.role === 'owner' ? 0 : m.role === 'admin' ? 1 : 2) * 2 + (m.id === ME || contactOf(m.id)?.online ? 0 : 1);
  return [...g.members].sort((a, b) => rank(a) - rank(b) || nameOf(a.id).localeCompare(nameOf(b.id), 'ru'));
}

// ---------------------------------------------------------------- адрес (@имя)

export type UsernameStatus = 'empty' | 'short' | 'long' | 'invalid' | 'taken' | 'free';
const USERNAME = /^[a-z][a-z0-9_]*$/i;

/** Можно ли занять адрес: 5–32 знака, латиница, цифры и «_», первая буква; не занят другой группой, каналом или человеком */
export function usernameStatus(raw: string, exceptChatId?: string): UsernameStatus {
  const name = raw.trim().replace(/^@/, '');
  if (!name) return 'empty';
  if (!USERNAME.test(name)) return 'invalid';
  if (name.length < 5) return 'short';
  if (name.length > 32) return 'long';
  const lower = name.toLowerCase();
  const taken =
    Object.values(store).some((g) => g.chatId !== exceptChatId && g.username.toLowerCase() === lower) ||
    CONTACTS.some((c) => c.username?.replace(/^@/, '').toLowerCase() === lower);
  return taken ? 'taken' : 'free';
}

export const USERNAME_TEXT: Record<UsernameStatus, string> = {
  empty: 'Адрес: латиница, цифры и «_», от 5 до 32 знаков.',
  short: 'Адрес должен быть не короче 5 знаков.',
  long: 'Адрес должен быть не длиннее 32 знаков.',
  invalid: 'Допустимы латиница, цифры и «_»; первая — буква.',
  taken: 'Этот адрес уже занят.',
  free: 'Адрес свободен.',
};

// ---------------------------------------------------------------- создание

export interface GroupDraft {
  kind: GroupKind;
  name: string;
  description: string;
  photo: string | null;
  members: string[];
  isPublic: boolean;
  username: string;
  /** Код ссылки-приглашения: виден ещё до создания, станет основной ссылкой */
  inviteCode: string;
}

const list = (ids: string[]) => ids.map(nameOf).join(', ');

export function createGroup(d: GroupDraft): string {
  const id = uid('g');
  const name = d.name.trim();
  const now = Date.now();
  const group = d.kind === 'group';
  const g: GroupInfo = {
    chatId: id,
    kind: d.kind,
    name,
    avatar: d.photo ?? initialsAvatar(name, id),
    description: d.description.trim(),
    isPublic: d.isPublic,
    username: d.isPublic ? d.username.trim().replace(/^@/, '') : '',
    members: [member(ME, 'owner'), ...d.members.map((m) => member(m))],
    banned: [],
    permissions: { ...DEFAULT_PERMISSIONS },
    slowMode: 0,
    signatures: false,
    comments: d.kind === 'channel',
    reactions: [...REACTION_CHOICES],
    protectContent: false,
    historyVisible: true,
    joinApproval: false,
    links: [{ ...primaryLink(ME, d.inviteCode || undefined), createdAt: now }],
    requests: [],
    log: [{ id: uid('e'), at: now, actor: ME, text: `Вы создали ${group ? 'общий чат' : 'канал'} «${name}»` }],
    createdAt: now,
  };
  store = { ...store, [id]: g };
  addChat({ id, name, avatar: g.avatar, kind: d.kind, lastMessage: '', time: '', unread: 0 });
  postService(id, `Вы создали ${group ? 'общий чат' : 'канал'} «${name}»`);
  if (group && d.members.length) postService(id, `Вы добавили ${d.members.length === 1 ? 'пользователя' : 'пользователей'}: ${list(d.members)}`);
  emit();
  return id;
}

// ---------------------------------------------------------------- профиль

export function updateInfo(chatId: string, patch: { name?: string; description?: string; photo?: string | null }) {
  const g = store[chatId];
  if (!g) return;
  const word = g.kind === 'group' ? 'общего чата' : 'канала';
  let next = g;
  const name = patch.name?.trim();
  if (name && name !== g.name) {
    // Пока своего фото нет, цветные инициалы следуют за названием
    const avatar = isGenerated(g.avatar) ? initialsAvatar(name, chatId) : g.avatar;
    next = withLog({ ...next, name, avatar }, `Вы изменили название ${word} на «${name}»`);
    patchChat(chatId, { name, avatar });
    note(g, `Вы изменили название ${word} на «${name}»`, true);
  }
  if (patch.description !== undefined && patch.description.trim() !== g.description) {
    const description = patch.description.trim();
    next = withLog({ ...next, description }, description ? `Вы изменили описание ${word}` : `Вы удалили описание ${word}`);
  }
  if (patch.photo !== undefined) {
    const avatar = patch.photo ?? initialsAvatar(next.name, chatId);
    if (avatar !== next.avatar) {
      next = withLog({ ...next, avatar }, patch.photo ? `Вы обновили фото ${word}` : `Вы удалили фото ${word}`);
      patchChat(chatId, { avatar });
      note(g, patch.photo ? `Вы обновили фото ${word}` : `Вы удалили фото ${word}`, true);
    }
  }
  if (next === g) return;
  store = { ...store, [chatId]: next };
  emit();
}

/** Сменить тип: публичный (с адресом @имя) или частный (только по ссылке) */
export function setType(chatId: string, isPublic: boolean, username = '') {
  update(chatId, (g) => {
    const name = username.trim().replace(/^@/, '');
    if (isPublic && usernameStatus(name, chatId) !== 'free') return g;
    const same = g.isPublic === isPublic && g.username === (isPublic ? name : '');
    if (same) return g;
    const what = g.kind === 'group' ? 'общий чат' : 'канал';
    const word = isPublic ? 'публичным' : 'частным';
    return withLog({ ...g, isPublic, username: isPublic ? name : '', joinApproval: isPublic ? g.joinApproval : false }, isPublic ? `Вы сделали ${what} ${word}: @${name}` : `Вы сделали ${what} ${word}`);
  });
}

type Settings = Partial<Pick<GroupInfo, 'signatures' | 'comments' | 'protectContent' | 'historyVisible' | 'slowMode' | 'joinApproval' | 'reactions'>>;
const settingText = (key: keyof Settings, value: unknown): string => {
  switch (key) {
    case 'signatures':
      return value ? 'Вы включили подписи авторов' : 'Вы выключили подписи авторов';
    case 'comments':
      return value ? 'Вы включили комментарии' : 'Вы выключили комментарии';
    case 'protectContent':
      return value ? 'Вы запретили сохранять и пересылать содержимое' : 'Вы разрешили сохранять и пересылать содержимое';
    case 'historyVisible':
      return value ? 'Вы открыли историю для новых пользователей' : 'Вы скрыли историю от новых пользователей';
    case 'slowMode':
      return value ? `Вы включили медленный режим: ${slowLabel(value as number)}` : 'Вы выключили медленный режим';
    case 'joinApproval':
      return value ? 'Вы включили вступление по заявкам' : 'Вы выключили вступление по заявкам';
    case 'reactions':
      return (value as string[]).length ? `Вы изменили разрешённые реакции: ${(value as string[]).join(' ')}` : 'Вы выключили реакции';
  }
};

export function setSetting(chatId: string, patch: Settings) {
  update(chatId, (g) => {
    let next = g;
    (Object.keys(patch) as Array<keyof Settings>).forEach((key) => {
      const value = patch[key];
      if (value === undefined || JSON.stringify(value) === JSON.stringify(g[key])) return;
      next = withLog({ ...next, [key]: value }, settingText(key, value));
    });
    return next;
  });
}

export function setPermissions(chatId: string, patch: Partial<Permissions>) {
  update(chatId, (g) => withLog({ ...g, permissions: { ...g.permissions, ...patch } }, 'Вы изменили разрешения пользователей'));
}

// ---------------------------------------------------------------- участники

export function addMembers(chatId: string, ids: string[]) {
  const g = store[chatId];
  if (!g) return;
  const fresh = ids.filter((id) => !memberOf(g, id) && !g.banned.includes(id));
  if (!fresh.length) return;
  const text = `Вы добавили ${fresh.length === 1 ? (g.kind === 'group' ? 'пользователя' : 'подписчика') : g.kind === 'group' ? 'пользователей' : 'подписчиков'}: ${list(fresh)}`;
  update(chatId, (x) => withLog({ ...x, members: [...x.members, ...fresh.map((id) => member(id))] }, text));
  note(g, text);
}

/** Убрать человека из группы; с блокировкой он не сможет вернуться по ссылке */
export function removeMember(chatId: string, id: string, ban = false) {
  const g = store[chatId];
  if (!g || !memberOf(g, id)) return;
  const text = `Вы ${ban ? 'заблокировали' : 'удалили'} ${g.kind === 'group' ? 'пользователя' : 'подписчика'}: ${nameOf(id)}`;
  update(chatId, (x) => withLog({ ...x, members: x.members.filter((m) => m.id !== id), banned: ban ? [...x.banned, id] : x.banned }, text));
  note(g, text);
}

export function unban(chatId: string, id: string) {
  update(chatId, (g) => withLog({ ...g, banned: g.banned.filter((b) => b !== id) }, `Вы разблокировали: ${nameOf(id)}`));
}

/** Запретить обычному участнику писать (или вернуть право) */
export function silenceMember(chatId: string, id: string, silenced: boolean) {
  update(chatId, (g) =>
    withLog({ ...g, members: g.members.map((m) => (m.id === id ? { ...m, silenced: silenced || undefined } : m)) }, `Вы ${silenced ? 'запретили писать' : 'разрешили писать'}: ${nameOf(id)}`),
  );
}

/** Назначить администратором с правами или снять права (rights = null) */
export function setAdmin(chatId: string, id: string, rights: AdminRights | null, title = '', anonymous = false) {
  const g = store[chatId];
  const target = g && memberOf(g, id);
  if (!g || !target || target.role === 'owner') return;
  const text = rights ? (target.role === 'admin' ? `Вы изменили права администратора: ${nameOf(id)}` : `Вы назначили администратором: ${nameOf(id)}`) : `Вы сняли администратора: ${nameOf(id)}`;
  update(chatId, (x) =>
    withLog(
      {
        ...x,
        members: x.members.map((m) =>
          m.id === id ? (rights ? { ...m, role: 'admin', rights, title: title.trim().slice(0, 16) || undefined, anonymous: x.kind === 'group' && anonymous ? true : undefined } : { id: m.id, role: 'member', joinedAt: m.joinedAt }) : m,
        ),
      },
      text,
    ),
  );
  if (!(rights && target.role === 'admin')) note(g, text);
}

// ---------------------------------------------------------------- ссылки-приглашения

export interface LinkOptions {
  name: string;
  expiresAt?: number;
  limit?: number;
  needApproval: boolean;
}

export function createLink(chatId: string, o: LinkOptions): InviteLink | undefined {
  const g = store[chatId];
  if (!g) return undefined;
  const link: InviteLink = { id: uid('l'), code: newCode(), name: o.name.trim().slice(0, 32), primary: false, createdBy: ME, createdAt: Date.now(), expiresAt: o.expiresAt, limit: o.limit, needApproval: o.needApproval, joined: 0, revoked: false };
  update(chatId, (x) => withLog({ ...x, links: [...x.links, link] }, `Вы создали ссылку-приглашение${link.name ? ` «${link.name}»` : ''}`));
  return link;
}

export function editLink(chatId: string, linkId: string, o: LinkOptions) {
  update(chatId, (g) =>
    withLog({ ...g, links: g.links.map((l) => (l.id === linkId ? { ...l, name: o.name.trim().slice(0, 32), expiresAt: o.expiresAt, limit: o.limit, needApproval: o.needApproval } : l)) }, 'Вы изменили ссылку-приглашение'),
  );
}

export function revokeLink(chatId: string, linkId: string) {
  update(chatId, (g) => withLog({ ...g, links: g.links.map((l) => (l.id === linkId ? { ...l, revoked: true } : l)) }, 'Вы отозвали ссылку-приглашение'));
}

export function deleteLink(chatId: string, linkId: string) {
  update(chatId, (g) => ({ ...g, links: g.links.filter((l) => l.id !== linkId || !l.revoked) }));
}

/** Сбросить основную ссылку: прежняя отзывается, вместо неё появляется новая */
export function resetPrimaryLink(chatId: string): InviteLink | undefined {
  const g = store[chatId];
  if (!g) return undefined;
  const fresh = primaryLink(ME);
  fresh.createdAt = Date.now();
  update(chatId, (x) => withLog({ ...x, links: [...x.links.map((l) => (l.primary ? { ...l, primary: false, revoked: true } : l)), fresh] }, 'Вы сбросили основную ссылку-приглашение'));
  return fresh;
}

export const isLinkAlive = (l: InviteLink): boolean => !l.revoked && !(l.expiresAt && l.expiresAt <= Date.now()) && !(l.limit && l.joined >= l.limit);

// ---------------------------------------------------------------- вступление

export type JoinStatus = 'ok' | 'invalid' | 'expired' | 'full' | 'banned';
export interface JoinTarget {
  status: JoinStatus;
  group?: GroupInfo;
  link?: InviteLink;
  /** Вы уже в этой группе */
  member: boolean;
  /** Вступить можно только по заявке */
  needApproval: boolean;
  /** Заявка уже подана */
  pending: boolean;
}

/** Что откроет адрес /join/<код>: код ссылки-приглашения или @адрес публичной группы */
export function lookupJoin(code: string, all: Record<string, GroupInfo> = store): JoinTarget {
  const invalid: JoinTarget = { status: 'invalid', member: false, needApproval: false, pending: false };
  const groups = Object.values(all);
  let group: GroupInfo | undefined;
  let link: InviteLink | undefined;
  if (code.startsWith('@')) {
    const name = code.slice(1).toLowerCase();
    group = groups.find((g) => g.isPublic && g.username.toLowerCase() === name);
  } else {
    for (const g of groups) {
      const l = g.links.find((x) => x.code === code);
      if (l) {
        group = g;
        link = l;
        break;
      }
    }
  }
  if (!group) return invalid;
  const base = { group, link, member: Boolean(myMember(group)), pending: group.requests.some((r) => r.contactId === ME && (!link || r.linkId === link.id || !r.linkId)), needApproval: link ? link.needApproval : group.joinApproval };
  if (group.banned.includes(ME)) return { ...base, status: 'banned' };
  if (link?.revoked) return invalid;
  if (link?.expiresAt && link.expiresAt <= Date.now()) return { ...base, status: 'expired' };
  if (link?.limit && link.joined >= link.limit) return { ...base, status: 'full' };
  return { ...base, status: 'ok' };
}

export function useJoinTarget(code: string): JoinTarget {
  const snapshot = useSyncExternalStore(subscribe, () => store);
  return useMemo(() => lookupJoin(code, snapshot), [code, snapshot]);
}

/** Вы в группе или канале: чат появляется в списке, в переписку попадает служебная запись */
function enter(g: GroupInfo, text: string, via?: InviteLink) {
  update(g.chatId, (x) =>
    withLog(
      {
        ...x,
        members: x.members.some((m) => m.id === ME) ? x.members : [...x.members, member(ME)],
        links: x.links.map((l) => (via && l.id === via.id ? { ...l, joined: l.joined + 1 } : l)),
        requests: x.requests.filter((r) => r.contactId !== ME),
      },
      g.kind === 'group' ? 'Вы вступили в общий чат' : 'Вы подписались на канал',
    ),
  );
  if (!getChat(g.chatId)) {
    addChat({ id: g.chatId, name: g.name, avatar: g.avatar, kind: g.kind, lastMessage: '', time: '', unread: 0 }, JOIN_HISTORY[g.chatId] ?? []);
  }
  if (g.kind === 'group' || !(JOIN_HISTORY[g.chatId] ?? []).length) postService(g.chatId, text);
}

/** Вступить по коду или @адресу. 'requested' — заявка подана, ответ придёт позже (в показе одобряется через несколько секунд) */
export function joinGroup(code: string): 'joined' | 'requested' | 'failed' {
  const t = lookupJoin(code);
  const g = t.group;
  if (!g || t.status !== 'ok') return 'failed';
  if (t.member) return 'joined';
  if (t.needApproval) {
    if (t.pending) return 'requested';
    const request: JoinRequest = { id: uid('r'), contactId: ME, at: Date.now(), linkId: t.link?.id };
    update(g.chatId, (x) => ({ ...x, requests: [...x.requests, request] }));
    window.setTimeout(() => {
      const now = store[g.chatId];
      if (!now || !now.requests.some((r) => r.id === request.id)) return;
      enter(now, g.kind === 'group' ? 'Заявка одобрена: вы вступили в общий чат' : 'Заявка одобрена: вы подписались на канал', t.link);
      markUnread(g.chatId);
    }, 4200);
    return 'requested';
  }
  enter(g, g.kind === 'group' ? 'Вы вступили в общий чат' : 'Вы подписались на канал', t.link);
  return 'joined';
}

/** После одобрения заявки чат в списке отмечен непрочитанным: человек не смотрел на экран, когда это случилось */
function markUnread(chatId: string) {
  patchChat(chatId, { unread: 1 });
}

export function approveRequest(chatId: string, requestId: string) {
  const g = store[chatId];
  const r = g?.requests.find((x) => x.id === requestId);
  if (!g || !r) return;
  const text = `Вы приняли заявку: ${nameOf(r.contactId)}`;
  update(chatId, (x) =>
    withLog({ ...x, requests: x.requests.filter((q) => q.id !== requestId), members: memberOf(x, r.contactId) ? x.members : [...x.members, member(r.contactId)], links: x.links.map((l) => (l.id === r.linkId ? { ...l, joined: l.joined + 1 } : l)) }, text),
  );
  note(g, `В ${g.kind === 'group' ? 'общем чате' : 'канале'} новый ${g.kind === 'group' ? 'пользователь' : 'подписчик'}: ${nameOf(r.contactId)}`);
}

export function declineRequest(chatId: string, requestId: string) {
  const r = store[chatId]?.requests.find((x) => x.id === requestId);
  if (!r) return;
  update(chatId, (x) => withLog({ ...x, requests: x.requests.filter((q) => q.id !== requestId) }, `Вы отклонили заявку: ${nameOf(r.contactId)}`));
}

export function approveAll(chatId: string) {
  (store[chatId]?.requests ?? []).map((r) => r.id).forEach((id) => approveRequest(chatId, id));
}

export function declineAll(chatId: string) {
  (store[chatId]?.requests ?? []).map((r) => r.id).forEach((id) => declineRequest(chatId, id));
}

/** Выйти из группы или канала (у владельца это удаление для всех): чат уходит из списка, остальное делает подписка ниже */
export function leaveGroup(chatId: string) {
  deleteChats([chatId]);
}

onChatsRemoved((gone) => {
  gone.filter((c) => c.kind).forEach((c) => {
    const g = store[c.id];
    if (!g) return;
    if (myRole(g) === 'owner') {
      const { [c.id]: _removed, ...rest } = store;
      store = rest;
    } else {
      store = { ...store, [c.id]: withLog({ ...g, members: g.members.filter((m) => m.id !== ME), requests: g.requests.filter((r) => r.contactId !== ME) }, g.kind === 'group' ? 'Вы покинули общий чат' : 'Вы отписались от канала') };
    }
  });
  emit();
});

// ---------------------------------------------------------------- «живость»: просмотры, ответы, медленный режим

const REPLIES = ['Спасибо, учту.', 'Хорошая мысль.', 'Поддерживаю 👍', 'Давайте обсудим на встрече.', 'Интересно, расскажите подробнее.', 'Принято.', 'Отличный вопрос.', 'Спасибо, что поделились.'];
const lastSent: Record<string, number> = {};

/** Сколько секунд вам ещё ждать до следующего сообщения (медленный режим касается только обычных участников группы) */
export function slowLeft(chatId: string): number {
  const g = store[chatId];
  if (!g || g.kind === 'channel' || !g.slowMode || myRole(g) !== 'member') return 0;
  return Math.max(0, Math.ceil(((lastSent[chatId] ?? 0) + g.slowMode * 1000 - Date.now()) / 1000));
}

export function useSlowLeft(chatId: string): number {
  useSyncExternalStore(subscribe, () => store);
  const [, tick] = useState(0);
  const left = slowLeft(chatId);
  const running = left > 0;
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  return left;
}

registerSendHooks({
  decorate: (chatId) => {
    const g = store[chatId];
    if (g?.kind !== 'channel') return {};
    return { views: 1, ...(g.signatures ? { signature: getProfileName() } : {}) };
  },
  after: (chatId, id, text) => {
    const g = store[chatId];
    if (!g) return;
    if (g.slowMode && myRole(g) === 'member') {
      lastSent[chatId] = Date.now();
      store = { ...store };
      emit();
    }
    if (g.kind === 'channel') {
      // Пост набирает просмотры и реакции подписчиков
      const subs = Math.max(1, g.members.length - 1);
      [[1500, 0.3], [4200, 0.6], [8500, 0.9]].forEach(([delay, share]) =>
        window.setTimeout(() => updateMessage(chatId, id, { views: Math.max(2, Math.round(subs * share)) }), delay),
      );
      if (Math.random() < 0.6 && g.reactions.length) {
        window.setTimeout(() => updateMessage(chatId, id, { counts: { [g.reactions[Math.floor(Math.random() * g.reactions.length)]]: 1 + Math.floor(Math.random() * 3) } }), 6500);
      }
      return;
    }
    // В группе кто-то из участников иногда отвечает
    if (Math.random() > 0.65) return;
    const pool = g.members.filter((m) => m.id !== ME && !m.silenced);
    const online = pool.filter((m) => contactOf(m.id)?.online);
    const from = (online.length ? online : pool)[Math.floor(Math.random() * (online.length ? online.length : pool.length))];
    if (!from || !text) return;
    window.setTimeout(() => {
      const now = store[chatId];
      if (!now || !memberOf(now, from.id) || !getChat(chatId)) return;
      postIncoming(chatId, { text: REPLIES[Math.floor(Math.random() * REPLIES.length)], author: from.id });
    }, 2800 + Math.random() * 2400);
  },
});

