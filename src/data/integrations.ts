import { useMemo, useSyncExternalStore } from 'react';
import { getMessages, onChatsRemoved, updateMessage } from './chatStore';
import { BREAKS_CONNECTION, NETWORKS, planPublish, type Crosspost, type Failure, type FailureCode, type Network } from './crosspost';
import { getGroup } from './groups';

/*
 * Подключения канала к Telegram и ВКонтакте — МАКЕТ. Владелец канала подключает свой канал в Telegram и сообщество во ВКонтакте,
 * и посты, которые он пишет в приложении, при желании уходят и туда. Править и удалять пост в приложении можно так же: в сетях он обновится и исчезнет.
 *
 * Сейчас ничего не уходит наружу: всё, что должен делать сервер, делает «сервер-заглушка» `createMockTransport` — ждёт секунду
 * и отвечает «успешно» или «ошибка» (переключатель на экране «Подключения» → «Макет»). Это единственное место, которое заменит настоящий сервер:
 *
 *   1. Написать объект `Transport` (пять методов ниже) поверх своих запросов к серверу.
 *   2. Вызвать `setTransport(...)` при запуске приложения и поставить `INTEGRATIONS_MOCK = false`: пропадут пометка «Макет» и переключатель ответов.
 *
 * Ключи доступа (токен бота, ключ сообщества) приложение не хранит: поле ввода отдаёт ключ в `verify` один раз, сервер оставляет его у себя,
 * а в ответ присылает только описание — как называется канал и кем публикуем. В состоянии приложения ключа нет никогда.
 * Правила и тексты ошибок, общие с сервером, лежат в data/crosspost.ts (без React и браузера, их можно взять на сервер как есть).
 */

/** true, пока вместо сервера работает заглушка: на экранах стоит пометка «Макет», на экране подключений — переключатель ответов */
export const INTEGRATIONS_MOCK = true;

// ---------------------------------------------------------------- обмен с сервером

export interface VerifyRequest {
  chatId: string;
  network: Network;
  /** Адрес в нормализованном виде (parseTarget): «@имя», «-100…» или «club123456» */
  target: string;
  /** Токен бота или ключ сообщества. Уходит на сервер один раз и в состоянии приложения не остаётся */
  secret: string;
}
export type VerifyResult = { ok: true; title: string; account: string } | { ok: false; failure: Failure };

export interface PostRequest {
  chatId: string;
  /** Номер поста в приложении: по нему сервер сопоставляет повторную отправку и не публикует пост дважды */
  postId: string;
  network: Network;
  text: string;
  /** Адрес картинки в памяти (blob:); настоящий сервер получит сам файл */
  photo?: string;
}
export type PostResult = { ok: true; remoteId: string; url?: string } | { ok: false; failure: Failure };

export interface EditRequest extends PostRequest {
  /** Номер записи в сети, который сервер вернул при публикации */
  remoteId: string;
}

export interface RemoveRequest {
  chatId: string;
  postId: string;
  network: Network;
  remoteId: string;
}
export type RemoveResult = { ok: true } | { ok: false; failure: Failure };

/** Всё, что приложению нужно от сервера. Ответы — значения, не исключения: ошибка сети становится `unreachable` */
export interface Transport {
  /** Проверить адрес и ключ: сервер сам ходит в сеть, проверяет, что бот или ключ может публиковать, и запоминает ключ у себя */
  verify(req: VerifyRequest): Promise<VerifyResult>;
  publish(req: PostRequest): Promise<PostResult>;
  edit(req: EditRequest): Promise<PostResult>;
  remove(req: RemoveRequest): Promise<RemoveResult>;
  /** Сервер забывает ключ канала */
  disconnect(req: { chatId: string; network: Network }): Promise<void>;
}

// ---------------------------------------------------------------- подключения

export interface Connection {
  network: Network;
  /** Адрес в нормализованном виде */
  target: string;
  /** Как канал или сообщество называется в сети (по ответу сервера) */
  title: string;
  /** Кем публикуем: бот Telegram, сообщество ВК (по ответу сервера) */
  account: string;
  /** error — публикация перестала получаться из-за подключения (ключ отозвали, бота убрали из канала): нужно переподключить */
  status: 'connected' | 'error';
  problem?: FailureCode;
  /** Новые посты по умолчанию уходят и в эту сеть (в поле ввода это можно отключить для одного поста) */
  byDefault: boolean;
  connectedAt: number;
}

