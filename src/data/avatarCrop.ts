/*
 * Как кадрирована фото профиля: у готовой аватарки помнится исходный снимок и положение кадра, чтобы «Изменить кадр» открывал целое фото,
 * а не уже обрезанный квадрат. Хранится в браузере рядом с профилем.
 */

export interface AvatarCrop {
  /** Снимок, из которого вырезана аватарка (id фото в галерее) */
  source: string;
  /** Центр кадра в долях ширины и высоты снимка */
  x: number;
  y: number;
  zoom: number;
}

const KEY = 'seans.avatarCrop';

function read(): Record<string, AvatarCrop> {
  try {
    const data: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '{}');
    return data && typeof data === 'object' ? (data as Record<string, AvatarCrop>) : {};
  } catch {
    return {};
  }
}

function write(map: Record<string, AvatarCrop>) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* хранилище недоступно: кадр не запомнится, аватарка останется */
  }
}

export const getAvatarCrop = (avatarId: string): AvatarCrop | undefined => read()[avatarId];

export function setAvatarCrop(avatarId: string, crop: AvatarCrop) {
  write({ ...read(), [avatarId]: crop });
}

export function clearAvatarCrop(avatarId: string) {
  const map = read();
  if (!(avatarId in map)) return;
  delete map[avatarId];
  write(map);
}
