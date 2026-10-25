import { useMemo, useSyncExternalStore } from 'react';
import type { Chat } from './chats';
import { ensureChat, getChats, onChatsRemoved, postRoleMessage } from './chatStore';
import {
  ABOUT_MAX,
  CITY_MAX,
  DEFAULT_FLAGS,
  EMBLEM_TONES,
  NAME_MAX,
  POST_MAX,
  SEED_VERSION,
  canPost,
  emblemOwner,
  isFindable,
  membership,
  memberCount,
  nameTaken,
  plainEmoji,
  seedState,
  visibleEmblems,
  type ChannelAccess,
  type Emblem,
  type EmblemOf,
  type Flags,
  type Group,
  type GroupInvite,
  type GroupsState,
  type JoinMode,
  type JoinRequest,
  type Membership,
  type MemberRole,
  type Post,
  type Status,
} from './groups';
import { DIRECTORY, ME, personOf, type Person } from './people';
import { liveStatus, seedStatuses, STATUS_TEXT_MAX } from './status';
import { useNow } from '../utils/useNow';

/*
 * Состояние групп: сами группы, участники, заявки, приглашения, записи каналов и ваш статус. Всё, что вы создали или выбрали, хранится
 * в localStorage целиком вместе с тестовыми группами (версия тестовых данных в SEED_VERSION: сменилась — начинаем с примера).
 * Серверной части нет: ответ второй стороны (владельца на заявку, приглашённого на приглашение) даёт тот, кто смотрит, кнопкой «Демо».
 * Зависит от chatStore (карточки приглашений в чатах), обратной зависимости быть не должно.
 */

const STORAGE_KEY = 'seans.groups.v1';

// ——— Загрузка и сохранение ———

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown, max = 2000): string | null => (typeof v === 'string' ? v.slice(0, max) : null);
const int = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const pick = <T extends string>(v: unknown, list: readonly T[]): T | null => (typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : null);

const AUDIENCES = ['all', 'peers', 'clients'] as const;
const JOINS = ['open', 'request', 'invite'] as const;
const CHANNELS = ['public', 'members'] as const;
const ROLES = ['owner', 'admin', 'member'] as const;
const INVITE_STATES = ['pending', 'accepted', 'declined', 'revoked'] as const;
const TONE_IDS = EMBLEM_TONES.map((t) => t.id);

function cleanFlags(v: unknown): Flags {
  const f = isObj(v) ? v : {};
  return { showEmblem: f.showEmblem !== false, listed: f.listed !== false, audience: pick(f.audience, AUDIENCES) ?? 'all' };
}

function cleanGroup(v: unknown): Group | null {
  if (!isObj(v) || !isObj(v.emblem)) return null;
  const id = text(v.id, 80);
  const name = text(v.name, NAME_MAX);
  const emoji = text(v.emblem.emoji, 16);
  const tone = pick(v.emblem.tone, TONE_IDS);
  const owner = text(v.owner, 80);
  const join = pick(v.join, JOINS);
  const channel = pick(v.channel, CHANNELS);
  const createdAt = int(v.createdAt);
  if (!id || !name || !emoji || !tone || !owner || !join || !channel || createdAt === null) return null;
  return { id, name, emblem: { emoji, tone }, about: text(v.about, ABOUT_MAX) ?? '', city: text(v.city, CITY_MAX) ?? '', join, channel, owner, createdAt, ...(v.test === true && { test: true }) };
}

function cleanMembership(v: unknown): Membership | null {
  if (!isObj(v)) return null;
  const groupId = text(v.groupId, 80);
  const personId = text(v.personId, 80);
  const role = pick(v.role, ROLES);
  const since = int(v.since);
  if (!groupId || !personId || !role || since === null) return null;
  return { groupId, personId, role, since, ...cleanFlags(v) };
}

function cleanRequest(v: unknown): JoinRequest | null {
  if (!isObj(v)) return null;
  const id = text(v.id, 80);
  const groupId = text(v.groupId, 80);
  const personId = text(v.personId, 80);
  const at = int(v.at);
  if (!id || !groupId || !personId || at === null) return null;
  return { id, groupId, personId, at, flags: cleanFlags(v.flags) };
}

