import { DIRECTORY, ME } from './people';
import { TONES, type ToneId } from './tones';

/*
 * Группы и значки. Группа — небольшое объединение специалистов: у неё есть значок (эмодзи на цветной плитке), участники и канал.
 * Значок группы показывается рядом с именем только у принятых участников; нажатие на него открывает группу, где видно, кто в ней.
 * Здесь типы, правила и тестовые группы (все названия, люди и тексты придуманы). Состояние и действия — в groupStore.ts.
 */

export type JoinMode = 'open' | 'request' | 'invite';
/** Кто читает канал группы: все (даже не участники) или только участники — решает создатель */
export type ChannelAccess = 'public' | 'members';
/** Кому виден значок рядом с именем: всем, только коллегам или только клиентам владельца значка */
export type Audience = 'all' | 'peers' | 'clients';
export type MemberRole = 'owner' | 'admin' | 'member';

export interface Emblem {
  emoji: string;
  tone: ToneId;
}

export interface Group {
  id: string;
  name: string;
  emblem: Emblem;
  about: string;
  /** Город группы; пустой — группа без города (онлайн) */
  city: string;
  join: JoinMode;
  channel: ChannelAccess;
  owner: string;
  createdAt: number;
  /** Группа придумана для показа */
  test?: boolean;
}

/** Что человек выбирает при вступлении: видно ли его значок и строку в списке участников, и кому именно */
export interface Flags {
  showEmblem: boolean;
  listed: boolean;
  audience: Audience;
}

export interface Membership extends Flags {
  groupId: string;
  personId: string;
  role: MemberRole;
  since: number;
}

/** Заявка на вступление: флаги человек выбрал заранее, они станут флагами участника, когда заявку примут */
export interface JoinRequest {
  id: string;
  groupId: string;
  personId: string;
  at: number;
  flags: Flags;
}

/** Приглашение в группу: `in` — зовут вас (карточка в чате пригласившего), `out` — зовёте вы */
export interface GroupInvite {
  id: string;
  groupId: string;
  /** Чат, где лежит карточка приглашения: чат пригласившего (in) или приглашённого (out) */
  chatId: string;
  /** Приглашённый */
  personId: string;
  by: string;
  dir: 'in' | 'out';
  state: 'pending' | 'accepted' | 'declined' | 'revoked';
  at: number;
  answeredAt?: number;
}

export interface Post {
  id: string;
  groupId: string;
  author: string;
  at: number;
  text: string;
}

/** Статус доступности: эмодзи и короткий текст; по истечении срока сам исчезает */
export interface Status {
  emoji: string;
  text: string;
  until?: number;
}

export interface GroupsState {
  groups: Group[];
  members: Membership[];
  requests: JoinRequest[];
  invites: GroupInvite[];
  posts: Post[];
  status?: Status;
}

export const DEFAULT_FLAGS: Flags = { showEmblem: true, listed: true, audience: 'all' };

export const NAME_MAX = 40;
export const ABOUT_MAX = 280;
export const CITY_MAX = 40;
export const POST_MAX = 1000;

export const JOIN_LABEL: Record<JoinMode, string> = {
  open: 'Свободное вступление',
  request: 'Вступление по заявке',
  invite: 'Только по приглашению',
};

export const CHANNEL_LABEL: Record<ChannelAccess, string> = {
  public: 'Канал открыт всем',
  members: 'Канал читают только участники',
};

export const AUDIENCE_LABEL: Record<Audience, string> = {
  all: 'Всем',
  peers: 'Коллегам',
  clients: 'Моим клиентам',
};

export const ROLE_LABEL: Record<MemberRole, string> = {
  owner: 'Владелец',
  admin: 'Администратор',
  member: 'Участник',
};

/** Эмодзи для значка: знаки, подходящие объединениям специалистов; любой другой можно взять из полной панели */
export const EMBLEM_EMOJIS = [
  '🧠', '🛋️', '🧩', '🪞', '💬', '🤝', '🫶', '🕯️',
  '🌿', '🌲', '🌊', '🔥', '⭐', '🌙', '☀️', '🌈',
  '🎓', '📚', '🔭', '🧭', '⚓', '🗝️', '💡', '🪴',
  '🧸', '🕊️', '🦉', '🦋', '🐝', '🐋', '🦊', '🪁',
  '🌸', '🍀', '🏔️', '🌅', '🎭', '🎨', '🎯', '🚀',
];

