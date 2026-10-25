import { useSyncExternalStore } from 'react';
import { CURRENT_USER } from './chats';
import { readFull, readThumbs, removePhotos, savePhoto } from './photoDb';
import { prepareImage } from '../utils/imageResize';

/*
 * Профиль специалиста. Имя, специализация, город и поля личной информации лежат в localStorage (маленький JSON, читается сразу),
 * фото — в IndexedDB (data/photoDb.ts). Так профиль переживает перезагрузку страницы, хотя остальные данные приложения пока только в памяти.
 * Если браузер хранилище не даёт, профиль работает до закрытия страницы, а `addPhotos` сообщает экрану, что фото не сохранились.
 *
 * Поля личной информации целиком в руках пользователя: любое можно переименовать, переставить и убрать, а новые — добавить
 * (свои или из подсказок вроде «Личный анализ»). Ничего обязательного нет.
 */

export interface ProfileField {
  id: string;
  /** Название поля: «Образование», «Личный анализ» — что человек напишет */
  label: string;
  /** Текст поля; переносы строк сохраняются */
  value: string;
}

interface ProfilePhoto {
  id: string;
  caption: string;
  addedAt: number;
}

/** То, что хранится в localStorage */
interface Stored {
  name: string;
  /** Специализация: «Психолог-консультант» */
  headline: string;
  city: string;
  fields: ProfileField[];
  /** Фото по порядку показа: новые первыми */
  photos: ProfilePhoto[];
  /** Какое из фото — аватар и обложка; null — стандартные */
  avatarId: string | null;
  coverId: string | null;
}

interface ProfileState extends Stored {
  /** Маленькие копии фото для сетки и аватара: id → адрес в памяти. Пока читаются из хранилища, их нет */
  thumbs: Record<string, string>;
  /** Снимки целиком для просмотра и обложки: подгружаются, когда нужны */
  fulls: Record<string, string>;
  /** Сколько фото обрабатывается прямо сейчас */
  uploading: number;
  /** Фото прочитаны из хранилища (до этого в сетке заготовки) */
  ready: boolean;
}

/** Подсказки при добавлении поля; уже добавленные не предлагаются, а убранные возвращаются сюда */
export const FIELD_SUGGESTIONS = [
  'Личный анализ',
  'Супервизия',
  'О себе',
  'Образование',
  'Подход',
  'Опыт работы',
  'С чем работаю',
  'Формат работы',
  'Сертификаты',
  'Языки',
  'Интересы',
  'Контакты',
];

/** Пример для первого запуска: всё это можно изменить и убрать */
const SEED: Stored = {
  name: 'Алексей Воронин',
  headline: 'Психолог-консультант',
  city: 'Екатеринбург',
  fields: [
    {
      id: 'about',
      label: 'О себе',
      value: 'Работаю с тревогой, выгоранием и трудностями в близких отношениях. Ценю спокойный темп, ясные договорённости и уважение к границам клиента.',
    },
    {
      id: 'education',
      label: 'Образование',
      value: 'Психологический факультет, специалитет. Профессиональная переподготовка по когнитивно-поведенческой терапии.',
    },
    { id: 'approach', label: 'Подход', value: 'Когнитивно-поведенческая терапия; психоаналитически ориентированная практика.' },
    { id: 'experience', label: 'Опыт работы', value: 'Шесть лет частной практики: индивидуальные консультации очно и онлайн.' },
  ],
  photos: [],
  avatarId: null,
  coverId: null,
};

// ---------------------------------------------------------------- хранение

const KEY = 'seans.profile.v1';

const isText = (value: unknown): value is string => typeof value === 'string';
const isId = (value: unknown): value is string | null => value === null || typeof value === 'string';

