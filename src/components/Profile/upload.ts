import type { ChangeEvent } from 'react';
import { addPhotos } from '../../data/profile';

/** Файлы из поля выбора; поле тут же очищается, чтобы тот же файл можно было выбрать ещё раз */
export function filesOf(event: ChangeEvent<HTMLInputElement>): File[] {
  const files = Array.from(event.target.files ?? []);
  event.target.value = '';
  return files;
}

/**
 * Добавить выбранные фото в профиль; о проблемах сообщает подсказкой (ok: false — подсказка уже показана).
 * Возвращает id добавленных по порядку выбора
 */
export async function uploadPhotos(files: File[], note: (text: string) => void): Promise<{ added: string[]; ok: boolean }> {
  if (files.length === 0) return { added: [], ok: true };
  const { added, failed, unsaved } = await addPhotos(files);
  if (failed > 0) {
    note(added.length > 0 ? 'Часть файлов не удалось открыть' : 'Не удалось открыть файл: выберите фото в формате JPG, PNG или WebP');
  } else if (unsaved > 0) {
    note('Браузер не дал сохранить фото: после закрытия страницы они пропадут');
  }
  return { added, ok: failed === 0 && unsaved === 0 };
}
