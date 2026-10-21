/**
 * Внешний вид фона (временные настройки): своя картинка, размытие и цвет текста.
 * Всё хранится в localStorage и применяется при запуске. Цвет текста «авто» считается по яркости фона: на тёмном фоне текст белый,
 * на светлом тёмный (атрибут data-ink на <html>: dark — тёмный текст, light — белый).
 */
import dawn from '../assets/bg-default.webp';
import dawnSoft from '../assets/bg-dawn.webp';

const K_IMAGE = 'seans-bg-image';
const K_VARIANT = 'seans-bg';
const K_BLUR = 'seans-blur';
const K_INK = 'seans-ink';
/** Отметка: настройки фона сброшены под новый фон по умолчанию */
const K_RESET = 'seans-bg-default-2';
/** Список загруженных фонов (JSON: [{id, data}]) и id выбранного */
const K_LIST = 'seans-bg-list';
const MAX_SAVED = 8;
const MAX_SIDE = 1600;
/** Средняя яркость фона (0…1) ниже этого порога — текст белый */
const DARK_BELOW = 0.5;

export type InkPref = 'auto' | 'dark' | 'light';
export const DEFAULT_BLUR = 60;

const root = () => document.documentElement;
const get = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const set = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* хранилище недоступно: настройка действует до перезагрузки */
  }
};

export const getBlur = () => {
  const v = get(K_BLUR);
  return v !== null && /^\d{1,2}$/.test(v) ? Math.min(60, Number(v)) : DEFAULT_BLUR;
};
export const getInkPref = (): InkPref => {
  const v = get(K_INK);
  return v === 'dark' || v === 'light' || v === 'auto' ? v : 'light';
};

/** Яркость картинки: среднее по уменьшенной копии (формула относительной яркости) */
async function luminanceOf(src: string): Promise<number> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const w = 32;
  const h = Math.max(1, Math.round((32 * img.naturalHeight) / img.naturalWidth));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
  return sum / (d.length / 4);
}

/** Яркость текущего фона: своя картинка, картинка варианта ?bg или светлый градиент */
async function sceneLuminance(): Promise<number> {
  const custom = get(K_IMAGE);
  if (custom) return luminanceOf(custom);
  const variant = root().dataset.bg;
  if (variant === '1') return luminanceOf(dawn);
  if (variant === '3') return luminanceOf(dawnSoft);
  return 0.9; // градиент и вариант под белой вуалью светлые
}

/** Белый текст — тёмная тема системных панелей (строка состояния браузера, полосы прокрутки, поля), тёмный — светлая */
function syncChrome() {
  const light = root().dataset.ink === 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#12141B' : '#FFFFFF');
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', light ? 'dark' : 'only light');
}

/** Выставляет data-ink по выбору; в режиме «авто» считает по фону */
export async function applyInk() {
  const pref = getInkPref();
  if (pref !== 'auto') {
    root().dataset.ink = pref;
  } else {
    try {
      root().dataset.ink = (await sceneLuminance()) < DARK_BELOW ? 'light' : 'dark';
    } catch {
      root().dataset.ink = 'dark';
    }
  }
  syncChrome();
}

export function setInkPref(pref: InkPref) {
  set(K_INK, pref);
  void applyInk();
}

export function setBlur(px: number) {
  const v = Math.max(0, Math.min(60, Math.round(px)));
  set(K_BLUR, String(v));
  root().style.setProperty('--bg-blur', `${v}px`);
}

function show(dataUrl: string) {
  root().style.setProperty('--user-bg', `url("${dataUrl}")`);
  root().dataset.bg = 'custom';
}

export const hasCustomBackground = () => get(K_IMAGE) !== null;

export interface SavedBackground {
  id: string;
  data: string;
}

/** Загруженные фоны: новые первыми. Прежний одиночный фон (seans-bg-image) входит в список при первом чтении */
export function getBackgrounds(): SavedBackground[] {
  let list: SavedBackground[] = [];
  try {
    const parsed = JSON.parse(get(K_LIST) ?? '[]');
    if (Array.isArray(parsed)) list = parsed.filter((b) => b && typeof b.id === 'string' && typeof b.data === 'string');
  } catch {
    list = [];
  }
  const current = get(K_IMAGE);
  if (current && !list.some((b) => b.data === current)) list = [{ id: `b${Date.now()}`, data: current }, ...list];
  return list;
}

function saveList(list: SavedBackground[]) {
  // Не влезло в хранилище — убираем самые старые, пока не поместится
  const next = list.slice(0, MAX_SAVED);
  for (;;) {
    try {
      localStorage.setItem(K_LIST, JSON.stringify(next));
      return next;
    } catch {
      if (next.length <= 1) return next;
      next.pop();
    }
  }
}

/** id выбранного загруженного фона; null — фон по умолчанию */
export function currentBackgroundId(): string | null {
  const current = get(K_IMAGE);
  return current ? (getBackgrounds().find((b) => b.data === current)?.id ?? null) : null;
}

/** Выбрать загруженный фон по id */
export async function selectBackground(id: string) {
  const found = getBackgrounds().find((b) => b.id === id);
  if (!found) return;
  set(K_IMAGE, found.data);
  show(found.data);
  await applyInk();
}

/** Удалить загруженный фон; если он был выбран, возвращается фон по умолчанию */
export function removeBackground(id: string) {
  const list = getBackgrounds();
  const gone = list.find((b) => b.id === id);
  saveList(list.filter((b) => b.id !== id));
  if (gone && gone.data === get(K_IMAGE)) resetBackground();
}

/** Читает файл, уменьшает, запоминает в списке и включает как фон; false, если это не картинка */
export async function setBackgroundFromFile(file: File): Promise<boolean> {
  if (!file.type.startsWith('image/')) return false;
  try {
    const bitmap = await createImageBitmap(file);
    const k = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * k);
    canvas.height = Math.round(bitmap.height * k);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/jpeg', 0.85);
    saveList([{ id: `b${Date.now()}`, data }, ...getBackgrounds()]);
    set(K_IMAGE, data);
    show(data);
    await applyInk();
    return true;
  } catch {
    return false;
  }
}

/** Возвращает фон приложения по умолчанию (картинка рассвета); загруженные фоны остаются в списке */
export function resetBackground() {
  set(K_IMAGE, null);
  set(K_VARIANT, null);
  root().style.removeProperty('--user-bg');
  root().dataset.bg = '1';
  void applyInk();
}

/** Запуск: варианты ?bg=0…3 и ?blur=0…60 из адреса (запоминаются, ?bg снимает свою картинку), затем сохранённые настройки */
export function initAppearance() {
  // Фон по умолчанию сменился (портрет, размытие 60, белый текст): один раз сбрасываем прежние локальные настройки; список своих фонов остаётся
  if (get(K_RESET) !== '1') {
    set(K_IMAGE, null);
    set(K_VARIANT, null);
    set(K_BLUR, null);
    set(K_INK, null);
    set(K_RESET, '1');
  }
  const q = new URLSearchParams(window.location.search);
  const bg = q.get('bg');
  if (bg !== null && /^[0-3]$/.test(bg)) {
    set(K_VARIANT, bg);
    set(K_IMAGE, null);
  }
  const blur = q.get('blur');
  if (blur !== null && /^\d{1,2}$/.test(blur) && Number(blur) <= 60) set(K_BLUR, blur);
  root().dataset.bg = get(K_VARIANT) ?? '1';
  root().style.setProperty('--bg-blur', `${getBlur()}px`);
  const image = get(K_IMAGE);
  if (image) show(image);
  void applyInk();
}