/** Данные из хранилища могли испортиться (правили руками, старая версия): берём то, что похоже на правду */
function sanitize(raw: unknown): Stored {
  if (!raw || typeof raw !== 'object') return SEED;
  const data = raw as Record<string, unknown>;
  const fields = Array.isArray(data.fields)
    ? data.fields.flatMap((item): ProfileField[] => {
        const f = item as Partial<ProfileField> | null;
        return f && isText(f.id) && isText(f.label) && isText(f.value) ? [{ id: f.id, label: f.label, value: f.value }] : [];
      })
    : SEED.fields;
  const photos = Array.isArray(data.photos)
    ? data.photos.flatMap((item): ProfilePhoto[] => {
        const p = item as Partial<ProfilePhoto> | null;
        return p && isText(p.id) ? [{ id: p.id, caption: isText(p.caption) ? p.caption : '', addedAt: typeof p.addedAt === 'number' ? p.addedAt : 0 }] : [];
      })
    : [];
  return {
    name: isText(data.name) ? data.name : SEED.name,
    headline: isText(data.headline) ? data.headline : SEED.headline,
    city: isText(data.city) ? data.city : SEED.city,
    fields,
    photos,
    avatarId: isId(data.avatarId) ? (data.avatarId ?? null) : null,
    coverId: isId(data.coverId) ? (data.coverId ?? null) : null,
  };
}

function readStored(): Stored {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return sanitize(JSON.parse(raw));
  } catch {
    // Хранилище закрыто или запись повреждена: начинаем с примера
  }
  return SEED;
}

let saveTimer: number | undefined;

function flush() {
  window.clearTimeout(saveTimer);
  saveTimer = undefined;
  const { name, headline, city, fields, photos, avatarId, coverId } = state;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ name, headline, city, fields, photos, avatarId, coverId } satisfies Stored));
  } catch {
    // Нет места или хранилище закрыто: профиль остаётся в памяти до закрытия страницы
  }
}

/** Печатают по букве: пишем не на каждую, а когда набор затих */
function scheduleSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(flush, 400);
}

// ---------------------------------------------------------------- состояние

let state: ProfileState = { ...readStored(), thumbs: {}, fulls: {}, uploading: 0, ready: false };
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function set(patch: Partial<ProfileState>, persist = true) {
  state = { ...state, ...patch };
  if (persist) scheduleSave();
  listeners.forEach((listener) => listener());
}

const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && saveTimer !== undefined && flush());
}

export const useProfile = (): ProfileState => useSyncExternalStore(subscribe, () => state);

/** Адрес аватара: фото профиля, стандартное или пустая строка, пока фото ещё читается из хранилища (чтобы не мелькало стандартное) */
export function avatarSrcOf(profile: ProfileState): string {
  if (!profile.avatarId) return CURRENT_USER.avatar;
  return profile.thumbs[profile.avatarId] ?? '';
}

/** Только аватар: перерисовывает того, кто его показывает, а не на каждую набранную букву */
export const useAvatarSrc = (): string => useSyncExternalStore(subscribe, () => avatarSrcOf(state));

/** Адрес обложки: снимок целиком, пока он грузится — маленькая копия; undefined — обложки нет */
export function coverSrcOf(profile: ProfileState): string | undefined {
  const id = profile.coverId;
  return id ? (profile.fulls[id] ?? profile.thumbs[id]) : undefined;
}

// ---------------------------------------------------------------- основное и поля

export function updateBasics(patch: Partial<Pick<Stored, 'name' | 'headline' | 'city'>>) {
  set(patch);
}

/** Новое поле в конец списка; возвращает его id, чтобы экран мог перейти к нему */
export function addField(label = ''): string {
  const id = uid('f');
  set({ fields: [...state.fields, { id, label, value: '' }] });
  return id;
}

