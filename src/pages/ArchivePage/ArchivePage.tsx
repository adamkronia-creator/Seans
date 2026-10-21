import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatItem } from '../../components/ChatItem/ChatItem';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { ChipMenu } from '../../components/FolderMenu/ChipMenu';
import { IconArchive, IconUnarchive } from '../../components/FolderMenu/FolderIcons';
import { IconSearchMk } from '../../components/ChatItem/ChatIcons';
import { IconBack } from '../../components/icons';
import { SearchField } from '../../components/SearchField/SearchField';
import { Toast } from '../../components/Toast/Toast';
import { useToast } from '../../components/Toast/useToast';
import { markRead, setArchived, useChats } from '../../data/chatStore';
import type { Chat } from '../../data/chats';
import { plural } from '../../data/taskValues';
import { goBack, navigate } from '../../router';
import { useSwipeBack } from '../../utils/swipeBack';
import './ArchivePage.css';

/**
 * «Архивы», как в Telegram: отдельный экран со списком убранных чатов. Строка открывает чат, долгое нажатие возвращает его в список.
 * Экран на новой системе (data-pm), как «События»: фон-сцена позади, стеклянная шапка и «назад», строки без плашки.
 */
export function ArchivePage() {
  const archived = useChats().filter((c) => c.archived);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (searching) field.current?.focus({ preventScroll: true });
  }, [searching]);
  const q = query.trim().toLowerCase();
  const chats = q ? archived.filter((c) => `${c.name} ${c.lastMessage}`.toLowerCase().includes(q)) : archived;
  const closeSearch = () => {
    setQuery('');
    setSearching(false);
  };
  const [menu, setMenu] = useState<{ chat: Chat; rect: DOMRect; row: HTMLElement } | null>(null);
  const [toast, say] = useToast();
  // Свайп вправо — назад, как стрелка в шапке (жест от самого края остаётся)
  useSwipeBack('.archive', menu === null, () => goBack('/'));

  const open = useCallback((chat: Chat) => {
    markRead(chat.id);
    navigate(`/chat/${chat.id}`);
  }, []);
  const openMenu = useCallback((chat: Chat, row: HTMLElement) => setMenu({ chat, rect: row.getBoundingClientRect(), row }), []);

  return (
    <section className="archive">
      <header className="archive__bar">
        {searching ? (
          <>
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Поиск в архиве"
              onClear={() => setQuery('')}
              inputRef={field}
              onKeyDown={(e) => e.key === 'Escape' && closeSearch()}
            />
            <button type="button" className="archive__cancel" onClick={closeSearch}>
              Отмена
            </button>
          </>
        ) : (
          <>
            <div className="archive__who">
              <h1 className="archive__title">Архивы</h1>
              <p className="archive__subtitle">{archived.length > 0 ? `${archived.length} ${plural(archived.length, ['чат', 'чата', 'чатов'])}` : 'Пока пусто'}</p>
            </div>
            <button type="button" className="archive__back" aria-label="Поиск" onClick={() => setSearching(true)}>
              <IconSearchMk />
            </button>
            <button type="button" className="archive__back" aria-label="Назад" onClick={() => goBack('/')}>
              <IconBack />
            </button>
          </>
        )}
      </header>

      {chats.length > 0 ? (
        <ul className="archive__list">
          {chats.map((chat) => (
            <ChatItem key={chat.id} chat={chat} onClick={open} onLongPress={openMenu} />
          ))}
        </ul>
      ) : (
        <div className="archive__empty">
          {archived.length > 0 ? (
            <EmptyState icon={<IconSearchMk />} title="Ничего не найдено" text="Попробуйте другое имя или слово из сообщения." />
          ) : (
            <EmptyState icon={<IconArchive />} title="В архиве пусто" text="Чтобы убрать чат из списка, удерживайте его строку и выберите «В архив»." />
          )}
        </div>
      )}

      {menu && (
        <ChipMenu
          anchor={menu.rect}
          opener={menu.row}
          onClose={() => setMenu(null)}
          items={[
            {
              key: 'unarchive',
              label: 'Вернуть из архива',
              Icon: IconUnarchive,
              run: () => {
                setArchived(menu.chat.id, false);
                say(`«${menu.chat.name}» возвращён из архива`);
              },
            },
          ]}
        />
      )}
      {toast && <Toast text={toast} />}
    </section>
  );
}