const DAY = 24 * 60 * 60 * 1000;
const NONE: Connection[] = [];

/** Для показа: у канала «Заметки психолога» Telegram подключён, а ключ ВКонтакте отозвали, так что видны оба состояния */
function seedConnections(): Record<string, Connection[]> {
  const now = Date.now();
  return {
    'psy-notes': [
      { network: 'telegram', target: '@psy_zametki', title: 'Заметки психолога', account: 'Бот @seans_demo_bot', status: 'connected', byDefault: true, connectedAt: now - 3 * DAY },
      { network: 'vk', target: 'club218734562', title: 'Заметки психолога | психология', account: 'Ключ сообщества', status: 'error', problem: 'invalid_token', byDefault: false, connectedAt: now - 20 * DAY },
    ],
  };
}

let connections: Record<string, Connection[]> = seedConnections();
/** Выбор «Также в…» для следующего поста: пока не трогали, действует `byDefault` */
let picks: Record<string, Partial<Record<Network, boolean>>> = {};
let mockReply: 'ok' | 'fail' = 'ok';
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const emit = () => listeners.forEach((cb) => cb());

export const getConnections = (chatId: string): Connection[] => connections[chatId] ?? NONE;
export const getConnection = (chatId: string, network: Network): Connection | undefined => getConnections(chatId).find((c) => c.network === network);
export function useConnections(chatId: string): Connection[] {
  return useSyncExternalStore(subscribe, () => getConnections(chatId));
}

const write = (chatId: string, list: Connection[]) => {
  connections = { ...connections, [chatId]: list };
  emit();
};

/** Подключение прошло проверку сервера: новое или заменяет прежнее той же сети (переподключение) */
export function saveConnection(chatId: string, c: Pick<Connection, 'network' | 'target' | 'title' | 'account'>) {
  const old = getConnection(chatId, c.network);
  const next: Connection = { ...c, status: 'connected', byDefault: old?.byDefault ?? true, connectedAt: Date.now() };
  // Выбор «Также в…» сбрасывается к настройке подключения (до записи: она сообщает подписчикам)
  picks = { ...picks, [chatId]: { ...picks[chatId], [c.network]: undefined } };
  write(chatId, [...getConnections(chatId).filter((x) => x.network !== c.network), next].sort((a, b) => NETWORKS.indexOf(a.network) - NETWORKS.indexOf(b.network)));
}

/** Отключить сеть: сервер забывает ключ; уже вышедшие посты остаются в сети, но правки и удаление в приложении на них больше не действуют */
export function disconnect(chatId: string, network: Network) {
  if (!getConnection(chatId, network)) return;
  write(chatId, getConnections(chatId).filter((c) => c.network !== network));
  void attempt(async () => {
    await transport.disconnect({ chatId, network });
    return { ok: true as const };
  });
}

export function setByDefault(chatId: string, network: Network, on: boolean) {
  write(chatId, getConnections(chatId).map((c) => (c.network === network ? { ...c, byDefault: on } : c)));
}

/** Публикация показала, что подключение не работает: оно помечается, и поле ввода больше не предлагает эту сеть */
function markBroken(chatId: string, network: Network, problem: FailureCode) {
  write(chatId, getConnections(chatId).map((c) => (c.network === network ? { ...c, status: 'error', problem } : c)));
}

/** В какие сети уйдёт следующий пост: подключённые, где выбор не снят (по умолчанию — как в настройках подключения) */
export function pickedNetworks(chatId: string): Network[] {
  return getConnections(chatId)
    .filter((c) => c.status === 'connected' && (picks[chatId]?.[c.network] ?? c.byDefault))
    .map((c) => c.network);
}
export function usePicked(chatId: string): Network[] {
  const key = useSyncExternalStore(subscribe, () => pickedNetworks(chatId).join(','));
  return useMemo(() => (key ? (key.split(',') as Network[]) : []), [key]);
}
export function setPick(chatId: string, network: Network, on: boolean) {
  picks = { ...picks, [chatId]: { ...picks[chatId], [network]: on } };
  emit();
}
/** Пост ушёл: выбор «Также в…» действовал для него одного, следующий пост снова начинается с настроек подключений */
export function resetPicks(chatId: string) {
  if (!Object.values(picks[chatId] ?? {}).some((v) => v !== undefined)) return;
  picks = { ...picks, [chatId]: {} };
  emit();
}