export function updateField(id: string, patch: Partial<Pick<ProfileField, 'label' | 'value'>>) {
  set({ fields: state.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
}

/** На одно место выше (-1) или ниже (1) */
export function moveField(id: string, step: -1 | 1) {
  const from = state.fields.findIndex((f) => f.id === id);
  const to = from + step;
  if (from < 0 || to < 0 || to >= state.fields.length) return;
  const fields = [...state.fields];
  [fields[from], fields[to]] = [fields[to], fields[from]];
  set({ fields });
}

export function removeField(id: string) {
  set({ fields: state.fields.filter((f) => f.id !== id) });
}

/** Поля без названия и текста — брошенное «Добавить поле»: при выходе с экрана редактирования они убираются */
export function pruneEmptyFields() {
  const kept = state.fields.filter((f) => f.label.trim() || f.value.trim());
  if (kept.length !== state.fields.length) set({ fields: kept });
}

// ---------------------------------------------------------------- фото

const loadingFull = new Set<string>();

/** Прочитать маленькие копии при запуске: пока их нет, в сетке заготовки; записи без снимка в хранилище убираются */
void (async () => {
  let blobs: Map<string, Blob> | null = null;
  try {
    blobs = await readThumbs();
  } catch {
    blobs = null;
  }
  const thumbs = { ...state.thumbs };
  blobs?.forEach((blob, id) => {
    if (!thumbs[id]) thumbs[id] = URL.createObjectURL(blob);
  });
  const photos = state.photos.filter((p) => thumbs[p.id]);
  const has = (id: string | null) => (id && photos.some((p) => p.id === id) ? id : null);
  set({ thumbs, photos, avatarId: has(state.avatarId), coverId: has(state.coverId), ready: true });
  if (state.coverId) void ensureFull(state.coverId);
})();

/** Подгрузить снимок целиком (просмотр, обложка); повторные вызовы ничего не делают */
export async function ensureFull(id: string) {
  if (state.fulls[id] || loadingFull.has(id) || !state.photos.some((p) => p.id === id)) return;
  loadingFull.add(id);
  try {
    const blob = await readFull(id);
    if (blob && state.photos.some((p) => p.id === id) && !state.fulls[id]) {
      set({ fulls: { ...state.fulls, [id]: URL.createObjectURL(blob) } }, false);
    }
  } catch {
    // Снимка нет в хранилище: останется маленькая копия
  } finally {
    loadingFull.delete(id);
  }
}

/**
 * Добавить фото из выбранных файлов: каждое уменьшается и появляется в сетке сразу, как только готово.
 * Новые встают в начало в том порядке, в каком выбраны. Возвращает id добавленных, число файлов, которые не удалось открыть,
 * и число фото, которые браузер не дал сохранить (они есть до закрытия страницы).
 */
export async function addPhotos(files: File[]): Promise<{ added: string[]; failed: number; unsaved: number }> {
  const added: string[] = [];
  let failed = 0;
  let unsaved = 0;
  set({ uploading: state.uploading + files.length }, false);
  for (const file of files) {
    let prepared;
    try {
      prepared = await prepareImage(file);
    } catch {
      failed += 1;
      set({ uploading: state.uploading - 1 }, false);
      continue;
    }
    const { thumb, full } = prepared;
    const id = uid('p');
    const photo: ProfilePhoto = { id, caption: '', addedAt: Date.now() };
    const at = added.length;
    added.push(id);
    set({
      photos: [...state.photos.slice(0, at), photo, ...state.photos.slice(at)],
      thumbs: { ...state.thumbs, [id]: URL.createObjectURL(thumb) },
      fulls: { ...state.fulls, [id]: URL.createObjectURL(full) },
      uploading: state.uploading - 1,
    });
    try {
      await savePhoto(id, thumb, full);
    } catch {
      unsaved += 1;
    }
  }
  return { added, failed, unsaved };
}

export function setCaption(id: string, caption: string) {
  set({ photos: state.photos.map((p) => (p.id === id ? { ...p, caption } : p)) });
}

export function setAvatar(id: string | null) {
  set({ avatarId: id });
}

export function setCover(id: string | null) {
  set({ coverId: id });
  if (id) void ensureFull(id);
}

export function removePhoto(id: string) {
  const { [id]: thumb, ...thumbs } = state.thumbs;
  const { [id]: full, ...fulls } = state.fulls;
  set({
    photos: state.photos.filter((p) => p.id !== id),
    thumbs,
    fulls,
    avatarId: state.avatarId === id ? null : state.avatarId,
    coverId: state.coverId === id ? null : state.coverId,
  });
  // Адреса ещё могут стоять в <img> до следующей отрисовки: освобождаем чуть позже
  window.setTimeout(() => {
    if (thumb) URL.revokeObjectURL(thumb);
    if (full) URL.revokeObjectURL(full);
  }, 1000);
  removePhotos([id]).catch(() => undefined);
}
