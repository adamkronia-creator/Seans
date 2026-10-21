import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { IconCloseMk } from '../../components/ChatItem/ChatIcons';
import { ChipMenu, type ChipMenuItem } from '../../components/FolderMenu/ChipMenu';
import { IconFolderPlus, IconPinned } from '../../components/FolderMenu/FolderIcons';
import { RecipientSheet } from '../../components/TestSettings/TestActions';
import { setFolderItems, useFolders, type FolderScope } from '../../data/folders';
import type { LibraryItem } from '../../data/library';
import { plural } from '../../data/taskValues';
import { guardBack } from '../../router';
import { IconHeartGray, IconHeartRed } from '../../components/icons';

/** Окно настроек тянет за собой экраны настройки теста и задания: грузится только когда понадобилось */
const SendBatchSheet = lazy(() => import('../../components/TestSettings/SendBatch').then((m) => ({ default: m.SendBatchSheet })));

interface Options {
  kind: 'test' | 'task';
  scope: FolderScope;
  /** Все материалы раздела по id: из них берутся выбранные */
  byId: ReadonlyMap<string, LibraryItem>;
  favorites: ReadonlySet<string>;
  pinned: ReadonlySet<string>;
  onSetFavorites: (ids: string[], on: boolean) => void;
  onSetPinned: (ids: string[], on: boolean) => void;
  /** Подсказка внизу экрана */
  say: (text: string) => void;
  /** Можно ли отправить материал: у части заданий настроек пока нет */
  canSend: (item: LibraryItem) => boolean;
}

/**
 * Выбор нескольких тестов или заданий (долгое нажатие, как в «Диалогах»): в шапке ✕, число и кнопки «в избранное», «закрепить» и «в папку»,
 * над панелью разделов активная кнопка «Отправить». Дальше окно получателей (себе и клиентам) и окно настроек всех выбранных материалов,
 * где их можно поменять до отправки. Системная «назад» снимает выбор.
 */