/** Канал удалён: подключения уходят вместе с ним */
onChatsRemoved((gone) => {
  const ids = new Set(gone.map((c) => c.id));
  if (!Object.keys(connections).some((id) => ids.has(id))) return;
  connections = Object.fromEntries(Object.entries(connections).filter(([id]) => !ids.has(id)));
  emit();
});

// ---------------------------------------------------------------- сервер-заглушка

export const getMockReply = () => mockReply;
export function useMockReply(): 'ok' | 'fail' {
  return useSyncExternalStore(subscribe, () => mockReply);
}
export function setMockReply(reply: 'ok' | 'fail') {
  mockReply = reply;
  emit();
}

/**
 * Заглушка вместо сервера: ждёт `delay` мс и отвечает по переключателю «Макет → Ответ сервера».
 * Ошибки при проверке — те, что бывают у владельцев чаще всего (бот не админ, ключ не принят); при публикации — «временные»,
 * после которых помогает повтор. Подключение ломается только в данных показа (см. seedConnections).
 */
export function createMockTransport({ delay = 900 }: { delay?: number } = {}): Transport {
  let serial = 100;
  const wait = () => (delay > 0 ? new Promise<void>((done) => window.setTimeout(done, delay)) : Promise.resolve());
  const failing = () => mockReply === 'fail';
  const temporary = (network: Network): Failure => ({ code: network === 'telegram' ? 'unreachable' : 'rate_limited' });
  return {
    async verify(req) {
      await wait();
      if (failing()) return { ok: false, failure: { code: req.network === 'telegram' ? 'bot_not_admin' : 'invalid_token' } };
      return { ok: true, title: getGroup(req.chatId)?.name ?? 'Канал', account: req.network === 'telegram' ? 'Бот @seans_demo_bot' : 'Ключ сообщества' };
    },
    async publish(req) {
      await wait();
      if (failing()) return { ok: false, failure: temporary(req.network) };
      serial += 1;
      return { ok: true, remoteId: String(serial) };
    },
    async edit(req) {
      await wait();
      if (failing()) return { ok: false, failure: temporary(req.network) };
      return { ok: true, remoteId: req.remoteId };
    },
    async remove(req) {
      await wait();
      return failing() ? { ok: false, failure: temporary(req.network) } : { ok: true };
    },
    async disconnect() {
      await wait();
    },
  };
}

let transport: Transport = createMockTransport();
/** Подставить настоящий сервер (или быструю заглушку в проверках) */
export function setTransport(next: Transport) {
  transport = next;
}

/** Ответ сервера или `unreachable`, если запрос упал: приложение дальше работает с одним видом ответа */
async function attempt<T extends { ok: boolean }>(call: () => Promise<T>): Promise<T | { ok: false; failure: Failure }> {
  try {
    return await call();
  } catch {
    return { ok: false, failure: { code: 'unreachable' } };
  }
}

/** Проверка подключения: единственная команда, которой нужен ключ. После ответа ключ нигде не хранится */
export function verifyConnection(req: VerifyRequest): Promise<VerifyResult> {
  return attempt(() => transport.verify(req));
}

// ---------------------------------------------------------------- публикация постов

const findPost = (chatId: string, id: string) => getMessages(chatId).flatMap((g) => g.messages).find((m) => m.id === id);

/** Записывает состояние одной сети в пост (остальные сети не трогает) */
function setCross(chatId: string, postId: string, network: Network, patch: Partial<Crosspost> & Pick<Crosspost, 'state'>) {
  const post = findPost(chatId, postId);
  if (!post) return;
  const list = post.crossposts ?? [];
  const old = list.find((c) => c.network === network);
  const next: Crosspost = { ...(old ?? { network }), ...patch, network };
  updateMessage(chatId, postId, { crossposts: old ? list.map((c) => (c.network === network ? next : c)) : [...list, next] });
}

