/*
 * Публикация постов канала в Telegram и ВКонтакте: правила, которые не зависят ни от экранов, ни от хранилища.
 * Здесь нет ни React, ни браузера, поэтому файл можно взять на сервер как есть: проверки адреса и ключа, пределы длины,
 * коды ошибок и их тексты у приложения и сервера будут одними и теми же.
 * Хранилище подключений и «сервер-заглушка» лежат в data/integrations.ts.
 */

export type Network = 'telegram' | 'vk';
export const NETWORKS: readonly Network[] = ['telegram', 'vk'];

export interface NetworkMeta {
  /** Полное название: «Telegram», «ВКонтакте» */
  name: string;
  /** Короткое: на плашках в строке поста и в поле ввода */
  chip: string;
  /** Монограмма на цветной плашке. Настоящих логотипов сетей в приложении нет */
  short: string;
  /** Что подключаем: «канал» или «сообщество» */
  noun: string;
  /** Предел знаков в посте и в подписи к фото (по правилам сети на момент написания; при подключении сервера сверить) */
  textLimit: number;
  captionLimit: number;
  /** Оттенок плашки, hsl */
  hue: number;
  /** Что вводит владелец */
  targetLabel: string;
  targetPlaceholder: string;
  secretLabel: string;
}

export const NETWORK_META: Record<Network, NetworkMeta> = {
  telegram: {
    name: 'Telegram',
    chip: 'Telegram',
    short: 'TG',
    noun: 'канал',
    textLimit: 4096,
    captionLimit: 1024,
    hue: 198,
    targetLabel: 'Адрес канала',
    targetPlaceholder: '@имя или t.me/имя',
    secretLabel: 'Токен бота',
  },
  vk: {
    name: 'ВКонтакте',
    chip: 'ВК',
    short: 'ВК',
    noun: 'сообщество',
    textLimit: 16384,
    captionLimit: 16384,
    hue: 256,
    targetLabel: 'Адрес сообщества',
    targetPlaceholder: 'vk.com/club123456',
    secretLabel: 'Ключ доступа сообщества',
  },
};

// ---------------------------------------------------------------- проверка введённого

/** Результат разбора адреса: нормализованное значение или понятная причина */
export type Parsed = { ok: true; value: string } | { ok: false; reason: string };
const bad = (reason: string): Parsed => ({ ok: false, reason });

/** Имя в Telegram: 5–32 знака, латиница, цифры и «_», начинается с буквы, не кончается «_» и без «__» */
const TG_NAME = /^[A-Za-z][A-Za-z0-9_]{3,30}[A-Za-z0-9]$/;
const TG_NAME_TEXT = 'Адрес канала: от 5 до 32 знаков — латиница, цифры и «_», начинается с буквы';

/**
 * Адрес канала Telegram. Принимает @имя, имя, t.me/имя, https://t.me/имя и числовой номер канала (-100…), возвращает «@имя» или номер.
 * Ссылки-приглашения (t.me/+…) не подходят: по ним номер канала не узнать, а подключать нужно именно канал, не личный чат и не группу.
 */
