import { useSyncExternalStore } from 'react';
import {
  applyDiff,
  BUILT_IN_ROLES,
  can as canIn,
  CAP_BY_ID,
  capsDiff,
  capsLine,
  capState,
  consentCaps,
  CUSTOM_ROLE_CAPS,
  GREETING_MAX,
  isCapId,
  needsInvite,
  orderCaps,
  ROLE_MAX,
  roleLine,
  type CapId,
  type CapsDiff,
  type CapState,
  type RoleDef,
  type RoleLink,
} from './roles';
import { onChatsRemoved, postRoleMessage } from './chatStore';
import { logInvite, nowStamp } from './clientStore';
import { addToFolder, folderOfRole } from './folders';

/*
 * Роли в чатах и приглашения. На чат бывает несколько ролей (связей); у каждой свои включённые возможности.
 * Правило согласия: своё включается сразу, общее — когда собеседник согласился на приглашение.
 *
 * Сервера пока нет, поэтому вторую сторону играет «двойник»: ответ на ваше приглашение даёте вы сами (кнопка «Демо» на карточке),
 * а входящие приглашения приходят из тестовых данных (receiveInvite). Когда появится сервер, меняются только эти два места.
 * Состояние чатов и связей держится в памяти, как и остальные данные приложения; определения ролей (свои и правки встроенных) —
 * в localStorage, как другие настройки.
 */

export type InviteKind = 'role' | 'caps';
export type InviteState = 'pending' | 'accepted' | 'declined' | 'revoked';

export interface Invite {
  id: string;
  chatId: string;
  linkId: string;
  /** Роль, о которой приглашение: связь после отказа удаляется, а карточка в ленте должна по-прежнему называть роль */
  roleId: string;
  /** role: приглашение в роль; caps: дополнение к роли, которая уже работает */
  kind: InviteKind;
  /** Кто предложил: вы (out) или собеседник (in) */
  dir: 'out' | 'in';
  /** Общие возможности, на которые нужно согласие */
  caps: CapId[];
  state: InviteState;
  /** Дата создания и дата ответа, дд.мм.гггг */
  at: string;
  answeredAt?: string;
}

interface State {
  roles: RoleDef[];
  links: Record<string, RoleLink[]>;
  invites: Invite[];
}

// ——— Определения ролей: встроенные, свои и правки встроенных (localStorage) ———

const STORAGE_KEY = 'seans.roles.v1';

const clean = (value: unknown, max: number): string => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** Сохранённые определения: проверяются как чужие данные, мусор отбрасывается */
function loadRoles(): RoleDef[] {
  const roles = BUILT_IN_ROLES.map((role) => ({ ...role, caps: [...role.caps] }));
  try {
    if (typeof localStorage === 'undefined') return roles;
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(saved)) return roles;
    for (const raw of saved) {
      if (!raw || typeof raw !== 'object') continue;
      const item = raw as Record<string, unknown>;
      const id = typeof item.id === 'string' ? item.id : '';
      const name = clean(item.name, ROLE_MAX);
      if (!id || !name) continue;
      const def: RoleDef = {
        id,
        name,
        mirror: clean(item.mirror, ROLE_MAX) || name,
        builtIn: roles.some((r) => r.id === id && r.builtIn),
        caps: orderCaps(Array.isArray(item.caps) ? item.caps.filter(isCapId) : CUSTOM_ROLE_CAPS),
        greeting: clean(item.greeting, GREETING_MAX),
        hint: clean(item.hint, 80),
      };
      const at = roles.findIndex((r) => r.id === id);
      if (at >= 0) roles[at] = { ...def, hint: roles[at].hint };
      else if (/^role-\d+$/.test(id)) roles.push({ ...def, builtIn: false });
    }
  } catch {
    // Повреждённые данные или закрытое хранилище: остаются встроенные роли
  }
  return roles;
}