/** Цвета значка — те же 16, что у шапок заметок и папок */
export const EMBLEM_TONES = TONES;

const strip = (s: string) => s.replace(/️/g, '');

/** Один и тот же значок: эмодзи (без варианта начертания) и цвет */
export const sameEmblem = (a: Emblem, b: Emblem): boolean => strip(a.emoji) === strip(b.emoji) && a.tone === b.tone;

/** Группа, у которой уже такой значок: пара «эмодзи и цвет» уникальна, поэтому два круга с одним эмодзи различаются цветом */
export const emblemOwner = (groups: readonly Group[], emblem: Emblem, exceptId?: string): Group | undefined =>
  groups.find((g) => g.id !== exceptId && sameEmblem(g.emblem, emblem));

export const nameTaken = (groups: readonly Group[], name: string, exceptId?: string): boolean => {
  const key = name.trim().toLocaleLowerCase('ru-RU');
  return groups.some((g) => g.id !== exceptId && g.name.trim().toLocaleLowerCase('ru-RU') === key);
};

/** Первый свободный значок: подставляется в окно новой группы, чтобы «Создать» не упиралось в занятую пару */
export function freeEmblem(groups: readonly Group[]): Emblem {
  const order: ToneId[] = ['blue', 'mint', 'purple', 'orange', 'pink', 'green', 'teal', 'slate', 'coral', 'yellow', 'magenta', 'cyan', 'lime', 'red', 'brown', 'gray'];
  for (const tone of order) {
    for (const emoji of EMBLEM_EMOJIS) {
      if (!emblemOwner(groups, { emoji, tone })) return { emoji, tone };
    }
  }
  return { emoji: EMBLEM_EMOJIS[0], tone: 'blue' };
}

export const membership = (members: readonly Membership[], groupId: string, personId: string): Membership | undefined =>
  members.find((m) => m.groupId === groupId && m.personId === personId);

/** Писать в канал могут владелец и администраторы */
export const canPost = (members: readonly Membership[], groupId: string, personId: string): boolean => {
  const role = membership(members, groupId, personId)?.role;
  return role === 'owner' || role === 'admin';
};

/** Канал читают все или только участники — как решил создатель */
export const canRead = (group: Group, members: readonly Membership[], personId: string): boolean =>
  group.channel === 'public' || membership(members, group.id, personId) !== undefined;

/** Участники в списке: те, кто согласился быть в списке; вы видите себя всегда. Владелец и администраторы первыми */
export function listedMembers(members: readonly Membership[], groupId: string): Membership[] {
  const rank = (m: Membership) => (m.role === 'owner' ? 0 : m.role === 'admin' ? 1 : m.personId === ME ? 2 : 3);
  return members
    .filter((m) => m.groupId === groupId && (m.listed || m.personId === ME))
    .sort((a, b) => rank(a) - rank(b) || a.since - b.since);
}

/** Сколько человек в группе (скрытые из списка тоже участники) */
export const memberCount = (members: readonly Membership[], groupId: string): number => members.filter((m) => m.groupId === groupId).length;

export interface EmblemOf {
  group: Group;
  membership: Membership;
}

/**
 * Значки рядом с именем человека, как их видите вы. Чужой значок виден, если человек разрешил его показывать и не оставил только для своих
 * клиентов (вы смотрите как коллега). Свои значки вы видите все. Старые участники первыми.
 */
export function visibleEmblems(groups: readonly Group[], members: readonly Membership[], personId: string): EmblemOf[] {
  const out: EmblemOf[] = [];
  for (const m of members) {
    if (m.personId !== personId || !m.showEmblem) continue;
    if (personId !== ME && m.audience === 'clients') continue;
    const group = groups.find((g) => g.id === m.groupId);
    if (group) out.push({ group, membership: m });
  }
  return out.sort((a, b) => a.membership.since - b.membership.since);
}