export function parseTelegramTarget(raw: string): Parsed {
  let s = raw.trim();
  if (!s) return bad('Укажите адрес канала');
  if (/^-100\d{6,13}$/.test(s)) return { ok: true, value: s };
  const link = s.match(/^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me|telegram\.dog)\/(.*)$/i);
  if (link) s = link[1];
  s = s.replace(/[?#].*$/, '').replace(/\/+$/, '');
  if (/^(\+|joinchat\/)/i.test(s)) return bad('Ссылка-приглашение не подходит. Укажите публичный адрес вида @имя или числовой номер канала');
  s = s.replace(/^s\//i, '');
  if (s.includes('/')) return bad('Нужен адрес канала, а не ссылка на пост');
  s = s.replace(/^@/, '');
  if (!s) return bad('Укажите адрес канала');
  if (!TG_NAME.test(s) || s.includes('__')) return bad(TG_NAME_TEXT);
  return { ok: true, value: `@${s}` };
}

/** Короткий адрес в ВК: от 5 знаков, латиница, цифры, «_» и «.» */
const VK_NAME = /^[A-Za-z][A-Za-z0-9_.]{3,30}[A-Za-z0-9]$/;
const VK_RESERVED = new Set(['feed', 'im', 'friends', 'groups', 'video', 'audio', 'photos', 'settings', 'wall', 'market', 'apps', 'login', 'away.php']);

/**
 * Адрес сообщества ВК. Принимает vk.com/club123, vk.com/public123, vk.com/event123, короткий адрес, просто номер (123 или -123),
 * возвращает «club<номер>» или короткий адрес. Личные страницы (id123) не подходят.
 */
export function parseVkTarget(raw: string): Parsed {
  let s = raw.trim();
  if (!s) return bad('Укажите адрес сообщества');
  const link = s.match(/^(?:https?:\/\/)?(?:www\.|m\.)?vk\.(?:com|ru)\/(.*)$/i);
  if (link) s = link[1];
  s = s.replace(/[?#].*$/, '').replace(/\/+$/, '').replace(/^@/, '');
  if (!s) return bad('Укажите адрес сообщества');
  if (s.includes('/')) return bad('Нужен адрес сообщества, а не ссылка на запись или раздел');
  if (/^id\d+$/i.test(s)) return bad('Это личная страница. Нужен адрес сообщества, например vk.com/club123456');
  const num = s.match(/^(?:-|club|public|event)?(\d{1,10})$/i);
  if (num) return Number(num[1]) > 0 ? { ok: true, value: `club${Number(num[1])}` } : bad('Номер сообщества должен быть больше нуля');
  if (VK_RESERVED.has(s.toLowerCase())) return bad('Это не адрес сообщества');
  if (!VK_NAME.test(s)) return bad('Короткий адрес: от 5 знаков — латиница, цифры, «_» и «.»');
  return { ok: true, value: s };
}

export const parseTarget = (network: Network, raw: string): Parsed => (network === 'telegram' ? parseTelegramTarget(raw) : parseVkTarget(raw));

/** Токен бота Telegram выглядит так: 123456789:AAH… (выдаёт его бот @BotFather) */
const TG_TOKEN = /^\d{6,12}:[A-Za-z0-9_-]{30,60}$/;
/** Ключ доступа сообщества ВК — длинная строка из латиницы и цифр */
const VK_KEY = /^[A-Za-z0-9_.-]{30,}$/;

/** Ошибка формата ключа или null, если формат верный. Верен ли ключ по существу, проверяет только сервер */
export function checkSecret(network: Network, raw: string): string | null {
  const s = raw.trim();
  if (!s) return 'Вставьте ' + (network === 'telegram' ? 'токен бота' : 'ключ доступа');
  if (network === 'telegram') return TG_TOKEN.test(s) ? null : 'Токен выглядит так: 123456789:AAH… — скопируйте его целиком у @BotFather';
  return VK_KEY.test(s) ? null : 'Ключ — длинная строка из латиницы и цифр без пробелов. Скопируйте его целиком';
}

// ---------------------------------------------------------------- длина

/** Что публикуется: текст и есть ли фото (у фото в Telegram подпись короче) */
export interface Draft {
  text: string;
  photo?: boolean;
}

export interface PlanItem {
  network: Network;
  /** Сколько знаков сеть принимает и сколько в посте */
  limit: number;
  length: number;
  fits: boolean;
}

/** Считаем в единицах UTF-16, как сети: эмодзи занимает два знака, поэтому запас по длине у текста с эмодзи меньше */
export const lengthOf = (text: string): number => text.length;

export const limitOf = (network: Network, photo?: boolean): number => (photo ? NETWORK_META[network].captionLimit : NETWORK_META[network].textLimit);

/** Вмещается ли пост в каждую из выбранных сетей */
export function planPublish(draft: Draft, networks: readonly Network[]): PlanItem[] {
  const length = lengthOf(draft.text.trim());
  return networks.map((network) => {
    const limit = limitOf(network, draft.photo);
    return { network, limit, length, fits: length <= limit };
  });
}

// ---------------------------------------------------------------- ошибки

/**
 * Почему не получилось. Коды одни и те же у приложения и сервера; сервер приводит ответы сетей к ним:
 * Telegram — 401 → invalid_token, «chat not found» → target_not_found, «bot is not a member» / «not enough rights» → bot_not_admin / no_post_right;
 * ВК — error_code 5 → invalid_token, 100 → target_not_found, 15 / 27 → no_post_right, 6 / 9 → rate_limited.
 */
export type FailureCode =
  | 'invalid_token'
  | 'target_not_found'
  | 'not_a_channel'
  | 'bot_not_admin'
  | 'no_post_right'
  | 'not_connected'
  | 'too_long'
  | 'rate_limited'
  | 'message_gone'
  | 'unreachable'
  | 'unknown';

export interface Failure {
  code: FailureCode;
  /** Через сколько секунд можно повторить (при rate_limited) */
  retryAfter?: number;
}

/** После этих ошибок подключение надо чинить (переподключить), а повторять отправку бессмысленно */
export const BREAKS_CONNECTION: ReadonlySet<FailureCode> = new Set<FailureCode>(['invalid_token', 'target_not_found', 'not_a_channel', 'bot_not_admin', 'no_post_right']);

/** Текст для человека: что случилось и что делать */
export function failureText(network: Network, code: FailureCode, limit?: number): string {
  const tg = network === 'telegram';
  const name = NETWORK_META[network].name;
  switch (code) {
    case 'invalid_token':
      return tg ? 'Токен бота не принят: его отозвали или заменили. Подключите канал заново с новым токеном.' : 'Ключ доступа не действует: его отозвали или срок вышел. Создайте новый ключ и подключите сообщество заново.';
    case 'target_not_found':
      return tg ? 'Канал не найден. Проверьте адрес.' : 'Сообщество не найдено. Проверьте адрес.';
    case 'not_a_channel':
      return tg ? 'Это не канал, а чат или группа. Подключать можно только каналы.' : 'Это личная страница, а не сообщество.';
    case 'bot_not_admin':
      return 'Бот не добавлен в канал администратором. Добавьте его и разрешите публиковать сообщения.';
    case 'no_post_right':
      return tg ? 'У бота нет права публиковать сообщения в канале.' : 'У ключа нет доступа к стене сообщества. Создайте ключ с правами «Стена» и «Фотографии».';
    case 'not_connected':
      return `Подключение к ${name} отключено или требует переподключения.`;
    case 'too_long':
      return limit ? `${name} не принимает пост длиннее ${String(limit).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} знаков. Сократите текст.` : `Пост длиннее, чем принимает ${name}. Сократите текст.`;
    case 'rate_limited':
      return `${name} просит подождать. Повторите чуть позже.`;
    case 'message_gone':
      return `Пост в ${name} уже удалён там вручную.`;
    case 'unreachable':
      return 'Сервер не ответил. Повторите чуть позже.';
    default:
      return 'Не получилось. Повторите чуть позже.';
  }
}

// ---------------------------------------------------------------- пост и его публикации

/** Что с постом в одной сети */
export interface Crosspost {
  network: Network;
  /** sending — идёт отправка или правка, sent — в сети всё актуально, failed — не вышло */
  state: 'sending' | 'sent' | 'failed';
  /** Что делали: publish — первая публикация, edit — правка уже вышедшего поста */
  op?: 'publish' | 'edit';
  /** Номер записи в сети: по нему сервер правит и удаляет пост */
  remoteId?: string;
  /** Ссылка на пост в сети, если сервер её вернул */
  url?: string;
  failure?: FailureCode;
}

/** Подпись к плашке поста для читалок экрана и окна: «Опубликовано в Telegram», «Не удалось отправить в ВКонтакте» */
export function crosspostLabel(c: Crosspost): string {
  const name = NETWORK_META[c.network].name;
  if (c.state === 'sending') return c.op === 'edit' ? `Обновляется в ${name}` : `Отправляется в ${name}`;
  if (c.state === 'sent') return `Опубликовано в ${name}`;
  return c.op === 'edit' ? `Не обновлено в ${name}` : `Не отправлено в ${name}`;
}
