/*
 * Роли: договорённость двух людей в одном чате. Роль включает возможности — вкладки и действия в диалоге.
 * Свои возможности (заметки, сведения, история) видит и использует только хозяин, они включаются сразу.
 * Общие (тесты, задания…) затрагивают собеседника и включаются, когда он согласился на приглашение.
 * Файл — чистые правила без состояния и экранов; состояние ролей живёт в roleStore.ts.
 */

export type CapId = 'notes' | 'info' | 'history' | 'tests' | 'tasks' | 'schedule' | 'files' | 'payment';

export interface CapDef {
  id: CapId;
  /** Название вкладки или пункта меню */
  label: string;
  /** Общая: затрагивает собеседника, включается после его согласия. Своя: видит только хозяин */
  shared: boolean;
  /** Ещё нет в приложении: переключатель есть, действия за ним нет; согласия такая возможность не требует */
  soon: boolean;
  /** Что это даёт вам */
  mine: string;
  /** Что получает собеседник; у своих возможностей пусто: он их не видит */
  theirs: string;
}

/** Порядок задаёт порядок вкладок и строк в списках */
export const CAPS: readonly CapDef[] = [
  { id: 'notes', label: 'Заметки', shared: false, soon: false, mine: 'Вести заметки о собеседнике, их видите только вы', theirs: '' },
  { id: 'info', label: 'Сведения', shared: false, soon: false, mine: 'Хранить сведения: запрос, анамнез, гипотезы, только для вас', theirs: '' },
  { id: 'history', label: 'История', shared: false, soon: false, mine: 'Видеть историю взаимодействия: сеансы, тесты, задания', theirs: '' },
  { id: 'tests', label: 'Тесты', shared: true, soon: false, mine: 'Присылать тесты и смотреть результаты', theirs: 'Проходить присланные тесты' },
  { id: 'tasks', label: 'Задания', shared: true, soon: false, mine: 'Присылать задания и смотреть выполнение', theirs: 'Выполнять присланные задания' },
  { id: 'schedule', label: 'Расписание', shared: true, soon: true, mine: 'Назначать встречи и напоминать о них', theirs: 'Видеть встречи и напоминания' },
  { id: 'files', label: 'Файлы', shared: true, soon: true, mine: 'Обмениваться файлами', theirs: 'Обмениваться файлами' },
  { id: 'payment', label: 'Оплата', shared: true, soon: true, mine: 'Выставлять счета и видеть оплату', theirs: 'Видеть счета и оплачивать' },
];

export const CAP_BY_ID = Object.fromEntries(CAPS.map((cap) => [cap.id, cap])) as Record<CapId, CapDef>;

export const isCapId = (value: unknown): value is CapId => typeof value === 'string' && Object.prototype.hasOwnProperty.call(CAP_BY_ID, value);

/** Без повторов и в порядке возможностей */
export const orderCaps = (caps: readonly CapId[]): CapId[] => CAPS.filter((cap) => caps.includes(cap.id)).map((cap) => cap.id);

/** Возможности, на которые нужно согласие собеседника: общие и уже работающие */
export const consentCaps = (caps: readonly CapId[]): CapId[] => orderCaps(caps).filter((id) => CAP_BY_ID[id].shared && !CAP_BY_ID[id].soon);

/** Роль требует приглашения ровно тогда, когда в ней есть хотя бы одна общая возможность; отдельной настройки нет */
export const needsInvite = (caps: readonly CapId[]): boolean => consentCaps(caps).length > 0;

/** «Тесты, Задания» */
export const capsLine = (caps: readonly CapId[]): string => orderCaps(caps).map((id) => CAP_BY_ID[id].label).join(', ');

export interface CapsDiff {
  added: CapId[];
  removed: CapId[];
}

/** Что изменилось между двумя наборами возможностей */
export function capsDiff(from: readonly CapId[], to: readonly CapId[]): CapsDiff {
  return { added: orderCaps(to.filter((id) => !from.includes(id))), removed: orderCaps(from.filter((id) => !to.includes(id))) };
}

