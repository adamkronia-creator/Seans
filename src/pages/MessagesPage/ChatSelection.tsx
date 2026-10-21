import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { IconArchiveMk, IconBellMk, IconCloseMk } from '../../components/ChatItem/ChatIcons';
import { IconTrash } from '../../components/ChatParts/ChatIcons';
import { ChipMenu, type ChipMenuItem } from '../../components/FolderMenu/ChipMenu';
import { IconBellOff, IconFolderPlus, IconPinned } from '../../components/FolderMenu/FolderIcons';
import { RemoveSheet } from '../../components/Profile/ProfileSheets';
import { clearHistory, deleteChats, setArchivedMany, setBlockedMany, setMutedMany, setPinnedMany } from '../../data/chatStore';
import type { Chat } from '../../data/chats';
import { setFolderItems, useFolders } from '../../data/folders';
import { plural } from '../../data/taskValues';

const CHATS: [string, string, string] = ['чат', 'чата', 'чатов'];
const count = (n: number) => `${n} ${plural(n, CHATS)}`;

/** Три точки по вертикали: «ещё» */
const IconMore = () => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="5.5" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="12" cy="18.5" r="1.8" />
  </svg>
);
/** Очистить историю: метла */
const IconBroom = () => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 4l-7.5 8M10.5 11.5l2 2M4 20c3.5 0 6-1.5 7-5l-2.5-2.5C6 14.5 5 17 4 20z" />
  </svg>
);
const IconBlock = () => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M6 6l12 12" />
  </svg>
);

/**
 * Выбор чатов в списке (как в Telegram): долгое нажатие на строку включает выбор, дальше строки выбираются нажатием. В шапке вместо
 * заголовка крестик, число выбранных и кнопки — уведомления, архив, удалить, «ещё» (закрепить, в папку, очистить историю, заблокировать).
 * После любого действия выбор снимается. «Избранное» не выбирается: у него нет ни архива, ни удаления.
 */
export function useChatSelection(say: (text: string) => void) {
  const [ids, setIds] = useState<string[]>([]);
  const [menu, setMenu] = useState<{ kind: 'more' | 'folder'; rect: DOMRect; opener: HTMLElement } | null>(null);
  const [ask, setAsk] = useState<'delete' | 'clear' | null>(null);
  const folders = useFolders('chats');
  const selecting = ids.length > 0;

  const toggle = useCallback((chat: Chat) => {
    if (chat.favorites) return;
    setIds((prev) => (prev.includes(chat.id) ? prev.filter((id) => id !== chat.id) : [...prev, chat.id]));
  }, []);
  const clear = useCallback(() => setIds([]), []);

  useEffect(() => {
    if (!selecting) return;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && !menu && !ask && clear();
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [selecting, menu, ask, clear]);

  /** Нужны сами чаты, чтобы знать, закреплены ли они и без звука ли: список приходит из страницы при каждом показе шапки */
  const header = (all: Chat[]): ReactNode => {
    if (!selecting) return undefined;
    const picked = all.filter((c) => ids.includes(c.id));
    const n = ids.length;
    const allMuted = picked.length > 0 && picked.every((c) => c.muted);
    const allPinned = picked.length > 0 && picked.every((c) => c.pinned);
    const done = (text: string) => {
      say(text);
      clear();
    };
    const more = (kind: 'more' | 'folder', el: HTMLElement) => setMenu({ kind, rect: el.getBoundingClientRect(), opener: el });
    const moreItems: ChipMenuItem[] = [
      {
        key: 'pin',
        label: allPinned ? 'Открепить' : 'Закрепить',
        Icon: IconPinned,
        run: () => {
          setPinnedMany(ids, !allPinned);
          done(allPinned ? `Откреплено: ${count(n)}` : `Закреплено: ${count(n)}`);
        },
      },
      { key: 'folder', label: 'Добавить в папку', Icon: IconFolderPlus, run: () => more('folder', menu?.opener ?? document.body) },
      { key: 'clear', label: 'Очистить историю', Icon: IconBroom, run: () => setAsk('clear') },
      {
        key: 'block',
        label: 'Заблокировать',
        Icon: IconBlock,
        danger: true,
        run: () => {
          setBlockedMany(ids, true);
          done(n === 1 ? `«${picked[0]?.name ?? 'Чат'}» заблокирован` : `Заблокировано: ${count(n)}`);
        },
      },
    ];
    const folderItems: ChipMenuItem[] = folders.map((f) => ({
      key: `folder-${f.id}`,
      label: f.name,
      Icon: IconFolderPlus,
      run: () => {
        setFolderItems('chats', f.id, [...new Set([...f.ids, ...ids])]);
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
          aria-label={allMuted ? 'Включить уведомления' : 'Отключить уведомления'}
          onClick={() => {
            setMutedMany(ids, !allMuted);
            done(allMuted ? `Уведомления включены: ${count(n)}` : `Уведомления выключены: ${count(n)}`);
          }}
        >
          {allMuted ? <IconBellMk /> : <IconBellOff />}
        </button>
        <button
          type="button"
          className="chats-header__action"
          aria-label="В архив"
          onClick={() => {
            setArchivedMany(ids, true);
            done(n === 1 ? `«${picked[0]?.name ?? 'Чат'}» перенесён в архив` : `В архив перенесено: ${count(n)}`);
          }}
        >
          <IconArchiveMk />
        </button>
        <button type="button" className="chats-header__action" aria-label="Удалить" onClick={() => setAsk('delete')}>
          <IconTrash />
        </button>
        <button type="button" className="chats-header__action" aria-label="Ещё" aria-haspopup="menu" onClick={(e) => more('more', e.currentTarget)}>
          <IconMore />
        </button>
        {menu && <ChipMenu anchor={menu.rect} opener={menu.opener} items={menu.kind === 'more' ? moreItems : folderItems.length ? folderItems : [{ key: 'none', label: 'Папок пока нет', Icon: IconFolderPlus, run: () => say('Создайте папку: удерживайте чипс «Все»') }]} onClose={() => setMenu(null)} />}
        {ask === 'delete' && (
          <RemoveSheet
            title={`Удалить ${count(n)}?`}
            text="Чаты вместе с перепиской будут удалены без возможности восстановления."
            confirm="Удалить"
            onClose={() => setAsk(null)}
            onConfirm={() => {
              deleteChats(ids);
              setAsk(null);
              done(`Удалено: ${count(n)}`);
            }}
          />
        )}
        {ask === 'clear' && (
          <RemoveSheet
            title="Очистить историю?"
            text="Переписка будет удалена, а сами чаты останутся в списке."
            confirm="Очистить"
            onClose={() => setAsk(null)}
            onConfirm={() => {
              clearHistory(ids);
              setAsk(null);
              done(`История очищена: ${count(n)}`);
            }}
          />
        )}
      </>
    );
  };

  return { ids, selecting, toggle, clear, header };
}
