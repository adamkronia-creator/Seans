import { ensureFull } from '../data/profile';

/** Снимок целиком как файл; если целиком ещё не прочитан — маленькая копия */
async function fileOf(id: string, fulls: Record<string, string>, thumbs: Record<string, string>, name: string): Promise<File | null> {
  await ensureFull(id);
  const url = fulls[id] ?? thumbs[id];
  if (!url) return null;
  try {
    const blob = await (await fetch(url)).blob();
    return new File([blob], name, { type: blob.type || 'image/jpeg' });
  } catch {
    return null;
  }
}

const extOf = (type: string) => (type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg');

/** Скачать фото на устройство (по одному файлу на фото) */
export async function downloadPhotos(ids: string[], fulls: Record<string, string>, thumbs: Record<string, string>): Promise<number> {
  let done = 0;
  for (const id of ids) {
    const file = await fileOf(id, fulls, thumbs, 'photo');
    if (!file) continue;
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seans-${id}.${extOf(file.type)}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    done += 1;
  }
  return done;
}

/** Поделиться: системное окно «Поделиться» с файлами; там, где его нет, ничего не отправляется и возвращается false */
export async function sharePhotos(ids: string[], fulls: Record<string, string>, thumbs: Record<string, string>): Promise<boolean> {
  const files: File[] = [];
  for (const id of ids) {
    const file = await fileOf(id, fulls, thumbs, `seans-${id}.jpg`);
    if (file) files.push(file);
  }
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  try {
    if (files.length && nav.canShare?.({ files })) {
      await navigator.share({ files });
      return true;
    }
    if (navigator.share) {
      await navigator.share({ title: 'Фото из Сеанса', url: window.location.href });
      return true;
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return true;
  }
  return false;
}

export async function copyLink(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(window.location.href);
    return true;
  } catch {
    return false;
  }
}

/** Свой адрес картинки для сообщения: фото можно удалить из профиля, а в переписке оно должно остаться */
export async function messageImage(id: string, fulls: Record<string, string>, thumbs: Record<string, string>): Promise<string | null> {
  const file = await fileOf(id, fulls, thumbs, 'photo');
  return file ? URL.createObjectURL(file) : null;
}