/** Хранятся свои роли и встроенные, чем-то отличающиеся от исходных */
function saveRoles(roles: RoleDef[]) {
  try {
    if (typeof localStorage === 'undefined') return;
    const changed = roles.filter((role) => {
      const base = BUILT_IN_ROLES.find((r) => r.id === role.id);
      return !base || JSON.stringify({ ...base, hint: '' }) !== JSON.stringify({ ...role, hint: '' });
    });
    if (changed.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(changed));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Хранилище закрыто: роли живут до перезагрузки
  }
}

// ——— Начальное состояние (тестовые данные) ———

let seq = 0;
const newId = (prefix: string) => `${prefix}-${++seq}`;
const today = () => nowStamp().date;

function initial(): State {
  const roles = loadRoles();
  const links: Record<string, RoleLink[]> = {};
  const invites: Invite[] = [];
  const base = (roleId: string) => roles.find((r) => r.id === roleId)!.caps;
  const add = (chatId: string, roleId: string, status: RoleLink['status'], dir: RoleLink['dir'], since: string, caps: CapId[] = base(roleId)): RoleLink => {
    const ordered = orderCaps(caps);
    const link: RoleLink = { id: newId('lnk'), roleId, status, dir, caps: ordered, agreed: status === 'pending' ? [] : consentCaps(ordered), since };
    links[chatId] = [...(links[chatId] ?? []), link];
    return link;
  };
  // Максим и Вера — клиенты, Владислав — коллега (ему включены тесты: он делится опросниками), Богдан — семинар
  add('maxim', 'client', 'active', 'out', '03.09.2026');
  add('vera', 'client', 'active', 'out', '12.09.2026');
  add('vladislav', 'colleague', 'active', 'out', '15.09.2026', [...base('colleague'), 'tests']);
  add('bogdan', 'seminar', 'active', 'out', '10.09.2026');
  // Олег сам предлагает роль: ответить нужно вам (карточка лежит в его чате, см. messages.ts)
  const incoming = add('oleg', 'client', 'pending', 'in', today());
  invites.push({ id: 'inv-oleg', chatId: 'oleg', linkId: incoming.id, roleId: 'client', kind: 'role', dir: 'in', caps: consentCaps(incoming.caps), state: 'pending', at: today() });
  return { roles, links, invites };
}

let state: State = initial();

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const emit = () => listeners.forEach((cb) => cb());

// Удалили чат — роли и приглашения в нём уходят вместе с ним
onChatsRemoved((ids) => {
  state = {
    ...state,
    links: Object.fromEntries(Object.entries(state.links).filter(([chatId]) => !ids.includes(chatId))),
    invites: state.invites.filter((invite) => !ids.includes(invite.chatId)),
  };
  emit();
});

// ——— Чтение ———

const NO_LINKS: RoleLink[] = [];

export const getRoles = (): readonly RoleDef[] => state.roles;
export const getRole = (id: string): RoleDef | undefined => state.roles.find((role) => role.id === id);
/** Название роли; если её определение удалено, запасное слово */
export const roleName = (id: string): string => getRole(id)?.name ?? 'Роль';
export const getLinks = (chatId: string): readonly RoleLink[] => state.links[chatId] ?? NO_LINKS;
export const getAllLinks = (): Readonly<Record<string, RoleLink[]>> => state.links;
export const getInvite = (id: string): Invite | undefined => state.invites.find((invite) => invite.id === id);
export const getInvites = (): readonly Invite[] => state.invites;

export function useRoles(): readonly RoleDef[] {
  return useSyncExternalStore(subscribe, () => state.roles);
}

export function useRole(id: string): RoleDef | undefined {
  return useSyncExternalStore(subscribe, () => state.roles.find((role) => role.id === id));
}

/** Роли чата */
export function useLinks(chatId: string): readonly RoleLink[] {
  return useSyncExternalStore(subscribe, () => state.links[chatId] ?? NO_LINKS);
}

/** Роли всех чатов: для счётчиков и списков получателей */
export function useAllLinks(): Readonly<Record<string, RoleLink[]>> {
  return useSyncExternalStore(subscribe, () => state.links);
}

export function useInvite(id: string): Invite | undefined {
  return useSyncExternalStore(subscribe, () => state.invites.find((invite) => invite.id === id));
}

