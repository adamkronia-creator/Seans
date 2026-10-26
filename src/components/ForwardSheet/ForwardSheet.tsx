import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useChats } from '../../data/chatStore';
import { guardBack } from '../../router';
import { Badge } from '../Badge/Badge';
import { ChatItem } from '../ChatItem/ChatItem';
import { ChatsHeader } from '../../pages/MessagesPage/ChatsHeader';
import '../../pages/MessagesPage/MessagesPage.css';
import './ForwardSheet.css';

interface ForwardSheetProps {
  /** Чаты, куда переслать, выбраны: кнопка «Отправить» */
  onSend: (chatIds: string[]) => void;
  onClose: () => void;
}

/** «Переслать»: список чатов, как в «Диалогах», с уже открытым поиском и без историй; чаты отмечаются галочкой (можно несколько), внизу «Отправить» */
export function ForwardSheet({ onSend, onClose }: ForwardSheetProps) {
  const all = useChats().filter((c) => !c.archived);
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  // Системная «назад» и Escape закрывают окно, а не уводят с экрана под ним
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const release = guardBack(onClose);
    return () => {
      document.removeEventListener('keydown', onKey);
      release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const q = query.trim().toLowerCase();
  const chats = q ? all.filter((c) => c.name.toLowerCase().includes(q)) : all;
  const favorites = chats.find((c) => c.favorites);
  const others = chats.filter((c) => !c.favorites);
  const toggle = (id: string) => setPicked((now) => (now.includes(id) ? now.filter((x) => x !== id) : [...now, id]));
  return createPortal(
    <div className="fwd-page" data-pm role="dialog" aria-modal="true" aria-label="Переслать">
      <section className="messages fwd-page__in">
        <ChatsHeader searching onSearching={(on) => !on && onClose()} query={query} onQuery={setQuery} placeholder="Кому переслать" heading="Переслать" belt={null} chips={null} />
        <div className="messages__list">
          <ul className="messages__rows">
            {favorites && <ChatItem chat={favorites} onClick={() => toggle(favorites.id)} selected={picked.includes(favorites.id)} />}
            {favorites && others.length > 0 && <li className="messages__divider" role="separator" />}
            {others.map((chat) => (
              <ChatItem key={chat.id} chat={chat} onClick={() => toggle(chat.id)} selected={picked.includes(chat.id)} />
            ))}
          </ul>
          {chats.length === 0 && <p className="fwd-page__empty">Ничего не найдено</p>}
        </div>
        {picked.length > 0 && (
          <div className="fwd-page__bar">
            <button type="button" className="fwd-page__send" onClick={() => onSend(picked)}>
              Отправить
              <Badge count={picked.length} variant="inverse" />
            </button>
          </div>
        )}
      </section>
    </div>,
    document.body,
  );
}