/** Одна операция с одним постом в одной сети. Если пока шла отправка пост правили или удалили, правка дотягивается, а удалённый убирается из сети */
async function run(op: 'publish' | 'edit', chatId: string, postId: string, network: Network): Promise<void> {
  const post = findPost(chatId, postId);
  if (!post) return;
  const old = post.crossposts?.find((c) => c.network === network);
  if (old?.state === 'sending') return;
  const kind = op === 'edit' && old?.remoteId ? 'edit' : 'publish';
  const conn = getConnection(chatId, network);
  if (!conn || conn.status !== 'connected') {
    setCross(chatId, postId, network, { state: 'failed', op: kind, failure: 'not_connected' });
    return;
  }
  const text = post.text;
  if (!planPublish({ text, photo: Boolean(post.image) }, [network])[0].fits) {
    setCross(chatId, postId, network, { state: 'failed', op: kind, failure: 'too_long' });
    return;
  }
  setCross(chatId, postId, network, { state: 'sending', op: kind, failure: undefined });
  const req: PostRequest = { chatId, postId, network, text, photo: post.image };
  const res = kind === 'edit' ? await attempt(() => transport.edit({ ...req, remoteId: old!.remoteId! })) : await attempt(() => transport.publish(req));
  const now = findPost(chatId, postId);
  if (res.ok) {
    if (!now) {
      if (kind === 'publish') void attempt(() => transport.remove({ chatId, postId, network, remoteId: res.remoteId }));
      return;
    }
    setCross(chatId, postId, network, { state: 'sent', op: undefined, failure: undefined, remoteId: res.remoteId || old?.remoteId, url: res.url ?? old?.url });
    if (now.text !== text) void run('edit', chatId, postId, network);
    return;
  }
  if (!now) return;
  setCross(chatId, postId, network, { state: 'failed', op: kind, failure: res.failure.code });
  if (BREAKS_CONNECTION.has(res.failure.code)) markBroken(chatId, network, res.failure.code);
}

/** Новый пост канала: отправить в выбранные сети. Состояние каждой сети появляется в посте сразу («отправляется») и меняется по ответу сервера */
export function publishPost(chatId: string, postId: string, networks: readonly Network[]): Promise<void[]> {
  return Promise.all(networks.map((n) => run('publish', chatId, postId, n)));
}

/** Повторить то, что не вышло (публикацию или правку) */
export function retryCrosspost(chatId: string, postId: string, network: Network): Promise<void> {
  const c = findPost(chatId, postId)?.crossposts?.find((x) => x.network === network);
  return c?.state === 'failed' ? run(c.op ?? 'publish', chatId, postId, network) : Promise.resolve();
}

/** Пост изменён в приложении: обновить его там, где он уже вышел. Пост, который ещё не вышел, при повторе уйдёт с новым текстом */
export function editCrossposts(chatId: string, postId: string): Promise<void[]> {
  const list = findPost(chatId, postId)?.crossposts ?? [];
  return Promise.all(list.filter((c) => c.remoteId && c.state !== 'sending').map((c) => run('edit', chatId, postId, c.network)));
}

/** В каких сетях пост вышел (и значит, исчезнет при удалении): для подсказки в окне удаления */
export function syncedNetworks(chatId: string, ids: readonly string[]): Network[] {
  const found = new Set<Network>();
  ids.forEach((id) => findPost(chatId, id)?.crossposts?.forEach((c) => c.remoteId && found.add(c.network)));
  return NETWORKS.filter((n) => found.has(n));
}

/**
 * Посты удаляются в приложении: убрать их и в сетях. Вызывать до удаления из переписки (номера записей лежат в постах).
 * Возвращает сети, где удалить не вышло, — человеку нужно сказать, что пост остался там.
 */
export async function removeCrossposts(chatId: string, ids: readonly string[]): Promise<Network[]> {
  const jobs: Array<Promise<Network | null>> = [];
  ids.forEach((id) => {
    findPost(chatId, id)?.crossposts?.forEach((c) => {
      if (!c.remoteId) return;
      const remoteId = c.remoteId;
      jobs.push(attempt(() => transport.remove({ chatId, postId: id, network: c.network, remoteId })).then((r) => (r.ok || r.failure.code === 'message_gone' ? null : c.network)));
    });
  });
  const failed = await Promise.all(jobs);
  return NETWORKS.filter((n) => failed.includes(n));
}