export function useInvites(): readonly Invite[] {
  return useSyncExternalStore(subscribe, () => state.invites);
}

/** Подпись под именем: «Клиент», «Клиент, Коллега · ждём ответа», «Диалог» */
export function useRoleLine(chatId: string): string {
  return useSyncExternalStore(subscribe, () => roleLine(state.links[chatId] ?? NO_LINKS, roleName));
}

const statesCache = new WeakMap<readonly RoleLink[], Record<CapId, CapState>>();

/** Состояние каждой возможности в чате: открыта, закрыта замком до согласия или не включена */
export function capStatesOf(links: readonly RoleLink[]): Record<CapId, CapState> {
  let states = statesCache.get(links);
  if (!states) {
    states = Object.fromEntries(Object.keys(CAP_BY_ID).map((id) => [id, capState(links, id as CapId)])) as Record<CapId, CapState>;
    statesCache.set(links, states);
  }
  return states;
}

export function useCapStates(chatId: string): Record<CapId, CapState> {
  return useSyncExternalStore(subscribe, () => capStatesOf(state.links[chatId] ?? NO_LINKS));
}

/** Работает ли возможность в чате прямо сейчас (можно ли, например, отправить тест) */
export const canInChat = (chatId: string, cap: CapId): boolean => canIn(state.links[chatId] ?? NO_LINKS, cap);

const withCache = new Map<CapId, { links: State['links']; ids: string[] }>();

/** Чаты, где возможность работает сейчас: получатели тестов и заданий */
export function useChatIdsWith(cap: CapId): string[] {
  return useSyncExternalStore(subscribe, () => {
    const hit = withCache.get(cap);
    if (hit && hit.links === state.links) return hit.ids;
    const ids = Object.keys(state.links).filter((chatId) => canIn(state.links[chatId], cap));
    withCache.set(cap, { links: state.links, ids });
    return ids;
  });
}

/** Сколько чатов с активной ролью из списка (счётчики в профиле) */
export function countWithRole(links: Readonly<Record<string, RoleLink[]>>, chatIds: readonly string[], roleIds: readonly string[]): number {
  return chatIds.filter((id) => (links[id] ?? NO_LINKS).some((link) => link.status === 'active' && roleIds.includes(link.roleId))).length;
}

/** Сколько чатов имеют роль (любой статус, кроме отказа: связи с отказом удаляются) */
export const linksOfRole = (roleId: string): { chatId: string; link: RoleLink }[] =>
  Object.entries(state.links).flatMap(([chatId, list]) => list.filter((link) => link.roleId === roleId).map((link) => ({ chatId, link })));

// ——— Запись: внутренние помощники ———

const findLink = (chatId: string, linkId: string): RoleLink | undefined => (state.links[chatId] ?? NO_LINKS).find((link) => link.id === linkId);

function setLinks(chatId: string, links: RoleLink[]) {
  state = { ...state, links: { ...state.links, [chatId]: links } };
}

function patchLink(chatId: string, linkId: string, patch: Partial<RoleLink>) {
  setLinks(chatId, (state.links[chatId] ?? NO_LINKS).map((link) => (link.id === linkId ? { ...link, ...patch } : link)));
}

function patchInvite(id: string, patch: Partial<Invite>) {
  state = { ...state, invites: state.invites.map((invite) => (invite.id === id ? { ...invite, ...patch } : invite)) };
}

const pendingOf = (linkId: string): Invite[] => state.invites.filter((invite) => invite.linkId === linkId && invite.state === 'pending');

/** Строка по центру ленты чата */
function say(chatId: string, text: string) {
  postRoleMessage(chatId, { from: 'them', text, system: true });
}

/** Чат ложится в папку, связанную с ролью; возвращает название папки, если чат туда только что попал */
function joinRoleFolder(chatId: string, roleId: string): string | undefined {
  const folder = folderOfRole(roleId);
  return folder && addToFolder('chats', folder.id, chatId) ? folder.name : undefined;
}

