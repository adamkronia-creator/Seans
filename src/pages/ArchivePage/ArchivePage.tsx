import { useCallback, useState } from 'react';
import { ChatItem } from '../../components/ChatItem/ChatItem';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { ChipMenu } from '../../components/FolderMenu/ChipMenu';
import { IconArchive, IconUnarchive } from '../../components/FolderMenu/FolderIcons';
import { IconBack } from '../../components/icons';
import { Toast } from '../../components/Toast/Toast';
import { useToast } from '../../components/Toast/useToast';
import { markRead, setArchived, useChats } from '../../data/chatStore';
import type { Chat } from '../../data/chats';
import { goBack, navigate } from '../../router';
import './ArchivePage.css';

/**
 * «Архив чатов», как в Telegram: отдельный экран со списком убранных чатов. Строка открывает чат, долгое нажатие возвращает его в список.
 * Экран на новой системе (data-pm): цвета, Inter и сетка 4 из токенов.
 */
export function ArchivePage() {
  const chats = useChats().filter((c) => c.archived);
  const [menu, setMenu] = useState<{ chat: Chat; rect: DOMRect; row: HTMLElement } | null>(null);
  const [toast, say] = useToast();

  const open = useCallback((chat: Chat) => {
    markRead(chat.id);
    navigate(`/chat/${chat.id}`);
  }, []);
  const openMenu = useCallback((chat: Chat, row: HTMLElement) => setMenu({ chat, rect: row.getBoundingClientRect(), row }), []);

  return (
    <section className="archive">
      <header className="archive__bar">
        <button type="button" className="archive__back" aria-label="Назад" onClick={() => goBack('/')}>
          <IconBack />
        </button>
        <h1 className="archive__title">Архив чатов</h1>
      </header>

      {chats.length > 0 ? (
        <ul className="archive__list">
          {chats.map((chat) => (
            <ChatItem key={chat.id} chat={chat} onClick={open} onLongPress={openMenu} />
          ))}
        </ul>
      ) : (
        <div className="archive__empty">
          <EmptyState icon={<IconArchive />} title="В архиве пусто" text="Чтобы убрать чат из списка, удерживайте его строку и выберите «В архив»." />
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