function cleanInvite(v: unknown): GroupInvite | null {
  if (!isObj(v)) return null;
  const id = text(v.id, 80);
  const groupId = text(v.groupId, 80);
  const chatId = text(v.chatId, 80);
  const personId = text(v.personId, 80);
  const by = text(v.by, 80);
  const dir = pick(v.dir, ['in', 'out'] as const);
  const st = pick(v.state, INVITE_STATES);
  const at = int(v.at);
  if (!id || !groupId || !chatId || !personId || !by || !dir || !st || at === null) return null;
  const answeredAt = int(v.answeredAt);
  return { id, groupId, chatId, personId, by, dir, state: st, at, ...(answeredAt !== null && { answeredAt }) };
}

function cleanPost(v: unknown): Post | null {
  if (!isObj(v)) return null;
  const id = text(v.id, 80);
  const groupId = text(v.groupId, 80);
  const author = text(v.author, 80);
  const body = text(v.text, POST_MAX);
  const at = int(v.at);
  if (!id || !groupId || !author || !body || at === null) return null;
  return { id, groupId, author, at, text: body };
}

function cleanStatus(v: unknown): Status | undefined {
  if (!isObj(v)) return undefined;
  const emoji = text(v.emoji, 16);
  const label = text(v.text, STATUS_TEXT_MAX);
  if (!emoji || !label) return undefined;
  const until = int(v.until);
  return { emoji, text: label, ...(until !== null && { until }) };
}

const list = <T>(v: unknown, clean: (item: unknown) => T | null): T[] => (Array.isArray(v) ? v.flatMap((item) => clean(item) ?? []) : []);

/** Сохранённое могло испортиться (правили руками, старая версия): берём то, что похоже на правду, остальное отбрасываем */
export function sanitize(raw: unknown): GroupsState | null {
  if (!isObj(raw)) return null;
  const groups = list(raw.groups, cleanGroup);
  const ids = new Set(groups.map((g) => g.id));
  const members = list(raw.members, cleanMembership).filter((m) => ids.has(m.groupId));
  // Группа без владельца среди участников никем не управляется: такая не нужна
  const alive = groups.filter((g) => members.some((m) => m.groupId === g.id && m.personId === g.owner && m.role === 'owner'));
  if (alive.length === 0) return null;
  const known = new Set(alive.map((g) => g.id));
  const status = cleanStatus(raw.status);
  return {
    groups: alive,
    members: members.filter((m) => known.has(m.groupId)),
    requests: list(raw.requests, cleanRequest).filter((r) => known.has(r.groupId)),
    invites: list(raw.invites, cleanInvite).filter((i) => known.has(i.groupId)),
    posts: list(raw.posts, cleanPost).filter((p) => known.has(p.groupId)),
    ...(status && { status }),
  };
}

function load(): GroupsState {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      if (isObj(saved) && saved.seed === SEED_VERSION) {
        const state = sanitize(saved.state);
        if (state) return state;
      }
    }
  } catch {
    // Хранилище закрыто или запись повреждена: начинаем с примера
  }
  return seedState();
}

function save() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify({ seed: SEED_VERSION, state }));
  } catch {
    // Хранилище закрыто: группы живут до перезагрузки
  }
}

// ——— Хранилище ———