/** Ждущие приглашения связи снимаются (роль закончилась или снята) */
function revokePending(linkId: string) {
  pendingOf(linkId).forEach((invite) => patchInvite(invite.id, { state: 'revoked', answeredAt: today() }));
}

export interface AssignResult {
  link: RoleLink;
  /** Приглашение, если роль его требует */
  invite?: Invite;
  /** Папка, в которую чат только что положили */
  folder?: string;
}

function createInvite(chatId: string, link: RoleLink, kind: InviteKind, dir: Invite['dir'], caps: CapId[]): Invite {
  const invite: Invite = { id: newId('inv'), chatId, linkId: link.id, roleId: link.roleId, kind, dir, caps, state: 'pending', at: today() };
  state = { ...state, invites: [...state.invites, invite] };
  postRoleMessage(chatId, {
    from: dir === 'out' ? 'me' : 'them',
    text: kind === 'role' ? `Приглашение: роль «${roleName(link.roleId)}»` : `Приглашение: ${capsLine(caps)}`,
    invite: invite.id,
  });
  return invite;
}

// ——— Запись: роли в чатах ———

/**
 * Дать собеседнику роль. Роль с общими возможностями уходит приглашением (карточка в чате, работа начнётся после согласия),
 * роль без них начинается сразу. Если такая роль у чата уже есть и не завершена, ничего не происходит.
 */
export function assignRole(chatId: string, roleId: string, caps?: readonly CapId[]): AssignResult | null {
  const role = getRole(roleId);
  if (!role) return null;
  const current = state.links[chatId] ?? NO_LINKS;
  const same = current.find((link) => link.roleId === roleId);
  if (same && same.status !== 'ended') return null;
  const chosen = orderCaps(caps ?? role.caps);
  const needs = needsInvite(chosen);
  const link: RoleLink = { id: newId('lnk'), roleId, status: needs ? 'pending' : 'active', dir: 'out', caps: chosen, agreed: [], since: today() };
  // Завершённая роль заменяется новой, а прежняя работа остаётся в журнале
  setLinks(chatId, [...current.filter((l) => l !== same), link]);
  let invite: Invite | undefined;
  let folder: string | undefined;
  if (needs) invite = createInvite(chatId, link, 'role', 'out', consentCaps(chosen));
  else {
    say(chatId, `Роль «${role.name}» назначена`);
    folder = joinRoleFolder(chatId, roleId);
  }
  emit();
  return { link, invite, folder };
}

/**
 * Входящее приглашение: собеседник сам предлагает роль, ответить нужно вам. Пока нет сервера, так приходят тестовые приглашения;
 * потом это место заменит приём с сервера.
 */
export function receiveInvite(chatId: string, roleId: string, caps?: readonly CapId[]): AssignResult | null {
  const role = getRole(roleId);
  if (!role) return null;
  const current = state.links[chatId] ?? NO_LINKS;
  if (current.some((link) => link.roleId === roleId && link.status !== 'ended')) return null;
  const chosen = orderCaps(caps ?? role.caps);
  const link: RoleLink = { id: newId('lnk'), roleId, status: 'pending', dir: 'in', caps: chosen, agreed: [], since: today() };
  setLinks(chatId, [...current.filter((l) => l.roleId !== roleId), link]);
  const invite = createInvite(chatId, link, 'role', 'in', consentCaps(chosen));
  logInvite(chatId, role.name, 'received');
  emit();
  return { link, invite };
}

export interface RespondResult {
  /** Папка, в которую чат только что положили */
  folder?: string;
}

/**
 * Ответ на приглашение. Отвечает собеседник (на ваше приглашение — «двойник» через демо) или вы (на входящее).
 * Принятая роль начинает работать, отклонённая снимается без следа в подписи: человек отказался, и «Клиент» была бы неправдой.
 */
