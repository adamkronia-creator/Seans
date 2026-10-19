/**
 * Временный выбор фона: файл с устройства становится фоном приложения (вместо варианта ?bg).
 * Картинка уменьшается до 1600 px по длинной стороне, хранится в localStorage как JPEG и подставляется в --user-bg.
 */
const KEY = 'seans-bg-image';
const MAX_SIDE = 1600;

/** Подставляет сохранённую картинку при запуске; вернёт true, если она есть и включена */
export function applyStoredBackground(): boolean {
  try {
    const data = localStorage.getItem(KEY);
    if (!data) return false;
    show(data);
    return true;
  } catch {
    return false;
  }
}

function show(dataUrl: string) {
  const root = document.documentElement;
  root.style.setProperty('--user-bg', `url("${dataUrl}")`);
  root.dataset.bg = 'custom';
}

/** Сбрасывает свою картинку (вернутся варианты ?bg) */
export function clearBackground() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* хранилище недоступно */
  }
  document.documentElement.style.removeProperty('--user-bg');
  document.documentElement.dataset.bg = localStorage.getItem('seans-bg') ?? '1';
}

/** Читает файл, уменьшает и включает как фон; false, если файл не удалось прочитать как картинку */
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
    show(data);
    try {
      localStorage.setItem(KEY, data);
    } catch {
      /* не поместилась в хранилище: фон действует до перезагрузки */
    }
    return true;
  } catch {
    return false;
  }
}