/** Человек есть в чьём-то списке участников (иначе по значкам и названиям группы его не находят) */
export const isFindable = (members: readonly Membership[], personId: string): boolean => members.some((m) => m.personId === personId && m.listed);

/** Знаки эмодзи без вариантов начертания: «🛋️» и «🛋» считаются одним и тем же */
export const plainEmoji = strip;

/**
 * Группы под запрос: по названию, городу и по значку (запрос из одного эмодзи). Описание не ищется: по слову из описания («владельца») находились бы
 * группы, о которых человек не спрашивал. Пустой запрос находит все
 */
export function searchGroups(groups: readonly Group[], query: string): Group[] {
  const q = strip(query.trim().toLocaleLowerCase('ru-RU'));
  if (!q) return [...groups];
  return groups.filter((g) => {
    const text = `${g.name} ${g.city}`.toLocaleLowerCase('ru-RU');
    return text.includes(q) || strip(g.emblem.emoji).includes(q) || q.includes(strip(g.emblem.emoji));
  });
}

/** «сегодня, 14:05», «вчера, 09:30», «18 октября» */
export function whenLabel(at: number, now: number = Date.now()): string {
  const d = new Date(at);
  const n = new Date(now);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(n) - day(d)) / 86_400_000);
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (diff === 0) return `сегодня, ${time}`;
  if (diff === 1) return `вчера, ${time}`;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

// ——— Тестовые группы ———

const H = 3_600_000;
const D = 24 * H;

/** Версия тестовых данных: сменилась — сохранённое состояние из прошлой версии отбрасывается и начинается с примера */
export const SEED_VERSION = 1;

