/*
 * Аватарки без фото, как в Telegram: цветной градиент и инициалы. Рисуются как SVG и отдаются адресом data:, поэтому подходят
 * везде, где нужен src картинки (аватар в списке, шапке, строке участника). Цвет берётся из названия: одно имя — один цвет.
 */

/** Пары цветов градиента сверху вниз: те же семь оттенков, что у аватарок в Telegram */
const GRADIENTS: Array<[string, string]> = [
  ['#FF885E', '#FF516A'],
  ['#FFCD6A', '#FFA85C'],
  ['#82B1FF', '#665FFF'],
  ['#A0DE7E', '#54CB68'],
  ['#53EDD6', '#28C9B7'],
  ['#72D5FD', '#2A9EF1'],
  ['#E0A2F3', '#D669ED'],
];

/** Число 0…6 из строки: устойчиво, без зависимости от порядка создания */
export function colorIndex(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash % GRADIENTS.length;
}

/** Инициалы: первые буквы первых двух слов; эмодзи, знаки и цифры в начале слов пропускаются (цифры берутся, если букв нет) */
export function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const letters = words.map((w) => Array.from(w).find((ch) => /\p{L}/u.test(ch)) ?? '').filter(Boolean);
  if (letters.length === 0) return Array.from(name.trim()).find((ch) => /[\p{L}\p{N}]/u.test(ch))?.toUpperCase() ?? '?';
  return letters.slice(0, 2).join('').toUpperCase();
}

interface Parts {
  from: string;
  to: string;
  text: string;
  size: number;
}

const cache = new Map<string, string>();
/** Из чего собрана каждая выданная картинка: по адресу можно нарисовать её же в другом виде (для шапки профиля) */
const parts = new Map<string, Parts>();
const heroCache = new Map<string, string>();

function draw({ from, to, text, size }: Parts, height: number, y: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 ${height}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>` +
    `<rect width="128" height="${height}" fill="url(#g)"/>` +
    `<text x="64" y="${y}" dy=".35em" text-anchor="middle" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="${size}" font-weight="600" fill="#fff">${text}</text>` +
    '</svg>';
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Адрес картинки-аватарки для названия; seed — что определяет цвет (по умолчанию само название) */
export function initialsAvatar(name: string, seed: string = name): string {
  const key = `${name}\u0000${seed}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const [from, to] = GRADIENTS[colorIndex(seed)];
  const text = initialsOf(name).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const size = Array.from(text).length > 1 ? 52 : 60;
  const piece = { from, to, text, size };
  const uri = draw(piece, 128, 64);
  cache.set(key, uri);
  parts.set(uri, piece);
  return uri;
}

/** Эта картинка нарисована здесь (цветные инициалы), а не загружена человеком */
export const isGenerated = (src: string): boolean => parts.has(src);

/**
 * Та же аватарка для шапки профиля. Фото там растянуто на всю ширину, и инициалы выросли бы вдвое против привычного, а нижнюю треть
 * закрывает дымка с именем: буквы делаем мельче и поднимаем выше. Настоящее фото возвращается как есть.
 */
export function heroAvatar(src: string): string {
  const piece = parts.get(src);
  if (!piece) return src;
  const hit = heroCache.get(src);
  if (hit) return hit;
  const uri = draw({ ...piece, size: Math.round(piece.size * 0.6) }, 138, 50);
  heroCache.set(src, uri);
  return uri;
}

/** Номер цвета имени автора сообщения в группе (0…6): цвет задан в CSS (--author-0 … --author-6), для светлой и тёмной темы свой */
export const authorIndex = colorIndex;