export function respondInvite(inviteId: string, accept: boolean): RespondResult | null {
  const invite = getInvite(inviteId);
  if (!invite || invite.state !== 'pending') return null;
  const link = findLink(invite.chatId, invite.linkId);
  if (!link) {
    patchInvite(inviteId, { state: 'revoked', answeredAt: today() });
    emit();
    return null;
  }
  const { chatId } = invite;
  const name = roleName(link.roleId);
  const mine = invite.dir === 'in';
  const result: RespondResult = {};
  patchInvite(inviteId, { state: accept ? 'accepted' : 'declined', answeredAt: today() });
  if (invite.kind === 'role') {
    if (accept) {
      patchLink(chatId, link.id, { status: 'active', agreed: orderCaps(invite.caps) });
      say(chatId, mine ? `Вы приняли приглашение: роль «${name}»` : `Приглашение принято: роль «${name}»`);
      logInvite(chatId, name, 'accepted');
      result.folder = joinRoleFolder(chatId, link.roleId);
    } else {
      setLinks(chatId, (state.links[chatId] ?? NO_LINKS).filter((l) => l.id !== link.id));
      say(chatId, mine ? `Вы отклонили приглашение: роль «${name}»` : `Приглашение отклонено: роль «${name}»`);
      logInvite(chatId, name, 'declined');
    }
  } else if (accept) {
    patchLink(chatId, link.id, { agreed: orderCaps([...link.agreed, ...invite.caps]) });
    say(chatId, mine ? `Вы согласились: ${capsLine(invite.caps)}` : `Согласие получено: ${capsLine(invite.caps)}`);
  } else {
    // Отказ от дополнения выключает эти возможности: включённого без согласия не остаётся
    patchLink(chatId, link.id, { caps: link.caps.filter((c) => !invite.caps.includes(c)) });
    say(chatId, mine ? `Вы отказались: ${capsLine(invite.caps)}` : `Отказ: ${capsLine(invite.caps)} выключено`);
  }
  emit();
  return result;
}

/** Отозвать своё приглашение, пока на него не ответили. Приглашение в роль снимает роль, дополнение выключает возможности */
export function revokeInvite(inviteId: string): boolean {
  const invite = getInvite(inviteId);
  if (!invite || invite.dir !== 'out' || invite.state !== 'pending') return false;
  const link = findLink(invite.chatId, invite.linkId);
  patchInvite(inviteId, { state: 'revoked', answeredAt: today() });
  if (link) {
    if (invite.kind === 'role') {
      setLinks(invite.chatId, (state.links[invite.chatId] ?? NO_LINKS).filter((l) => l.id !== link.id));
      say(invite.chatId, `Приглашение отозвано: роль «${roleName(link.roleId)}»`);
    } else {
      patchLink(invite.chatId, link.id, { caps: link.caps.filter((c) => !invite.caps.includes(c)) });
      say(invite.chatId, `Приглашение отозвано: ${capsLine(invite.caps)}`);
    }
  }
  emit();
  return true;
}

/** Завершить работу: общие возможности выключаются, история и ответы остаются. Закончить может любая сторона, согласие другой не нужно */
export function endRole(chatId: string, linkId: string): boolean {
  const link = findLink(chatId, linkId);
  if (!link || link.status !== 'active') return false;
  revokePending(link.id);
  patchLink(chatId, link.id, { status: 'ended' });
  say(chatId, `Работа завершена: роль «${roleName(link.roleId)}»`);
  logInvite(chatId, roleName(link.roleId), 'ended');
  emit();
  return true;
}

/** Работа с этим человеком по этой роли может быть снята без следа: роль завершена или в ней нет общих возможностей */
export const canRemoveLink = (link: RoleLink): boolean => link.status === 'ended' || (link.status === 'active' && !needsInvite(link.caps));

/** Снять роль совсем (завершённую или без общих возможностей). Работающую с общими возможностями сначала завершают: так остаётся запись */
export function removeLink(chatId: string, linkId: string): boolean {
  const link = findLink(chatId, linkId);
  if (!link || !canRemoveLink(link)) return false;
  revokePending(link.id);
  setLinks(chatId, (state.links[chatId] ?? NO_LINKS).filter((l) => l.id !== link.id));
  say(chatId, `Роль «${roleName(link.roleId)}» снята`);
  emit();
  return true;
}

