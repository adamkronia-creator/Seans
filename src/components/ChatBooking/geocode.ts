/*
 * Бесплатная карта без ключей: адрес превращается в точку через Nominatim (поиск OpenStreetMap), а точку показывает
 * встроенная карта openstreetmap.org. Обращение к сервисам идет только после нажатия «Показать на карте»,
 * пока пользователь не нажал, на сторонние адреса ничего не отправляется.
 * Правила Nominatim: не чаще запроса в секунду, без автодополнения, ответы кешируем.
 */

export interface Point {
  lat: number;
  lon: number;
}

/** Найденные адреса; null — сервис ответил, но такого адреса не знает (ошибки сети не запоминаем) */
const cache = new Map<string, Point | null>();

const norm = (address: string) => address.trim().replace(/\s+/g, ' ').toLowerCase();

/** Адрес целиком и без последней части («оф. 91», «3 этаж»): подробности, которых нет в базе карт */
export function addressVariants(address: string): string[] {
  const parts = address
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const variants = [parts.join(', ')];
  if (parts.length > 2) variants.push(parts.slice(0, -1).join(', '));
  return variants.filter((v, i) => v && variants.indexOf(v) === i);
}

const pause = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });

/** Координаты адреса или null, если адрес не найден. Ошибка сети или таймаут — исключение */
export async function geocode(address: string, signal: AbortSignal): Promise<Point | null> {
  const key = norm(address);
  const known = cache.get(key);
  if (known !== undefined) return known;
  let found: Point | null = null;
  const variants = addressVariants(address);
  for (let i = 0; i < variants.length; i += 1) {
    if (i > 0) await pause(1100, signal);
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=ru&q=${encodeURIComponent(variants[i])}`;
    const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Геокодер ответил ${response.status}`);
    const rows = (await response.json()) as { lat?: string; lon?: string }[];
    const lat = Number(rows[0]?.lat);
    const lon = Number(rows[0]?.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      found = { lat, lon };
      break;
    }
  }
  cache.set(key, found);
  return found;
}

/** Встроенная карта OpenStreetMap с меткой; масштаб — улица и соседние дома */
export function embedUrl({ lat, lon }: Point): string {
  const dLon = 0.0035;
  const dLat = 0.0017;
  const bbox = [lon - dLon, lat - dLat, lon + dLon, lat + dLat].map((n) => n.toFixed(5)).join('%2C');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(5)}%2C${lon.toFixed(5)}`;
}

/** Открыть адрес в приложении или на сайте карт: все ссылки работают без ключей */
export const MAP_LINKS: { id: string; name: string; url: (address: string) => string }[] = [
  { id: 'yandex', name: 'Яндекс Карты', url: (q) => `https://yandex.ru/maps/?text=${encodeURIComponent(q)}` },
  { id: '2gis', name: '2ГИС', url: (q) => `https://2gis.ru/search/${encodeURIComponent(q)}` },
  { id: 'osm', name: 'OpenStreetMap', url: (q) => `https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}` },
  { id: 'google', name: 'Google Карты', url: (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` },
];
