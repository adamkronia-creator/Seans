/** Вертикальный сдвиг и плавное затухание ряда, который уходит под шапку при прокрутке. */
export function floatingRowProgress(height: number, scrollTop: number) {
  const offset = Math.min(height, Math.max(0, scrollTop));
  const visible = 1 - offset / Math.max(1, height);
  return { offset, opacity: visible * visible * (3 - 2 * visible) };
}