/** Применить разницу к набору: сначала убрать, потом добавить */
export const applyDiff = (caps: readonly CapId[], diff: CapsDiff): CapId[] => orderCaps([...caps.filter((id) => !diff.removed.includes(id)), ...diff.added]);

export interface RoleDef {
  id: string;
  /** Кем человек является для вас: «Клиент». Это же подпись под его именем */
  name: string;
  /** Кем вы являетесь для него: «Психолог» */
  mirror: string;
  builtIn: boolean;
  /** Что включено у нового человека с этой ролью; у каждого можно изменить отдельно */
  caps: CapId[];
  /** Слова психолога в приглашении; пусто — приглашение без приветствия */
  greeting: string;
  /** Подпись в окне выбора: что это за роль */
  hint: string;
}

/** Длина названия роли: подпись под именем в шапке чата должна поместиться в одну строку */
export const ROLE_MAX = 24;
export const GREETING_MAX = 300;

const FULL: CapId[] = ['notes', 'info', 'history', 'tests', 'tasks', 'schedule', 'files', 'payment'];

/** Встроенные роли. «Пациент» и «Клиент» — разные роли: механика та же, но их ведут и называют по-разному */
export const BUILT_IN_ROLES: readonly RoleDef[] = [
  {
    id: 'client',
    name: 'Клиент',
    mirror: 'Психолог',
    builtIn: true,
    caps: FULL,
    greeting: 'Здравствуйте! Предлагаю работать через приложение: здесь удобно проходить тесты и выполнять задания.',
    hint: 'Вы его психолог: тесты, задания, заметки, сведения и история',
  },
  {
    id: 'patient',
    name: 'Пациент',
    mirror: 'Психолог',
    builtIn: true,
    caps: FULL,
    greeting: 'Здравствуйте! Предлагаю наблюдаться через приложение: здесь удобно проходить опросники и выполнять задания.',
    hint: 'Вы его психолог: то же, что у клиента',
  },
  { id: 'colleague', name: 'Коллега', mirror: 'Коллега', builtIn: true, caps: ['notes', 'files'], greeting: '', hint: 'Профессиональное общение; тесты и задания можно включить' },
  { id: 'supervisor', name: 'Супервизор', mirror: 'Супервизируемый', builtIn: true, caps: ['notes', 'schedule', 'files'], greeting: '', hint: 'Он ведёт вашу супервизию' },
  { id: 'student', name: 'Студент', mirror: 'Преподаватель', builtIn: true, caps: ['notes', 'tasks', 'schedule', 'files'], greeting: '', hint: 'Вы его преподаватель или наставник: можно присылать задания' },
  { id: 'seminar', name: 'Семинар', mirror: 'Участник семинара', builtIn: true, caps: ['notes', 'schedule', 'files'], greeting: '', hint: 'Вы вместе на одном семинаре' },
];

/** Заготовка своей роли: только заметки, остальное включаете сами */
export const CUSTOM_ROLE_CAPS: CapId[] = ['notes'];

// ——— Связь «чат — роль» ———

export type LinkStatus = 'pending' | 'active' | 'ended';

/** Роль в одном чате. На чат бывает несколько ролей, у каждой свои включённые возможности */
export interface RoleLink {
  id: string;
  roleId: string;
  /** pending: ждём ответа на приглашение; active: работаем; ended: работа завершена, история остаётся */
  status: LinkStatus;
  /** Кто предложил: вы (out) или собеседник (in) */
  dir: 'out' | 'in';
  /** Что включено в этом чате */
  caps: CapId[];
  /** На какие общие возможности собеседник согласился */
  agreed: CapId[];
  /** Дата начала, дд.мм.гггг */
  since: string;
}

/** Вкладка или пункт меню: open — работает или хотя бы читается, locked — ждёт согласия собеседника, hidden — не включена */
export type CapState = 'open' | 'locked' | 'hidden';