// ——— Запись: возможности ———

/**
 * Применить разницу возможностей к одной связи. Новые общие возможности работающей роли уходят дополнением (согласие нужно),
 * в ждущем приглашении список подстраивается, снятые — выключаются сразу.
 */
function changeCaps(chatId: string, linkId: string, diff: CapsDiff) {
  const link = findLink(chatId, linkId);
  if (!link) return;
  const caps = applyDiff(link.caps, diff);
  const lost = diff.removed.filter((cap) => link.agreed.includes(cap));
  patchLink(chatId, linkId, { caps, agreed: link.agreed.filter((cap) => caps.includes(cap)) });

  let activated = false;
  for (const invite of pendingOf(linkId)) {
    if (invite.kind === 'role') {
      const shared = consentCaps(caps);
      if (shared.length) patchInvite(invite.id, { caps: shared });
      else {
        // Общих возможностей не осталось: приглашение не нужно, роль начинается сразу
        patchInvite(invite.id, { caps: [], state: 'revoked', answeredAt: today() });
        patchLink(chatId, linkId, { status: 'active' });
        say(chatId, `Общих функций больше нет, роль «${roleName(link.roleId)}» активна`);
        joinRoleFolder(chatId, link.roleId);
        activated = true;
      }
    } else {
      const left = invite.caps.filter((cap) => caps.includes(cap));
      patchInvite(invite.id, left.length ? { caps: left } : { caps: [], state: 'revoked', answeredAt: today() });
    }
  }

  if (link.status === 'active' && !activated) {
    const fresh = consentCaps(diff.added).filter((cap) => !link.agreed.includes(cap));
    if (fresh.length) {
      const open = pendingOf(linkId).find((invite) => invite.kind === 'caps');
      if (open) patchInvite(open.id, { caps: orderCaps([...open.caps, ...fresh]) });
      else createInvite(chatId, findLink(chatId, linkId)!, 'caps', 'out', fresh);
    }
  }
  if (lost.length) say(chatId, `Выключено: ${capsLine(lost)}`);
}

/** Связь, чьи возможности можно менять: не завершена, и это не чужое приглашение, на которое вы ещё не ответили */
export const isEditable = (link: RoleLink): boolean => link.status !== 'ended' && !(link.status === 'pending' && link.dir === 'in');

export interface CapsResult {
  /** Сколько других чатов с этой ролью получили то же изменение */
  others: number;
}

/** Применить разницу ко всем остальным чатам с ролью и к самому определению роли (новые люди получат то же) */
function propagate(roleId: string, diff: CapsDiff, exceptLinkId?: string): number {
  let others = 0;
  for (const [chatId, list] of Object.entries(state.links)) {
    for (const link of list) {
      if (link.roleId !== roleId || link.id === exceptLinkId || !isEditable(link)) continue;
      const mine: CapsDiff = { added: diff.added.filter((cap) => !link.caps.includes(cap)), removed: diff.removed.filter((cap) => link.caps.includes(cap)) };
      if (!mine.added.length && !mine.removed.length) continue;
      changeCaps(chatId, link.id, mine);
      others += 1;
    }
  }
  const role = getRole(roleId);
  if (role) commitRoles(state.roles.map((r) => (r.id === roleId ? { ...r, caps: applyDiff(r.caps, diff) } : r)));
  return others;
}

/**
 * Включить и выключить возможности в этом чате. С forAll то же самое получают все остальные чаты с этой ролью и новые люди с ней:
 * переносится именно разница («включили Тесты»), а не весь набор, поэтому то, что у других настроено иначе, не теряется.
 */
export function setLinkCaps(chatId: string, linkId: string, next: readonly CapId[], forAll = false): CapsResult | null {
  const link = findLink(chatId, linkId);
  if (!link || !isEditable(link)) return null;
  const diff = capsDiff(link.caps, orderCaps(next));
  if (!diff.added.length && !diff.removed.length) return { others: 0 };
  changeCaps(chatId, linkId, diff);
  const others = forAll ? propagate(link.roleId, diff, link.id) : 0;
  emit();
  return { others };
}