export function seedState(now: number = Date.now()): GroupsState {
  const group = (id: string, name: string, emblem: Emblem, about: string, city: string, join: JoinMode, channel: ChannelAccess, owner: string, ageDays: number): Group => ({
    id,
    name,
    emblem,
    about,
    city,
    join,
    channel,
    owner,
    createdAt: now - ageDays * D,
    test: true,
  });
  const groups: Group[] = [
    group('nsk-psa', 'Новосибирский круг психоаналитиков', { emoji: '🛋️', tone: 'purple' }, 'Клинические чтения, разборы случаев и открытые встречи для практикующих психоаналитиков Новосибирска. Встречи по вторникам, очно и онлайн.', 'Новосибирск', 'request', 'public', 'marina', 420),
    group('kpt-lab', 'КПТ-практикум', { emoji: '🧩', tone: 'mint' }, 'Практикум по когнитивно-поведенческой терапии: поведенческие эксперименты, работа с убеждениями, разборы случаев. Онлайн, по четвергам.', '', 'open', 'members', 'bogdan', 150),
    group('ural-intervision', 'Интервизия Урала', { emoji: '🌲', tone: 'green' }, 'Закрытый круг специалистов Урала: интервизии раз в две недели, один случай на встречу. Присоединиться можно по заявке.', 'Екатеринбург', 'request', 'members', ME, 90),
    group('msk-intervision', 'Московские интервизии', { emoji: '🧭', tone: 'blue' }, 'Малый круг для интервизий в Москве. Вступление по приглашению владельца.', 'Москва', 'invite', 'members', 'vladislav', 200),
    group('class-2026', 'Выпуск 2026 · клиническая психология', { emoji: '🎓', tone: 'orange' }, 'Выпускники 2026 года: контакты, новости программ и встречи выпуска.', 'Санкт-Петербург', 'open', 'public', 'yulia', 60),
    group('kids', 'Детские психологи: практика', { emoji: '🧸', tone: 'pink' }, 'Практика работы с детьми, подростками и их родителями: разборы, материалы, обмен опытом.', 'Москва', 'request', 'members', 'natalia', 300),
  ];

  const member = (groupId: string, personId: string, ageDays: number, role: MemberRole = 'member', flags: Partial<Flags> = {}): Membership => ({
    groupId,
    personId,
    role,
    since: now - ageDays * D,
    ...DEFAULT_FLAGS,
    ...flags,
  });
  const members: Membership[] = [
    member('nsk-psa', 'marina', 420, 'owner'),
    member('nsk-psa', 'pavel', 400, 'admin'),
    member('nsk-psa', 'irina', 380),
    member('nsk-psa', 'vasilisa', 120),
    member('kpt-lab', 'bogdan', 150, 'owner'),
    member('kpt-lab', 'vladislav', 140),
    member('kpt-lab', 'timur', 100),
    member('kpt-lab', 'anton', 80),
    member('kpt-lab', 'denis', 70, 'member', { showEmblem: false }),
    member('kpt-lab', ME, 40),
    member('ural-intervision', ME, 90, 'owner'),
    member('ural-intervision', 'elena', 85),
    member('ural-intervision', 'sergey', 70),
    member('ural-intervision', 'olga', 60),
    member('msk-intervision', 'vladislav', 200, 'owner'),
    member('msk-intervision', 'anton', 190),
    member('msk-intervision', 'natalia', 170),
    member('msk-intervision', 'leonid', 160),
    member('class-2026', 'yulia', 60, 'owner'),
    member('class-2026', 'kirill', 55),
    member('class-2026', 'denis', 50),
    member('class-2026', 'vasilisa', 45),
    member('kids', 'natalia', 300, 'owner'),
    member('kids', 'olga', 250),
    member('kids', 'elena', 200),
  ];

  const requests: JoinRequest[] = [
    { id: 'req-timur', groupId: 'ural-intervision', personId: 'timur', at: now - 5 * H, flags: DEFAULT_FLAGS },
    { id: 'req-yulia', groupId: 'ural-intervision', personId: 'yulia', at: now - 1 * D, flags: DEFAULT_FLAGS },
  ];

  // Владислав зовёт в «Московские интервизии»: карточка лежит в его чате (messages.ts)
  const invites: GroupInvite[] = [{ id: 'ginv-vladislav', groupId: 'msk-intervision', chatId: 'vladislav', personId: ME, by: 'vladislav', dir: 'in', state: 'pending', at: now - 3 * H }];

  const post = (id: string, groupId: string, author: string, ago: number, text: string): Post => ({ id, groupId, author, at: now - ago, text });
  const posts: Post[] = [
    post('p1', 'nsk-psa', 'marina', 2 * D, 'Открываем сезон. Встречи круга по вторникам в 19:00, очно в Новосибирске и онлайн. Первая тема: перенос в коротких терапиях.'),
    post('p2', 'nsk-psa', 'pavel', 5 * H, 'Напоминаем: до пятницы ждём случаи для разбора. Присылайте их администратору в личные сообщения, без имён и подробностей, по которым можно узнать человека.'),
    post('p3', 'kpt-lab', 'bogdan', 1 * D, 'Материалы третьего занятия в общей папке: шкала убеждений и бланк поведенческого эксперимента. В четверг разбираем эксперименты на ваших примерах.'),
    post('p4', 'kpt-lab', 'bogdan', 6 * D, 'Запись на практикум открыта, осталось несколько мест в онлайн-группе.'),
    post('p5', 'ural-intervision', ME, 3 * D, 'Ближайшая интервизия в четверг, 19:30 по Екатеринбургу. Присылайте случаи за два дня до встречи.'),
    post('p6', 'msk-intervision', 'vladislav', 4 * D, 'Формат встречи: один случай, 40 минут разбор и 20 минут обсуждение. Кто хочет принести случай, напишите мне.'),
    post('p7', 'class-2026', 'yulia', 2 * D, 'Выпускники 2026, собираем контакты и планируем встречу в декабре. Пишите, какой день вам удобнее.'),
    post('p8', 'kids', 'natalia', 3 * D, 'В этом месяце обсуждаем работу с родителями подростков. Вопросы и случаи пишите в канал, разберём на встрече.'),
  ];

  return { groups, members, requests, invites, posts };
}

/** Каждый человек из каталога состоит хотя бы в одной тестовой группе: иначе по значкам его не найти (проверяется тестами) */
export const DIRECTORY_IDS = Object.keys(DIRECTORY);
