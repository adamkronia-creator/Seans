/** Событие на window: текст скопирован. В detail — элемент, на который нажали (значок «копировать» в той же кнопке становится галочкой) */
export const COPIED_EVENT = 'app:copied';

/**
 * Копирует текст в буфер обмена. Сначала обычным способом; где он закрыт (небезопасное соединение, встроенный просмотр),
 * через временное поле. Вернёт, получилось ли.
 */
export async function copyText(text: string): Promise<boolean> {
  // Нажатие видно только пока обработчик не дошёл до первого await: запоминаем, откуда пошло копирование
  const target = window.event?.target;
  const source = target instanceof Node ? target : null;
  const ok = await write(text);
  if (ok) window.dispatchEvent(new CustomEvent(COPIED_EVENT, { detail: source }));
  return ok;
}

async function write(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // запрет на запись: пробуем запасной способ
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}