// ——— Запись: определения ролей ———

function commitRoles(roles: RoleDef[]) {
  state = { ...state, roles };
  saveRoles(roles);
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Название свободно среди ролей (кроме роли `except`) */
export const isNameFree = (name: string, except?: string): boolean => !state.roles.some((role) => role.id !== except && sameName(role.name, name));

/** Своя роль. Название обязательно и не повторяет другое; «вы для него» по умолчанию то же слово (друг — друг) */
export function createRole(input: { name: string; mirror?: string; caps?: readonly CapId[] }): RoleDef | null {
  const name = clean(input.name, ROLE_MAX);
  if (!name || !isNameFree(name)) return null;
  const used = state.roles.map((role) => Number(/^role-(\d+)$/.exec(role.id)?.[1] ?? 0));
  const role: RoleDef = {
    id: `role-${Math.max(0, ...used) + 1}`,
    name,
    mirror: clean(input.mirror, ROLE_MAX) || name,
    builtIn: false,
    caps: orderCaps(input.caps ?? CUSTOM_ROLE_CAPS),
    greeting: '',
    hint: 'Своя роль: функции включаете сами',
  };
  commitRoles([...state.roles, role]);
  emit();
  return role;
}

/** Изменить название, «вы для него» и приветствие. Название не должно повторять другую роль; пустое не принимается */
export function updateRole(id: string, patch: Partial<Pick<RoleDef, 'name' | 'mirror' | 'greeting'>>): boolean {
  const role = getRole(id);
  if (!role) return false;
  const name = patch.name === undefined ? role.name : clean(patch.name, ROLE_MAX);
  if (!name || !isNameFree(name, id)) return false;
  const next: RoleDef = {
    ...role,
    name,
    mirror: patch.mirror === undefined ? role.mirror : clean(patch.mirror, ROLE_MAX) || name,
    greeting: patch.greeting === undefined ? role.greeting : clean(patch.greeting, GREETING_MAX),
  };
  commitRoles(state.roles.map((r) => (r.id === id ? next : r)));
  emit();
  return true;
}

/** Изменить возможности по умолчанию. С applyToLinks разница доходит и до тех, кому роль уже назначена */
export function setRoleCaps(id: string, next: readonly CapId[], applyToLinks = false): CapsResult | null {
  const role = getRole(id);
  if (!role) return null;
  const diff = capsDiff(role.caps, orderCaps(next));
  if (!diff.added.length && !diff.removed.length) return { others: 0 };
  const others = applyToLinks ? propagate(id, diff) : 0;
  if (!applyToLinks) commitRoles(state.roles.map((r) => (r.id === id ? { ...r, caps: applyDiff(r.caps, diff) } : r)));
  emit();
  return { others };
}

/** Вернуть встроенную роль к исходным настройкам. Тем, кому она назначена, ничего не меняется */
export function resetRole(id: string): boolean {
  const base = BUILT_IN_ROLES.find((role) => role.id === id);
  if (!base || !getRole(id)) return false;
  commitRoles(state.roles.map((r) => (r.id === id ? { ...base, caps: [...base.caps] } : r)));
  emit();
  return true;
}

/** Исходные ли настройки у встроенной роли */
export function isDefaultRole(role: RoleDef): boolean {
  const base = BUILT_IN_ROLES.find((r) => r.id === role.id);
  return !base || JSON.stringify({ ...base, hint: '' }) === JSON.stringify({ ...role, hint: '' });
}

/** Удалить свою роль. Пока она кому-то назначена, не удаляется: сначала её снимают с людей */
export function deleteRole(id: string): 'ok' | 'builtin' | 'used' | 'missing' {
  const role = getRole(id);
  if (!role) return 'missing';
  if (role.builtIn) return 'builtin';
  if (linksOfRole(id).length) return 'used';
  commitRoles(state.roles.filter((r) => r.id !== id));
  emit();
  return 'ok';
}