export function useLibrarySelection(o: Options) {
  const [ids, setIds] = useState<string[]>([]);
  const [menu, setMenu] = useState<{ rect: DOMRect; opener: HTMLElement } | null>(null);
  const [stage, setStage] = useState<null | 'recipients' | 'settings'>(null);
  const [to, setTo] = useState<string[]>([]);
  const folders = useFolders(o.scope);
  const selecting = ids.length > 0;
  const noun: [string, string, string] = o.kind === 'test' ? ['тест', 'теста', 'тестов'] : ['задание', 'задания', 'заданий'];
  const count = (n: number) => `${n} ${plural(n, noun)}`;

  const toggle = useCallback((item: LibraryItem) => setIds((prev) => (prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id])), []);
  const clear = useCallback(() => setIds([]), []);

  /** Долгое нажатие: выбирает строку. Список тут же сдвигается (истории сворачиваются), и отпускание пальца может попасть в соседнюю строку, поэтому
      клик сразу после него (пока палец на экране и ещё 400 мс после) не считается нажатием */
  const heldAt = useRef(0);
  const hold = useCallback(
    (item: LibraryItem) => {
      heldAt.current = Infinity;
      const release = () => {
        heldAt.current = Date.now();
        window.removeEventListener('pointerup', release, true);
        window.removeEventListener('pointercancel', release, true);
      };
      window.addEventListener('pointerup', release, true);
      window.addEventListener('pointercancel', release, true);
      toggle(item);
    },
    [toggle],
  );
  const justHeld = useCallback(() => Date.now() - heldAt.current < 400, []);

  // Системная «назад» снимает выбор, а не уводит со страницы
  useEffect(() => {
    if (!selecting) return;
    return guardBack(clear);
  }, [selecting, clear]);

  useEffect(() => {
    if (!selecting) return;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && !menu && !stage && clear();
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [selecting, menu, stage, clear]);

  // Выбранный материал мог исчезнуть из каталога: берём только те, что есть
  const picked = ids.map((id) => o.byId.get(id)).filter((x): x is LibraryItem => Boolean(x));
  const n = picked.length;
  const done = (text: string) => {
    o.say(text);
    clear();
  };

  const header = (): ReactNode => {
    if (!selecting) return undefined;
    const allFav = picked.every((p) => o.favorites.has(p.id));
    const allPinned = picked.every((p) => o.pinned.has(p.id));
    const folderItems: ChipMenuItem[] = folders.map((f) => ({
      key: f.id,
      label: f.name,
      Icon: IconFolderPlus,
      run: () => {
        setFolderItems(o.scope, f.id, [...new Set([...f.ids, ...ids])]);
        done(`Добавлено в папку «${f.name}»: ${count(n)}`);
      },
    }));
    return (
      <>
        <button type="button" className="chats-header__action" aria-label="Отменить выбор" onClick={clear}>
          <IconCloseMk />
        </button>
        <span key={n} className="chats-header__count" aria-live="polite">
          {n}
        </span>
        <button
          type="button"
          className="chats-header__action"
          aria-label={allFav ? 'Убрать из избранного' : 'Добавить в избранное'}
          onClick={() => {
            o.onSetFavorites(ids, !allFav);
            done(allFav ? `Убрано из избранного: ${count(n)}` : `Добавлено в избранное: ${count(n)}`);
          }}
        >
          {allFav ? <IconHeartRed className="lib-sel__heart" /> : <IconHeartGray className="lib-sel__heart" />}
        </button>
        <button
          type="button"
          className="chats-header__action"
          aria-label={allPinned ? 'Открепить' : 'Закрепить'}
          onClick={() => {
            o.onSetPinned(ids, !allPinned);
            done(allPinned ? `Откреплено: ${count(n)}` : `Закреплено: ${count(n)}`);
          }}
        >
          <IconPinned />
        </button>
        <button
          type="button"
          className="chats-header__action"
          aria-label="Добавить в папку"
          aria-haspopup="menu"
          onClick={(e) => setMenu({ rect: e.currentTarget.getBoundingClientRect(), opener: e.currentTarget })}
        >
          <IconFolderPlus />
        </button>
        {menu && (
          <ChipMenu
            anchor={menu.rect}
            opener={menu.opener}
            items={folderItems.length ? folderItems : [{ key: 'none', label: 'Папок пока нет', Icon: IconFolderPlus, run: () => o.say('Создайте папку: удерживайте чипс «Все»') }]}
            onClose={() => setMenu(null)}
          />
        )}
      </>
    );
  };

  /** Кнопка «Отправить» над панелью разделов и окна отправки; живут рядом со страницей, а не в шапке */
  const send = (): ReactNode => {
    if (!selecting) return null;
    const sendable = picked.filter(o.canSend);
    return (
      <>
        <div className="library-send">
          <button
            type="button"
            className="library-send__button"
            disabled={n === 0}
            onClick={() => {
              if (sendable.length === 0) o.say(o.kind === 'task' ? 'У выбранных заданий пока нет настроек для отправки' : 'Выбранное нельзя отправить');
              else setStage('recipients');
            }}
          >
            {n > 1 ? `Отправить (${n})` : 'Отправить'}
          </button>
        </div>
        {stage === 'recipients' && (
          <RecipientSheet
            mode="many"
            onClose={() => setStage(null)}
            onSend={(chosen) => {
              setTo(chosen);
              setStage('settings');
            }}
          />
        )}
        {stage === 'settings' && (
          <Suspense fallback={null}>
          <SendBatchSheet
            kind={o.kind}
            items={sendable}
            recipients={to}
            onBack={() => setStage('recipients')}
            onSent={(sent, skipped) => {
              setStage(null);
              const who = to.length === 1 ? (to[0] === 'favorites' ? 'вам: в «Избранном»' : '1 получателю') : `${to.length} получателям`;
              done(`Отправлено ${who}: ${count(sent)}${skipped > 0 ? `; без настроек пропущено: ${skipped + (n - sendable.length)}` : n > sendable.length ? `; без настроек пропущено: ${n - sendable.length}` : ''}`);
            }}
          />
          </Suspense>
        )}
      </>
    );
  };

  return { ids, selecting, toggle, hold, justHeld, clear, header, send };
}