let state: GroupsState = load();
/** Статусы других людей: тестовые, меняться не могут */
const others = seedStatuses(Date.now());
let seq = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(++seq).toString(36)}`;

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

function commit(next: GroupsState) {
  state = next;
  save();
  listeners.forEach((cb) => cb());
}

/** Удалили чат — приглашения, карточки которых лежали в нём, уходят вместе с ним */
onChatsRemoved((ids) => {
  if (state.invites.some((i) => ids.includes(i.chatId))) commit({ ...state, invites: state.invites.filter((i) => !ids.includes(i.chatId)) });
});

export const getGroupsState = (): GroupsState => state;
export const getGroup = (id: string): Group | undefined => state.groups.find((g) => g.id === id);

export function useGroupsState(): GroupsState {
  return useSyncExternalStore(subscribe, () => state);
}

export function useGroup(id: string): Group | undefined {
  return useGroupsState().groups.find((g) => g.id === id);
}

/** Значки человека, как их видите вы (до трёх на строке показывает экран) */
export function useEmblems(personId: string): EmblemOf[] {
  const { groups, members } = useGroupsState();
  return useMemo(() => visibleEmblems(groups, members, personId), [groups, members, personId]);
}

export function useGroupInvite(id: string): GroupInvite | undefined {
  return useGroupsState().invites.find((i) => i.id === id);
}

/** Статус человека, пока не вышел срок; сам исчезает без перезагрузки */
export function useStatus(personId: string): Status | undefined {
  const s = useGroupsState();
  const now = useNow(30_000).getTime();
  return liveStatus(personId === ME ? s.status : others[personId], now);
}

// ——— Группы ———

export interface GroupInput {
  name: string;
  about: string;
  city: string;
  emblem: Emblem;
  join: JoinMode;
  channel: ChannelAccess;
}

export type GroupError = 'name' | 'name-taken' | 'emblem' | 'emblem-taken';

/** Что мешает сохранить группу с такими данными; `exceptId` — сама редактируемая группа */
export function validateGroup(input: GroupInput, exceptId?: string): GroupError | null {
  const name = input.name.trim();
  if (name.length < 2) return 'name';
  if (nameTaken(state.groups, name, exceptId)) return 'name-taken';
  if (!input.emblem.emoji.trim()) return 'emblem';
  if (emblemOwner(state.groups, input.emblem, exceptId)) return 'emblem-taken';
  return null;
}

const clean = (input: GroupInput) => ({
  name: input.name.trim().slice(0, NAME_MAX),
  about: input.about.trim().slice(0, ABOUT_MAX),
  city: input.city.trim().slice(0, CITY_MAX),
  emblem: { emoji: input.emblem.emoji, tone: input.emblem.tone },
  join: input.join,
  channel: input.channel,
});

/** Группу может создать кто угодно: создатель становится владельцем и сразу её участником */
export function createGroup(input: GroupInput): { ok: true; group: Group } | { ok: false; error: GroupError } {
  const error = validateGroup(input);
  if (error) return { ok: false, error };
  const now = Date.now();
  const group: Group = { id: newId('g'), ...clean(input), owner: ME, createdAt: now };
  commit({ ...state, groups: [...state.groups, group], members: [...state.members, { groupId: group.id, personId: ME, role: 'owner', since: now, ...DEFAULT_FLAGS }] });
  return { ok: true, group };
}

/** Менять группу может только владелец */
export function updateGroup(id: string, input: GroupInput): GroupError | 'forbidden' | null {
  const group = getGroup(id);
  if (!group || group.owner !== ME) return 'forbidden';
  const error = validateGroup(input, id);
  if (error) return error;
  commit({ ...state, groups: state.groups.map((g) => (g.id === id ? { ...g, ...clean(input) } : g)) });
  return null;
}

/** Удалить группу может только владелец: вместе с ней уходят участники, заявки, приглашения и записи канала */
export function deleteGroup(id: string): boolean {
  const group = getGroup(id);
  if (!group || group.owner !== ME) return false;
  commit({
    groups: state.groups.filter((g) => g.id !== id),
    members: state.members.filter((m) => m.groupId !== id),
    requests: state.requests.filter((r) => r.groupId !== id),
    invites: state.invites.filter((i) => i.groupId !== id),
    posts: state.posts.filter((p) => p.groupId !== id),
    ...(state.status && { status: state.status }),
  });
  return true;
}

// ——— Вступление ———

export type JoinResult = 'ok' | 'requested' | 'member' | 'pending' | 'invite-only' | 'missing';

const addMember = (s: GroupsState, groupId: string, personId: string, flags: Flags, role: MemberRole = 'member'): GroupsState =>
  membership(s.members, groupId, personId) ? s : { ...s, members: [...s.members, { groupId, personId, role, since: Date.now(), ...flags }] };

/** Вступить самому: в открытую группу сразу, в группу по заявке — заявкой, в закрытую нельзя */
export function joinGroup(groupId: string, flags: Flags): JoinResult {
  const group = getGroup(groupId);
  if (!group) return 'missing';
  if (membership(state.members, groupId, ME)) return 'member';
  if (group.join === 'invite') return 'invite-only';
  if (group.join === 'open') {
    commit({ ...addMember(state, groupId, ME, flags), requests: state.requests.filter((r) => !(r.groupId === groupId && r.personId === ME)) });
    return 'ok';
  }
  if (state.requests.some((r) => r.groupId === groupId && r.personId === ME)) return 'pending';
  commit({ ...state, requests: [...state.requests, { id: newId('req'), groupId, personId: ME, at: Date.now(), flags }] });
  return 'requested';
}

export function cancelRequest(groupId: string) {
  if (state.requests.some((r) => r.groupId === groupId && r.personId === ME)) commit({ ...state, requests: state.requests.filter((r) => !(r.groupId === groupId && r.personId === ME)) });
}

/** Ответ на заявку: принять — человек становится участником с теми флагами, что выбрал; отклонить — заявка исчезает. Отвечает владелец или администратор */
export function answerRequest(requestId: string, accept: boolean): boolean {
  const req = state.requests.find((r) => r.id === requestId);
  if (!req) return false;
  const rest = { ...state, requests: state.requests.filter((r) => r.id !== requestId) };
  commit(accept ? addMember(rest, req.groupId, req.personId, req.flags) : rest);
  return true;
}

/** Выйти из группы; владелец выйти не может, её можно только удалить */
export function leaveGroup(groupId: string): 'ok' | 'owner' | 'missing' {
  const mine = membership(state.members, groupId, ME);
  if (!mine) return 'missing';
  if (mine.role === 'owner') return 'owner';
  commit({ ...state, members: state.members.filter((m) => m !== mine) });
  return 'ok';
}

/** Изменить, что другие видят о вас в этой группе */
export function setMyFlags(groupId: string, patch: Partial<Flags>) {
  const mine = membership(state.members, groupId, ME);
  if (!mine) return;
  commit({ ...state, members: state.members.map((m) => (m === mine ? { ...m, ...patch } : m)) });
}

// ——— Канал ———

export function publish(groupId: string, body: string): 'ok' | 'empty' | 'forbidden' {
  if (!getGroup(groupId) || !canPost(state.members, groupId, ME)) return 'forbidden';
  const clean = body.trim().slice(0, POST_MAX);
  if (!clean) return 'empty';
  commit({ ...state, posts: [...state.posts, { id: newId('post'), groupId, author: ME, at: Date.now(), text: clean }] });
  return 'ok';
}

/** Запись убирает её автор или владелец группы */
export function deletePost(postId: string): boolean {
  const post = state.posts.find((p) => p.id === postId);
  const group = post && getGroup(post.groupId);
  if (!post || !group || (post.author !== ME && group.owner !== ME)) return false;
  commit({ ...state, posts: state.posts.filter((p) => p !== post) });
  return true;
}

// ——— Приглашения ———

/** Строка по центру ленты чата */
const say = (chatId: string, line: string) => postRoleMessage(chatId, { from: 'them', text: line, system: true });

/**
 * Позвать человека в группу: в его чате (если чата нет, он заводится) появляется карточка приглашения.
 * Звать могут владелец и администраторы; уже участника и уже приглашённого позвать нельзя.
 */
export function inviteToGroup(groupId: string, personId: string): 'ok' | 'member' | 'pending' | 'forbidden' | 'missing' {
  const group = getGroup(groupId);
  if (!group) return 'missing';
  if (!canPost(state.members, groupId, ME)) return 'forbidden';
  if (membership(state.members, groupId, personId)) return 'member';
  if (state.invites.some((i) => i.groupId === groupId && i.personId === personId && i.state === 'pending')) return 'pending';
  const person = personOf(personId, getChats());
  if (!person) return 'missing';
  ensureChat({ id: person.id, name: person.name, avatar: person.avatar });
  const invite: GroupInvite = { id: newId('ginv'), groupId, chatId: person.id, personId, by: ME, dir: 'out', state: 'pending', at: Date.now() };
  commit({ ...state, invites: [...state.invites, invite] });
  postRoleMessage(person.id, { from: 'me', text: `Приглашение в группу «${group.name}»`, groupInvite: invite.id });
  return 'ok';
}

export function revokeGroupInvite(id: string) {
  const invite = state.invites.find((i) => i.id === id);
  if (!invite || invite.state !== 'pending' || invite.dir !== 'out') return;
  const group = getGroup(invite.groupId);
  commit({ ...state, invites: state.invites.map((i) => (i === invite ? { ...i, state: 'revoked', answeredAt: Date.now() } : i)) });
  say(invite.chatId, `Приглашение в группу «${group?.name ?? ''}» отозвано`);
}

/**
 * Ответ на приглашение: ваш (звали вас) или собеседника (звали вы, а ответ даёт кнопка «Демо»).
 * Согласие делает приглашённого участником; флаги выбирает тот, кто согласился.
 */
export function answerGroupInvite(id: string, accept: boolean, flags: Flags = DEFAULT_FLAGS): boolean {
  const invite = state.invites.find((i) => i.id === id);
  if (!invite || invite.state !== 'pending') return false;
  const group = getGroup(invite.groupId);
  const answered: GroupInvite = { ...invite, state: accept ? 'accepted' : 'declined', answeredAt: Date.now() };
  const next = { ...state, invites: state.invites.map((i) => (i === invite ? answered : i)) };
  commit(accept && group ? addMember(next, invite.groupId, invite.personId, flags) : next);
  const name = group?.name ?? '';
  if (invite.dir === 'in') say(invite.chatId, accept ? `Вы вступили в группу «${name}»` : `Вы отклонили приглашение в группу «${name}»`);
  else say(invite.chatId, accept ? `Приглашение в группу «${name}» принято` : `Приглашение в группу «${name}» отклонено`);
  return true;
}

// ——— Статус ———

export function setMyStatus(status: Status | undefined) {
  const label = status?.text.trim().slice(0, STATUS_TEXT_MAX);
  if (!status || !label || !status.emoji) {
    if (state.status) {
      const { status: _gone, ...rest } = state;
      commit(rest);
    }
    return;
  }
  commit({ ...state, status: { emoji: status.emoji, text: label, ...(status.until !== undefined && { until: status.until }) } });
}

// ——— Поиск ———

export interface PersonHit {
  person: Person;
  emblems: EmblemOf[];
}

/**
 * Люди под запрос: по имени, подписи, городу, названию и значку их групп. Находятся только те, кто согласился быть в списке участников
 * хотя бы одной группы; вы сами и пустой запрос не находятся. Чат с человеком не обязателен.
 */
export function findPeople(s: GroupsState, chats: readonly Chat[], query: string): PersonHit[] {
  const q = plainEmoji(query.trim().toLocaleLowerCase('ru-RU'));
  if (!q) return [];
  const ids = [...new Set(s.members.map((m) => m.personId))].filter((id) => id !== ME && isFindable(s.members, id) && (id in DIRECTORY || chats.some((c) => c.id === id)));
  const hits: PersonHit[] = [];
  for (const id of ids) {
    const person = personOf(id, chats);
    if (!person) continue;
    const emblems = visibleEmblems(s.groups, s.members, id);
    const groupNames = s.members
      .filter((m) => m.personId === id && m.listed)
      .map((m) => s.groups.find((g) => g.id === m.groupId)?.name ?? '')
      .join(' ');
    const haystack = `${person.name} ${person.headline} ${person.city} ${groupNames}`.toLocaleLowerCase('ru-RU');
    const byEmblem = emblems.some((e) => q.includes(plainEmoji(e.group.emblem.emoji)));
    if (haystack.includes(q) || byEmblem) hits.push({ person, emblems });
  }
  return hits.sort((a, b) => a.person.name.localeCompare(b.person.name, 'ru'));
}

/** Группы, которые стоит показать рядом с поиском: самые многолюдные */
export function popularGroups(s: GroupsState, limit = 6): Group[] {
  return [...s.groups].sort((a, b) => memberCount(s.members, b.id) - memberCount(s.members, a.id)).slice(0, limit);
}