/**
 * Возможность работает прямо сейчас: включена хотя бы в одной роли чата. Своя работает, пока роль есть (в том числе и после завершения);
 * общая — только пока роль активна и собеседник согласился именно на неё.
 */
export function can(links: readonly RoleLink[], cap: CapId): boolean {
  const def = CAP_BY_ID[cap];
  if (def.soon) return false;
  return links.some((link) => link.caps.includes(cap) && (!def.shared || (link.status === 'active' && link.agreed.includes(cap))));
}

/**
 * Что показывать вместо вкладки. Завершённая работа оставляет общие вкладки читаемыми (история и ответы остаются),
 * но отправлять через них уже нельзя: см. can().
 */
export function capState(links: readonly RoleLink[], cap: CapId): CapState {
  const def = CAP_BY_ID[cap];
  if (def.soon) return 'hidden';
  if (can(links, cap)) return 'open';
  const on = links.filter((link) => link.caps.includes(cap));
  if (on.some((link) => link.status === 'ended' && link.agreed.includes(cap))) return 'open';
  return on.length ? 'locked' : 'hidden';
}

/**
 * Что написать на закрытой замком вкладке: почему она закрыта и что делать дальше. Без родов и склонений имени собеседника:
 * пол человека приложению не известен.
 */
export function lockNote(links: readonly RoleLink[], cap: CapId): { title: string; text: string } {
  const label = CAP_BY_ID[cap].label;
  const on = links.filter((link) => link.caps.includes(cap));
  if (on.some((link) => link.status === 'pending' && link.dir === 'in')) {
    return { title: 'Нужен ваш ответ', text: `Раздел «${label}» заработает, когда вы ответите на приглашение в диалоге.` };
  }
  if (on.some((link) => link.status === 'pending' || (link.status === 'active' && !link.agreed.includes(cap)))) {
    return { title: 'Ждём согласия', text: `Раздел «${label}» заработает, когда собеседник согласится на приглашение в диалоге.` };
  }
  return { title: 'Роль завершена', text: `Раздел «${label}» выключен: работа по этой роли закончена.` };
}

/** Подпись под именем: роли через запятую; ждущие ответа и завершённые помечены. Нет ролей — «Диалог» */
export function roleLine(links: readonly RoleLink[], nameOf: (roleId: string) => string): string {
  const names = (status: LinkStatus) => [...new Set(links.filter((link) => link.status === status).map((link) => nameOf(link.roleId)))];
  const active = names('active');
  const pending = names('pending');
  const ended = names('ended');
  // Если ответа ждут от вас, так и сказано: это единственное состояние, где что-то нужно сделать
  const mine = links.some((link) => link.status === 'pending' && link.dir === 'in');
  const wait = mine ? 'ждёт вашего ответа' : 'ждём ответа';
  if (active.length) return pending.length ? `${active.join(', ')} · ${wait}` : active.join(', ');
  if (pending.length) return `${pending.join(', ')} · ${wait}`;
  if (ended.length) return `${ended.join(', ')} · завершено`;
  return 'Диалог';
}

/** Роль внутри предложения: «Клиент» → «клиент». Аббревиатуры («ВИП-клиент», «IT») остаются как есть */
export function inSentence(name: string): string {
  const first = name.split(/[\s-]/)[0] ?? '';
  const capitals = Array.from(first).filter((ch) => ch !== ch.toLocaleLowerCase('ru-RU')).length;
  return capitals > 1 ? name : name.charAt(0).toLocaleLowerCase('ru-RU') + name.slice(1);
}

/** 21.10.2026 → «21 окт.» */
export function shortDate(date: string): string {
  const [day, month] = date.split('.');
  const names = ['янв.', 'февр.', 'марта', 'апр.', 'мая', 'июня', 'июля', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'];
  const name = names[Number(month) - 1];
  return name ? `${Number(day)} ${name}` : date;
}
