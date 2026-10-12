/*
 * Фото профиля лежат в IndexedDB браузера: в localStorage они не поместились бы (там около 5 МБ на всё),
 * а здесь места хватает на сотни снимков. Два хранилища: «thumbs» — маленькие копии для сетки и аватара
 * (читаются все сразу при запуске) и «fulls» — снимки для просмотра и обложки (читаются по одному, когда нужны).
 *
 * Если браузер хранилище не даёт (закрытое окно, нет места), функции возвращают ошибку, а профиль продолжает работать из памяти.
 */

const NAME = 'seans-profile';
const THUMBS = 'thumbs';
const FULLS = 'fulls';

let opened: Promise<IDBDatabase> | undefined;

function open(): Promise<IDBDatabase> {
  opened ??= new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB недоступна'));
      return;
    }
    const request = indexedDB.open(NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(THUMBS);
      request.result.createObjectStore(FULLS);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Не удалось открыть хранилище'));
    request.onblocked = () => reject(new Error('Хранилище занято другой вкладкой'));
  });
  return opened;
}

const result = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const finished = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Запись отменена'));
  });

/** Сохранить фото: маленькую копию и снимок целиком одной записью */
export async function savePhoto(id: string, thumb: Blob, full: Blob): Promise<void> {
  const db = await open();
  const tx = db.transaction([THUMBS, FULLS], 'readwrite');
  tx.objectStore(THUMBS).put(thumb, id);
  tx.objectStore(FULLS).put(full, id);
  await finished(tx);
}

/** Все маленькие копии: id → снимок */
export async function readThumbs(): Promise<Map<string, Blob>> {
  const db = await open();
  const store = db.transaction(THUMBS, 'readonly').objectStore(THUMBS);
  const [keys, values] = await Promise.all([result(store.getAllKeys()), result(store.getAll() as IDBRequest<Blob[]>)]);
  return new Map(keys.map((key, i) => [String(key), values[i]]));
}

/** Снимок целиком; undefined, если его нет */
export async function readFull(id: string): Promise<Blob | undefined> {
  const db = await open();
  return (await result(db.transaction(FULLS, 'readonly').objectStore(FULLS).get(id))) as Blob | undefined;
}

export async function removePhotos(ids: string[]): Promise<void> {
  const db = await open();
  const tx = db.transaction([THUMBS, FULLS], 'readwrite');
  ids.forEach((id) => {
    tx.objectStore(THUMBS).delete(id);
    tx.objectStore(FULLS).delete(id);
  });
  await finished(tx);
}
